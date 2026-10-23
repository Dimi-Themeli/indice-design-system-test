export interface Project {
  id: string;
  name: string;
  customer: string;
  description: string;
  modes: string;
  platform: string;
  figmaUrl: string;
  images: string[];
  tokenFileName: string;
  tokens: Record<string, unknown> | null;
  tokenCount: number;
  createdAt: string;
  status: 'Base' | 'Sample' | 'Draft';
}

export interface ProjectState { projects: Project[]; activeId: string | null; warning: string; }
export const PROJECT_STORAGE_KEY = 'indice-demo-projects-v1';
export const PROJECT_MODES = ['Light', 'Dark', 'Light & dark'] as const;
export const PROJECT_PLATFORMS = ['Desktop app', 'Mobile app', 'Desktop & mobile'] as const;
export const BASE_PROJECTS: Project[] = [
  { id: 'company-a', name: 'Company A', modes: 'Light', platform: 'Desktop app', status: 'Base' },
  { id: 'company-b', name: 'Company B / Workspace', modes: 'Light & dark', platform: 'Desktop app', status: 'Sample' },
  { id: 'company-c', name: 'Company C / Pocket', modes: 'Light', platform: 'Mobile app', status: 'Sample' },
  { id: 'company-d', name: 'Company D / Console', modes: 'Dark', platform: 'Desktop & mobile', status: 'Sample' },
].map(project => ({ ...project, status: project.status as Project['status'], customer: '', description: '', figmaUrl: '', images: [`assets/theme-${project.id}.png`], tokenFileName: '', tokens: null, tokenCount: 0, createdAt: '' }));

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseTokenFile(source: string): { tokens: Record<string, unknown>; count: number } {
  let parsed: unknown;
  try { parsed = JSON.parse(source); }
  catch { throw new Error('The token file is not valid JSON.'); }
  if (!isObject(parsed)) throw new Error('The token file must contain a JSON object.');
  let count = 0;
  function visit(value: unknown, depth: number) {
    if (depth > 32) throw new Error('The token file has too many nested levels.');
    if (isObject(value)) {
      if (Object.hasOwn(value, '$value') || Object.hasOwn(value, 'value')) { count++; return; }
      for (const [key, child] of Object.entries(value)) {
        if (!key.startsWith('$') && !['__proto__', 'constructor', 'prototype'].includes(key)) visit(child, depth + 1);
      }
    } else if (Array.isArray(value)) {
      value.forEach(child => visit(child, depth + 1));
    } else if (value !== null) count++;
  }
  visit(parsed, 0);
  if (!count) throw new Error('The token file contains no token values.');
  return { tokens: parsed, count };
}

export function validFigmaUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'figma.com' || url.hostname.endsWith('.figma.com'));
  } catch { return false; }
}

function isProject(value: unknown): value is Project {
  if (!isObject(value)) return false;
  return ['id', 'name', 'customer', 'description', 'modes', 'platform', 'figmaUrl', 'tokenFileName', 'createdAt'].every(key => typeof value[key] === 'string')
    && !!value['id'] && typeof value['name'] === 'string' && !!value['name'].trim()
    && ['Base', 'Sample', 'Draft'].includes(String(value['status']))
    && PROJECT_MODES.some(mode => mode === value['modes']) && PROJECT_PLATFORMS.some(platform => platform === value['platform'])
    && validFigmaUrl(String(value['figmaUrl']))
    && Array.isArray(value['images']) && value['images'].every(image => typeof image === 'string' && (/^data:image\/(png|jpeg|webp);base64,/.test(image) || /^assets\/theme-company-[a-d]\.png$/.test(image)))
    && typeof value['tokenCount'] === 'number' && Number.isSafeInteger(value['tokenCount']) && value['tokenCount'] >= 0
    && (value['tokens'] === null || isObject(value['tokens']));
}

export function loadProjectState(storage?: Pick<Storage, 'getItem'>): ProjectState {
  const fallback = () => ({ projects: structuredClone(BASE_PROJECTS), activeId: 'company-a', warning: '' });
  try {
    const source = (storage ?? localStorage).getItem(PROJECT_STORAGE_KEY);
    if (!source) return fallback();
    const parsed: unknown = JSON.parse(source);
    if (!isObject(parsed) || parsed['version'] !== 1 || !Array.isArray(parsed['projects']) || !parsed['projects'].every(isProject)) throw new Error('Invalid project data');
    const projects = parsed['projects'];
    if (new Set(projects.map(project => project.id)).size !== projects.length) throw new Error('Duplicate project identifiers');
    return { projects, activeId: projects.some(project => project.id === parsed['activeId']) ? String(parsed['activeId']) : projects[0]?.id ?? null, warning: '' };
  } catch {
    return { ...fallback(), warning: 'Saved projects could not be loaded. Base examples are shown instead.' };
  }
}

export function saveProjectState(projects: Project[], activeId: string | null, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? localStorage).setItem(PROJECT_STORAGE_KEY, JSON.stringify({ version: 1, projects, activeId })); }
  catch { throw new Error('Projects could not be saved in this browser. Free storage space or remove reference images, then try again.'); }
}