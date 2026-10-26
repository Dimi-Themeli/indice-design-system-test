import { IAM_TOKENS } from './iam-tokens';

export interface Project {
  id: string;
  name: string;
  customer: string;
  description: string;
  modes: string;
  platform: string;
  figmaUrl: string;
  logoDark: string | null;
  logoLight: string | null;
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
export const BASE_PROJECT_ID = 'iam';
export const BASE_PROJECTS: Project[] = [{
  id: BASE_PROJECT_ID, name: 'IAM', customer: '', description: 'The original Indice design system.', modes: 'Light', platform: 'Desktop app', figmaUrl: '',
  logoDark: null, logoLight: null, images: [], tokenFileName: 'tokens-IAM-20261022-01.json', tokens: IAM_TOKENS, tokenCount: 208, createdAt: '', status: 'Base',
}];
const BASE_PROJECT_IDS = new Set(['company-a', 'company-b', 'company-c', 'company-d', ...BASE_PROJECTS.map(project => project.id)]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isUploadedImage(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
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

export function projectCssVariables(tokens: Record<string, unknown> | null): Record<string, string> {
  if (!tokens) return {};
  const values = new Map<string, unknown>();
  function collect(value: unknown, path: string[]) {
    if (!isObject(value)) return;
    if (Object.hasOwn(value, '$value')) {
      values.set(path.join('.'), value['$value']);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (!key.startsWith('$')) collect(child, [...path, key]);
    }
  }
  collect(tokens, []);

  function resolve(value: unknown, seen = new Set<string>()): string | null {
    if (typeof value !== 'string') return null;
    if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) || /^(?:rgb|hsl)a?\(/i.test(value)) return value;
    const reference = /^\{([^{}]+)\}$/.exec(value)?.[1];
    if (!reference || seen.has(reference)) return null;
    seen.add(reference);
    const path = [...values.keys()].find(key => key === reference || key.endsWith(`.${reference}`));
    return path ? resolve(values.get(path), seen) : null;
  }

  const variables: Record<string, string> = {};
  for (const [path, value] of values) {
    const primitivePrefix = 'Primitive/Indice.';
    if (path.startsWith(primitivePrefix)) {
      const name = path.slice(primitivePrefix.length);
      const color = resolve(value);
      if (name.startsWith('colours.') && color) variables[`--indice-${name.replaceAll('.', '-')}`] = color;
      continue;
    }
    const semanticPrefix = 'Semantic/Default - Light Mode.colours.';
    if (path.startsWith(semanticPrefix)) {
      const name = path.slice(semanticPrefix.length);
      const color = resolve(value);
      if (color) variables[`--colours-${name.replaceAll('.', '-')}`] = color;
    }
  }
  return variables;
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
    && (value['logoDark'] === undefined || value['logoDark'] === null || isUploadedImage(value['logoDark']))
    && (value['logoLight'] === undefined || value['logoLight'] === null || isUploadedImage(value['logoLight']))
    && (value['logo'] === undefined || value['logo'] === null || isUploadedImage(value['logo']))
    && Array.isArray(value['images']) && value['images'].every(image => typeof image === 'string' && (/^data:image\/(png|jpeg|webp);base64,/.test(image) || /^assets\/theme-company-[a-d]\.png$/.test(image)))
    && typeof value['tokenCount'] === 'number' && Number.isSafeInteger(value['tokenCount']) && value['tokenCount'] >= 0
    && (value['tokens'] === null || isObject(value['tokens']));
}

export function loadProjectState(storage?: Pick<Storage, 'getItem'>): ProjectState {
  const fallback = () => ({ projects: structuredClone(BASE_PROJECTS), activeId: BASE_PROJECT_ID, warning: '' });
  try {
    const source = (storage ?? localStorage).getItem(PROJECT_STORAGE_KEY);
    if (!source) return fallback();
    const parsed: unknown = JSON.parse(source);
    if (!isObject(parsed) || parsed['version'] !== 1 || !Array.isArray(parsed['projects']) || !parsed['projects'].every(isProject)) throw new Error('Invalid project data');
    const uploaded = (parsed['projects'] as Project[]).filter(project => project.status === 'Draft' && !BASE_PROJECT_IDS.has(project.id)).map(project => {
      const { logo, ...savedProject } = project as Project & { logo?: string | null };
      return { ...savedProject, logoDark: project.logoDark ?? null, logoLight: project.logoLight ?? logo ?? null };
    });
    const projects = [...structuredClone(BASE_PROJECTS), ...uploaded];
    if (new Set(projects.map(project => project.id)).size !== projects.length) throw new Error('Duplicate project identifiers');
    return { projects, activeId: projects.some(project => project.id === parsed['activeId']) ? String(parsed['activeId']) : BASE_PROJECT_ID, warning: '' };
  } catch {
    return { ...fallback(), warning: 'Saved projects could not be loaded. Only the IAM project is shown.' };
  }
}

export function saveProjectState(projects: Project[], activeId: string | null, storage?: Pick<Storage, 'setItem'>) {
  const uploaded = projects.filter(project => !BASE_PROJECT_IDS.has(project.id));
  try { (storage ?? localStorage).setItem(PROJECT_STORAGE_KEY, JSON.stringify({ version: 1, projects: uploaded, activeId })); }
  catch { throw new Error('Projects could not be saved in this browser. Free storage space or remove reference images, then try again.'); }
}