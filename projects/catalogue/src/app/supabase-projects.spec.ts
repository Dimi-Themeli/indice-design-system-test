import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseProjects } from './supabase-projects';
import { Project } from './project-data';
import { SUPABASE_PROJECTS_BUCKET } from './supabase.config';

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

describe('Supabase shared editing', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const key = `${id}/logo-light-22222222-2222-4222-8222-222222222222.png`;
  const reference = `${id}/reference-1-33333333-3333-4333-8333-333333333333.png`;
  const publicUrl = (assetKey: string) => `https://example.test/${assetKey}`;
  const original = {
    id, name: 'Evpulse', customer: '', description: '', modes: 'Light', platform: 'Desktop app',
    figma_url: '', logo_dark_key: null, logo_light_key: key, thumbnail_key: null,
    image_keys: [reference], icon_library_id: 'lucide', token_file_name: 'tokens.json',
    tokens: { 'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#0089e8' } } } } } },
    token_count: 1, created_at: '2026-10-29T10:00:00Z',
  };
  let service: SupabaseProjects;
  let project: Project;
  let client: ReturnType<typeof mockClient>;
  let updateQuery: ReturnType<typeof query>;
  let readQuery: ReturnType<typeof query>;

  function query(data: unknown, error: { message: string } | null = null) {
    return {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
    };
  }

  function mockClient() {
    const bucket = {
      getPublicUrl: vi.fn((assetKey: string) => ({ data: { publicUrl: publicUrl(assetKey) } })),
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    };
    return { from: vi.fn(), storage: { from: vi.fn(() => bucket) }, bucket };
  }

  beforeEach(() => {
    service = new SupabaseProjects();
    client = mockClient();
    sdk.createClient.mockReturnValue(client);
    readQuery = query(structuredClone(original));
    updateQuery = query({ ...original, name: 'Updated Evpulse' });
    client.from.mockReturnValueOnce(readQuery).mockReturnValueOnce(updateQuery);
    project = {
      id, name: 'Updated Evpulse', customer: '', description: '', modes: 'Light', platform: 'Desktop app',
      figmaUrl: '', logoDark: null, logoLight: publicUrl(key), thumbnail: null,
      images: [publicUrl(reference)], iconLibraryId: 'lucide',
      tokenFileName: 'tokens.json', tokens: original.tokens, tokenCount: 1,
      createdAt: original.created_at, source: 'shared', status: 'Draft',
    };
  });

  afterEach(() => vi.unstubAllGlobals());

  it('updates the existing row and retains remote images without uploading or changing identity', async () => {
    const result = await service.update(project);
    expect(updateQuery.eq).toHaveBeenCalledWith('id', id);
    expect(updateQuery.single).toHaveBeenCalledOnce();
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Updated Evpulse', logo_light_key: key, image_keys: [reference], tokens: project.tokens,
    }));
    const changes = updateQuery.update.mock.calls[0][0];
    expect(changes).not.toHaveProperty('id');
    expect(changes).not.toHaveProperty('created_at');
    expect(client.bucket.upload).not.toHaveBeenCalled();
    expect(client.bucket.remove).not.toHaveBeenCalled();
    expect(result.project).toMatchObject({ id, source: 'shared', name: 'Updated Evpulse', createdAt: original.created_at });
    expect(result.warning).toBeNull();
  });

  it('uploads replacement images and only removes old assets after a confirmed update', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['image'], { type: 'image/png' }))));
    updateQuery.single.mockImplementation(async () => {
      expect(client.bucket.remove).not.toHaveBeenCalled();
      const changes = updateQuery.update.mock.calls[0][0];
      return { data: { ...original, ...changes }, error: null };
    });
    const result = await service.update({ ...project, logoLight: 'data:image/png;base64,AA==', images: [] });
    const newKey = client.bucket.upload.mock.calls[0][0];
    expect(newKey).toMatch(new RegExp(`^${id}/logo-light-.*\\.png$`));
    expect(client.storage.from).toHaveBeenCalledWith(SUPABASE_PROJECTS_BUCKET);
    expect(client.bucket.remove).toHaveBeenCalledWith([key, reference]);
    expect(result.project.logoLight).toBe(publicUrl(newKey));
    expect(result.project.images).toEqual([]);
  });

  it('reports database denial or zero-row responses instead of claiming success', async () => {
    updateQuery.single.mockResolvedValue({ data: null, error: { message: 'No matching row or permission denied' } });
    await expect(service.update(project)).rejects.toThrow('No matching row or permission denied');
    expect(client.bucket.remove).not.toHaveBeenCalled();
  });

  it('cleans new uploads after a failed save without deleting existing images', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['image'], { type: 'image/png' }))));
    updateQuery.single.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    await expect(service.update({ ...project, logoLight: 'data:image/png;base64,AA==' })).rejects.toThrow('Permission denied');
    const newKey = client.bucket.upload.mock.calls[0][0];
    expect(client.bucket.remove).toHaveBeenCalledExactlyOnceWith([newKey]);
  });

  it('surfaces cleanup failures after a failed save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['image'], { type: 'image/png' }))));
    updateQuery.single.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    client.bucket.remove.mockResolvedValue({ error: { message: 'Cleanup denied' } });
    await expect(service.update({ ...project, logoLight: 'data:image/png;base64,AA==' }))
      .rejects.toThrow('Newly uploaded images could not be removed: Cleanup denied');
  });

  it('returns a warning, not a save failure, when obsolete-image cleanup fails', async () => {
    updateQuery.single.mockResolvedValue({ data: { ...original, logo_light_key: null }, error: null });
    client.bucket.remove.mockResolvedValue({ error: { message: 'Storage denied' } });
    const result = await service.update({ ...project, logoLight: null });
    expect(result.project.logoLight).toBeNull();
    expect(result.warning).toContain('project was saved');
    expect(result.warning).toContain('Storage denied');
  });

  it('rejects arbitrary image URLs and invalid token data before writing', async () => {
    await expect(service.update({ ...project, logoLight: 'https://unrelated.test/image.png' })).rejects.toThrow('Only PNG');
    expect(updateQuery.update).not.toHaveBeenCalled();
    client.from.mockClear();
    await expect(service.update({ ...project, tokens: null })).rejects.toThrow('valid token JSON');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('reports missing projects and failed uploads without attempting a database update', async () => {
    readQuery.single.mockResolvedValueOnce({ data: null, error: { message: 'Project not found' } });
    await expect(service.update(project)).rejects.toThrow('Project not found');
    expect(updateQuery.update).not.toHaveBeenCalled();
    client.from.mockReset().mockReturnValue(readQuery);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['image'], { type: 'image/png' }))));
    client.bucket.upload.mockResolvedValue({ error: { message: 'Upload denied' } });
    await expect(service.update({ ...project, logoLight: 'data:image/png;base64,AA==' })).rejects.toThrow('Upload denied');
    expect(updateQuery.update).not.toHaveBeenCalled();
  });
});
