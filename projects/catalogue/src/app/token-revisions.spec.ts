import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenRevisions } from './token-revisions';
import { BASE_PROJECTS } from './project-data';
import { SHARED_IAM_ID, SupabaseProjects } from './supabase-projects';

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

describe('Token revision persistence', () => {
  const row = {
    id: 'revision', project_id: SHARED_IAM_ID, version: '1.0.0', status: 'Ready', change_note: 'Initial',
    token_file_name: 'tokens.json', tokens: { brand: { $value: '#123456' } }, token_count: 1,
    created_at: '2026-10-29T10:00:00Z',
  };
  let service: TokenRevisions;
  let project: ReturnType<typeof query>;
  let history: ReturnType<typeof query>;
  function query() {
    return {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: SHARED_IAM_ID, token_revision_id: row.id }, error: null }),
      order: vi.fn().mockResolvedValue({ data: [row], error: null }),
    };
  }
  beforeEach(() => {
    service = new TokenRevisions(new SupabaseProjects());
    project = query();
    history = query();
    sdk.createClient.mockReturnValue({ from: vi.fn((name: string) => name === 'projects' ? project : history) });
  });

  it('loads the shared IAM pointer and saved revisions using its database UUID', async () => {
    const state = await service.load('iam');
    expect(project.eq).toHaveBeenCalledWith('id', SHARED_IAM_ID);
    expect(history.eq).toHaveBeenCalledWith('project_id', SHARED_IAM_ID);
    expect(state.currentId).toBe(row.id);
    expect(state.revisions[0]).toMatchObject({ version: '1.0.0', fileName: 'tokens.json', tokens: row.tokens, status: 'Ready' });
  });

  it('inserts a snapshot and confirms that the database made it current', async () => {
    history.single.mockResolvedValueOnce({ data: row, error: null });
    const saved = await service.add('iam', '1.1.0', 'Draft', 'Changed', 'new.json', row.tokens);
    expect(saved.id).toBe(row.id);
    expect(history.insert).toHaveBeenCalledWith({
      project_id: SHARED_IAM_ID, version: '1.1.0', status: 'Draft', change_note: 'Changed',
      token_file_name: 'new.json', tokens: row.tokens, token_count: 1,
    });

    expect(project.update).not.toHaveBeenCalled();
  });

  it('loads only the current revision status for the sidebar using the shared project ID', async () => {
    history.single.mockResolvedValueOnce({ data: { status: 'In review' }, error: null });
    expect(await service.loadCurrentStatus('iam')).toBe('In review');
    expect(history.select).toHaveBeenCalledWith('status');
    expect(history.eq).toHaveBeenCalledWith('project_id', SHARED_IAM_ID);
    expect(history.eq).toHaveBeenCalledWith('id', row.id);
    history.single.mockResolvedValueOnce({ data: { status: 'Unknown' }, error: null });
    await expect(service.loadCurrentStatus('iam')).rejects.toThrow('invalid status');
    project.single.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
    await expect(service.loadCurrentStatus('iam')).rejects.toThrow('Unavailable');
  });

  it('updates readiness only and checks that a revision actually matched', async () => {
    await service.setStatus('iam', row.id, 'In review');
    expect(history.update).toHaveBeenCalledExactlyOnceWith({ status: 'In review' });
    expect(history.eq).toHaveBeenCalledWith('project_id', SHARED_IAM_ID);
    expect(history.eq).toHaveBeenCalledWith('id', row.id);
    expect(history.single).toHaveBeenCalledOnce();
  });

  it('atomically changes the pointer and active tokens and verifies a matching project', async () => {
    const selected = (await service.load('iam')).revisions[0];
    await service.activate(BASE_PROJECTS[0], selected);
    expect(project.update).toHaveBeenCalledWith({
      token_revision_id: row.id, tokens: row.tokens, token_file_name: row.token_file_name, token_count: row.token_count,
    });
    expect(project.eq).toHaveBeenCalledWith('id', SHARED_IAM_ID);
    expect(project.single).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid versions and reports duplicate-version errors', async () => {
    await expect(service.add('iam', 'next', 'Draft', '', 'new.json', row.tokens)).rejects.toThrow('version such as');
    expect(history.insert).not.toHaveBeenCalled();
    history.single.mockResolvedValueOnce({ data: null, error: { message: 'Duplicate version' } });
    await expect(service.add('iam', '1.0.0', 'Draft', '', 'new.json', row.tokens)).rejects.toThrow('Duplicate version');
  });

  it('reports uninitialized history, migration failures and invalid stored revisions', async () => {
    history.order.mockResolvedValueOnce({ data: null, error: { message: 'Relation missing' } });
    await expect(service.load('iam')).rejects.toThrow('Run the updated Supabase setup');
    project.single.mockResolvedValueOnce({ data: { token_revision_id: null }, error: null });
    await expect(service.load('iam')).rejects.toThrow('no initialized token history');
    history.order.mockResolvedValueOnce({ data: [{ ...row, status: 'Unknown' }], error: null });
    await expect(service.load('iam')).rejects.toThrow('Invalid token revision');
  });

  it('does not report successful status updates or activation when RLS matches no row', async () => {
    history.single.mockResolvedValueOnce({ data: null, error: { message: 'No matching row' } });
    await expect(service.setStatus('iam', row.id, 'Ready')).rejects.toThrow('No matching row');
    const selected = (await service.load('iam')).revisions[0];
    project.single.mockResolvedValueOnce({ data: null, error: { message: 'No matching row' } });
    await expect(service.activate(BASE_PROJECTS[0], selected)).rejects.toThrow('No matching row');
  });

  it('reports an outdated activation trigger rather than claiming the new version is current', async () => {
    history.single.mockResolvedValueOnce({ data: row, error: null });
    project.single.mockResolvedValueOnce({ data: { token_revision_id: 'older' }, error: null });
    await expect(service.add('iam', '1.1.0', 'Draft', '', 'new.json', row.tokens)).rejects.toThrow('automatic activation was not confirmed');
  });
});
