import { Injectable } from '@angular/core';
import { Project, parseTokenFile } from './project-data';
import { SHARED_IAM_ID, SupabaseProjects } from './supabase-projects';

export const REVISION_STATUSES = ['Draft', 'In review', 'Ready', 'Deprecated'] as const;
export type RevisionStatus = typeof REVISION_STATUSES[number];
export interface TokenRevision {
  id: string;
  version: string;
  status: RevisionStatus;
  changeNote: string;
  fileName: string;
  tokens: Record<string, unknown>;
  tokenCount: number;
  createdAt: string;
}
export interface RevisionState { currentId: string; revisions: TokenRevision[]; }
const projectId = (id: string) => id === 'iam' ? SHARED_IAM_ID : id;

function revision(value: unknown): TokenRevision {
  if (!value || typeof value !== 'object') throw new Error('Invalid token revision returned by Supabase.');
  const row = value as Record<string, unknown>;
  const status = REVISION_STATUSES.find(item => item === row['status']);
  if (!status || ['id', 'version', 'change_note', 'token_file_name', 'created_at'].some(key => typeof row[key] !== 'string')
    || !row['tokens'] || typeof row['tokens'] !== 'object' || Array.isArray(row['tokens'])
    || typeof row['token_count'] !== 'number' || !Number.isSafeInteger(row['token_count']) || row['token_count'] < 1) {
    throw new Error('Invalid token revision returned by Supabase.');
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(row['version'])) || !String(row['token_file_name']).trim()
    || Number.isNaN(Date.parse(String(row['created_at'])))) throw new Error('Invalid token revision returned by Supabase.');
  return {
    id: String(row['id']), version: String(row['version']), status, changeNote: String(row['change_note']),
    fileName: String(row['token_file_name']), createdAt: String(row['created_at']),
    tokens: row['tokens'] as Record<string, unknown>, tokenCount: row['token_count'],
  };
}

@Injectable({ providedIn: 'root' })
export class TokenRevisions {
  constructor(private readonly projects: SupabaseProjects) {}

  private client() {
    return this.projects.getClient();
  }

  async loadCurrentStatus(id: string): Promise<RevisionStatus> {
    const client = await this.client();
    const project = await client.from('projects').select('token_revision_id').eq('id', projectId(id)).single();
    if (project.error) throw new Error(`Current token status could not be loaded: ${project.error.message}`);
    const currentId: unknown = project.data?.token_revision_id;
    if (typeof currentId !== 'string') throw new Error('Current token status is unavailable. Run the updated Supabase setup.');
    const current = await client.from('token_revisions').select('status').eq('project_id', projectId(id)).eq('id', currentId).single();
    if (current.error) throw new Error(`Current token status could not be loaded: ${current.error.message}`);
    const status = REVISION_STATUSES.find(status => status === current.data?.status);
    if (!status) throw new Error('The current token revision has an invalid status.');
    return status;
  }

  async load(id: string): Promise<RevisionState> {
    const client = await this.client();
    const [project, history] = await Promise.all([
      client.from('projects').select('token_revision_id').eq('id', projectId(id)).single(),
      client.from('token_revisions').select('*').eq('project_id', projectId(id)).order('created_at', { ascending: false }),
    ]);
    if (project.error || history.error) throw new Error(`Token history could not be loaded. Run the updated Supabase setup if needed. ${project.error?.message ?? history.error?.message}`);
    const currentId: unknown = project.data?.token_revision_id;
    if (typeof currentId !== 'string' || !Array.isArray(history.data)) throw new Error('The project has no initialized token history. Run the updated Supabase setup.');
    const revisions = history.data.map(revision);
    if (!revisions.some(item => item.id === currentId)) throw new Error('The current token revision could not be found.');
    return { currentId, revisions };
  }

  async add(id: string, version: string, status: RevisionStatus, changeNote: string, fileName: string, tokens: Record<string, unknown>) {
    if (!/^\d+\.\d+\.\d+$/.test(version) || version.length > 40 || !REVISION_STATUSES.includes(status) || changeNote.length > 1000) {
      throw new Error('Enter a version such as 1.1.0, an available status and a change note of up to 1000 characters.');
    }
    const source = JSON.stringify(tokens);
    if (!fileName.toLowerCase().endsWith('.json') || fileName.length > 255 || new Blob([source]).size > 1024 * 1024) {
      throw new Error('Choose a .json token file up to 1 MB with a filename of at most 255 characters.');
    }
    const parsed = parseTokenFile(source);
    const client = await this.client();
    const { data, error } = await client.from('token_revisions').insert({
      project_id: projectId(id), version, status, change_note: changeNote,
      token_file_name: fileName, tokens: parsed.tokens, token_count: parsed.count,
    }).select('*').single();
    if (error) throw new Error(`The token revision could not be saved: ${error.message}`);
    const saved = revision(data);
    const { data: current, error: currentError } = await client.from('projects').select('token_revision_id').eq('id', projectId(id)).single();
    if (currentError || current?.token_revision_id !== saved.id) {
      throw new Error(`Revision v${saved.version} was saved, but automatic activation was not confirmed. Refresh history and use Make current if needed. Run the updated Supabase setup. ${currentError?.message ?? ''}`);
    }
    return saved;
  }

  async setStatus(id: string, revisionId: string, status: RevisionStatus) {
    if (!REVISION_STATUSES.includes(status)) throw new Error('Choose an available revision status.');
    const client = await this.client();
    const { error } = await client.from('token_revisions').update({ status }).eq('project_id', projectId(id)).eq('id', revisionId).select('id').single();
    if (error) throw new Error(`Revision status could not be saved: ${error.message}`);
  }

  async activate(project: Project, selected: TokenRevision): Promise<void> {
    const client = await this.client();
    const { error } = await client.from('projects').update({
      token_revision_id: selected.id, tokens: selected.tokens,
      token_file_name: selected.fileName, token_count: selected.tokenCount,
    }).eq('id', projectId(project.id)).select('id').single();
    if (error) throw new Error(`The current token revision could not be changed: ${error.message}`);
  }
}
