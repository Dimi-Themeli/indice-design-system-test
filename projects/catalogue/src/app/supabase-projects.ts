import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ICON_LIBRARIES } from './icon-library-data';
import { Project, PROJECT_MODES, PROJECT_PLATFORMS, validFigmaUrl } from './project-data';
import { SUPABASE_PROJECTS_BUCKET, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase.config';

interface ProjectInsert {
  id: string;
  name: string;
  customer: string;
  description: string;
  modes: string;
  platform: string;
  figma_url: string;
  logo_dark_key: string | null;
  logo_light_key: string | null;
  thumbnail_key: string | null;
  icon_library_id: string;
  image_keys: string[];
  token_file_name: string;
  tokens: Record<string, unknown>;
  token_count: number;
}

interface ProjectAssets {
  logo_dark_key: string | null;
  logo_light_key: string | null;
  thumbnail_key: string | null;
  image_keys: string[];
}

function projectRow(project: Project, assets: ProjectAssets): ProjectInsert {
  if (!project.tokens || !project.tokenFileName.trim() || !Number.isSafeInteger(project.tokenCount) || project.tokenCount < 1) {
    throw new Error('Choose a valid token JSON file containing at least one token value before saving.');
  }
  return {
    id: project.id, name: project.name, customer: project.customer, description: project.description,
    modes: project.modes, platform: project.platform, figma_url: project.figmaUrl,
    ...assets, icon_library_id: project.iconLibraryId ?? 'lucide',
    token_file_name: project.tokenFileName, tokens: project.tokens, token_count: project.tokenCount,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`The shared project has invalid ${key} data.`);
  return value;
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`The shared project has invalid ${key} data.`);
  return value;
}

function isAssetKey(value: unknown, projectId: string): value is string {
  return typeof value === 'string'
    && new RegExp(`^${projectId}/[a-z0-9-]+-[0-9a-f-]{36}\\.(png|jpg|webp)$`, 'i').test(value);
}

@Injectable({ providedIn: 'root' })
export class SupabaseProjects {
  private clientPromise?: Promise<SupabaseClient>;

  async list(): Promise<Project[]> {
    const client = await this.getClient();
    const { data, error } = await client.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`Shared projects could not be loaded: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Supabase returned an invalid shared-project list.');
    return data.map(row => this.mapProject(row, client));
  }

  async publish(project: Project): Promise<Project> {
    if (!project.tokens || !project.tokenFileName.trim() || !Number.isSafeInteger(project.tokenCount) || project.tokenCount < 1) {
      throw new Error('Choose a valid token JSON file containing at least one token value before publishing.');
    }
    const client = await this.getClient();
    const [logoDarkKey, logoLightKey, thumbnailKey, imageKeys] = await Promise.all([
      this.uploadAsset(client, project.id, 'logo-dark', project.logoDark),
      this.uploadAsset(client, project.id, 'logo-light', project.logoLight),
      this.uploadAsset(client, project.id, 'thumbnail', project.thumbnail ?? null),
      Promise.all(project.images.map((image, index) => this.uploadAsset(client, project.id, `reference-${index + 1}`, image))),
    ]);

    const row = projectRow(project, {
      logo_dark_key: logoDarkKey,
      logo_light_key: logoLightKey,
      thumbnail_key: thumbnailKey,
      image_keys: imageKeys.filter((key): key is string => key !== null),
    });

    const { data, error } = await client.from('projects').insert(row).select('*').single();
    if (error) throw new Error(`The project could not be published: ${error.message}`);
    return this.mapProject(data, client);
  }

  async update(project: Project): Promise<{ project: Project; warning: string | null }> {
    projectRow(project, { logo_dark_key: null, logo_light_key: null, thumbnail_key: null, image_keys: [] });
    const client = await this.getClient();
    const { data: existing, error: readError } = await client.from('projects').select('*').eq('id', project.id).single();
    if (readError) throw new Error(`The public project could not be loaded for editing: ${readError.message}`);
    const original = this.mapProject(existing, client);
    const record: unknown = existing;
    if (!isRecord(record) || !Array.isArray(record['image_keys'])) throw new Error('The public project has invalid image data.');
    const originalKeys = [
      record['logo_dark_key'], record['logo_light_key'], record['thumbnail_key'], ...record['image_keys'],
    ].filter((key): key is string => isAssetKey(key, original.id));
    const urls = new Map(originalKeys.map(key => [
      client.storage.from(SUPABASE_PROJECTS_BUCKET).getPublicUrl(key).data.publicUrl, key,
    ]));
    const uploaded: string[] = [];
    const asset = async (label: string, value: string | null): Promise<string | null> => {
      if (value === null) return null;
      const retained = urls.get(value);
      if (retained) return retained;
      const key = await this.uploadAsset(client, original.id, label, value);
      if (key) uploaded.push(key);
      return key;
    };
    let row: ProjectInsert;
    let savedRow: unknown;
    try {
      const logoDark = await asset('logo-dark', project.logoDark);
      const logoLight = await asset('logo-light', project.logoLight);
      const thumbnail = await asset('thumbnail', project.thumbnail ?? null);
      const images: string[] = [];
      for (const [index, image] of project.images.entries()) {
        const key = await asset(`reference-${index + 1}`, image);
        if (key) images.push(key);
      }
      row = projectRow(project, {
        logo_dark_key: logoDark, logo_light_key: logoLight, thumbnail_key: thumbnail, image_keys: images,
      });
      const { id, ...changes } = row;
      const { data, error } = await client.from('projects').update(changes).eq('id', id).select('*').single();
      if (error) throw new Error(`The public project could not be saved: ${error.message}`);
      savedRow = data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The public project could not be saved.';
      if (uploaded.length) {
        const { error: cleanupError } = await client.storage.from(SUPABASE_PROJECTS_BUCKET).remove(uploaded);
        if (cleanupError) throw new Error(`${message} Newly uploaded images could not be removed: ${cleanupError.message}`);
      }
      throw new Error(message);
    }
    const saved = this.mapProject(savedRow, client);
    const retained = new Set([row.logo_dark_key, row.logo_light_key, row.thumbnail_key, ...row.image_keys]);
    const removed = originalKeys.filter(key => !retained.has(key));
    if (!removed.length) return { project: saved, warning: null };
    const { error: cleanupError } = await client.storage.from(SUPABASE_PROJECTS_BUCKET).remove(removed);
    return {
      project: saved,
      warning: cleanupError ? `The project was saved, but old images could not be removed: ${cleanupError.message}` : null,
    };
  }

  async delete(projectId: string): Promise<string | null> {
    const client = await this.getClient();
    const { data: project, error: readError } = await client
      .from('projects')
      .select('logo_dark_key, logo_light_key, thumbnail_key, image_keys')
      .eq('id', projectId)
      .single();
    if (readError) throw new Error(`The public project could not be loaded for deletion: ${readError.message}`);
    if (!project || !Array.isArray(project.image_keys)) throw new Error('The public project has invalid image data and could not be deleted.');

    const { error: deleteError } = await client.from('projects').delete().eq('id', projectId);
    if (deleteError) throw new Error(`The public project could not be deleted: ${deleteError.message}`);

    const assets = project as ProjectAssets;
    const keys = [assets.logo_dark_key, assets.logo_light_key, assets.thumbnail_key, ...assets.image_keys]
      .filter((key): key is string => key !== null);
    if (!keys.length) return null;

    const { error: storageError } = await client.storage.from(SUPABASE_PROJECTS_BUCKET).remove(keys);
    return storageError
      ? `The project was deleted, but some uploaded images could not be removed: ${storageError.message}`
      : null;
  }

  private async getClient(): Promise<SupabaseClient> {
    this.clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY));
    return this.clientPromise;
  }

  private async uploadAsset(client: SupabaseClient, projectId: string, label: string, dataUrl: string | null): Promise<string | null> {
    if (dataUrl === null) return null;
    const match = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.exec(dataUrl);
    if (!match) throw new Error('Only PNG, JPEG, or WebP project images can be published.');

    let blob: Blob;
    try {
      blob = await (await fetch(dataUrl)).blob();
    } catch {
      throw new Error('A project image could not be prepared for upload.');
    }
    if (blob.size === 0 || blob.size > 1024 * 1024) throw new Error('Each project image must be smaller than 1 MB.');

    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const key = `${projectId}/${label}-${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(SUPABASE_PROJECTS_BUCKET).upload(key, blob, {
      contentType: blob.type,
      upsert: false,
    });
    if (error) throw new Error(`A project image could not be uploaded: ${error.message}`);
    return key;
  }

  private mapProject(value: unknown, client: SupabaseClient): Project {
    if (!isRecord(value)) throw new Error('Supabase returned an invalid shared project.');
    const id = requiredString(value, 'id');
    const imageKeys = value['image_keys'];
    const tokens = value['tokens'];
    const tokenCount = value['token_count'];
    const iconLibraryId = requiredString(value, 'icon_library_id');
    const modes = requiredString(value, 'modes');
    const platform = requiredString(value, 'platform');
    const figmaUrl = requiredString(value, 'figma_url');
    const createdAt = requiredString(value, 'created_at');
    const logoDarkKey = optionalString(value, 'logo_dark_key');
    const logoLightKey = optionalString(value, 'logo_light_key');
    const thumbnailKey = optionalString(value, 'thumbnail_key');

    if (!/^[0-9a-f-]{36}$/i.test(id)
      || !Array.isArray(imageKeys)
      || imageKeys.length > 3
      || !imageKeys.every((key): key is string => isAssetKey(key, id))
      || (logoDarkKey !== null && !isAssetKey(logoDarkKey, id))
      || (logoLightKey !== null && !isAssetKey(logoLightKey, id))
      || (thumbnailKey !== null && !isAssetKey(thumbnailKey, id))
      || !isRecord(tokens)
      || typeof tokenCount !== 'number'
      || !Number.isSafeInteger(tokenCount)
      || tokenCount < 0
      || !ICON_LIBRARIES.some(library => library.id === iconLibraryId)
      || !PROJECT_MODES.some(mode => mode === modes)
      || !PROJECT_PLATFORMS.some(item => item === platform)
      || !validFigmaUrl(figmaUrl)
      || Number.isNaN(Date.parse(createdAt))) {
      throw new Error('Supabase returned invalid data for a shared project.');
    }

    const publicUrl = (key: string) => client.storage.from(SUPABASE_PROJECTS_BUCKET).getPublicUrl(key).data.publicUrl;
    const optionalPublicUrl = (key: string | null) => key ? publicUrl(key) : null;

    return {
      id,
      name: requiredString(value, 'name'),
      customer: requiredString(value, 'customer'),
      description: requiredString(value, 'description'),
      modes,
      platform,
      figmaUrl,
      logoDark: optionalPublicUrl(logoDarkKey),
      logoLight: optionalPublicUrl(logoLightKey),
      thumbnail: optionalPublicUrl(thumbnailKey),
      iconLibraryId,
      images: imageKeys.map(key => publicUrl(key)),
      tokenFileName: requiredString(value, 'token_file_name'),
      tokens,
      tokenCount,
      createdAt,
      status: 'Draft',
      source: 'shared',
    };
  }
}
