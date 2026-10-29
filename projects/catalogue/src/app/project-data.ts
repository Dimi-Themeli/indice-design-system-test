import { DesignToken } from 'indice-tokens';
import { IAM_TOKENS } from './iam-tokens';
import { ICON_LIBRARIES } from './icon-library-data';

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
  thumbnail?: string | null;
  iconLibraryId?: string;
  images: string[];
  tokenFileName: string;
  tokens: Record<string, unknown> | null;
  tokenCount: number;
  createdAt: string;
  status: 'Base' | 'Sample' | 'Draft';
  source?: 'shared';
}

export interface ProjectState { projects: Project[]; activeId: string | null; warning: string; storedIds: string[]; requestedActiveId: string | null; removedDemoIds: string[]; }
export const DEMO_DATA_URL = 'demo-projects.json';
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

const FONT_WEIGHTS: Record<string, string> = {
  thin: '100', extralight: '200', ultralight: '200', light: '300', regular: '400', normal: '400', book: '400',
  medium: '500', semibold: '600', demibold: '600', bold: '700', extrabold: '800', ultrabold: '800', black: '900', heavy: '900'
};

function fontWeight(value: string | null): string | null {
  if (!value) return null;
  if (/^[1-9]00$/.test(value)) return value;
  return FONT_WEIGHTS[value.toLowerCase().replace(/[\s_-]/g, '')] ?? null;
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

  function resolveText(value: unknown, seen = new Set<string>()): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const reference = /^\{([^{}]+)\}$/.exec(value)?.[1];
    if (!reference) return value.trim();
    if (seen.has(reference)) return null;
    seen.add(reference);
    const path = [...values.keys()].find(key => key === reference || key.endsWith(`.${reference}`));
    return path ? resolveText(values.get(path), seen) : null;
  }

  const fontFamily = (value: unknown) => {
    const name = resolveText(value)?.replace(/["'\\;{}<>]/g, '').trim();
    return name ? `'${name}'` : null;
  };

  const variables: Record<string, string> = {};
  for (const [path, value] of values) {
    const primitivePrefix = 'Primitive/Indice.';
    if (path.startsWith(primitivePrefix)) {
      const name = path.slice(primitivePrefix.length);
      const color = resolve(value);
      if (name.startsWith('colours.') && color) variables[`--indice-${name.replaceAll('.', '-')}`] = color;
      const family = name.startsWith('fonts.family.') ? fontFamily(value) : null;
      if (family) variables[`--indice-${name.replaceAll('.', '-')}`] = family;
      continue;
    }
    const semanticFontPrefix = 'Semantic/Default - Light Mode.font.';
    if (path.startsWith(semanticFontPrefix)) {
      const name = path.slice(semanticFontPrefix.length);
      if (name.startsWith('family.')) {
        const family = fontFamily(value);
        if (family) variables[`--font-${name.replaceAll('.', '-')}`] = family;
      } else if (name.startsWith('weight.')) {
        const weight = fontWeight(resolveText(value));
        if (weight) variables[`--font-${name.replaceAll('.', '-')}`] = weight;
      }
      continue;
    }
    const semanticPrefix = 'Semantic/Default - Light Mode.colours.';
    if (path.startsWith(semanticPrefix)) {
      const name = path.slice(semanticPrefix.length);
      const color = resolve(value);
      if (color) variables[`--colours-${name.replaceAll('.', '-')}`] = color;
    }
  }
  addTokenSynonyms(variables);
  return variables;
}

// Figma files name the same role differently (e.g. border.element-primary-active vs -default), so each name also fills its equivalents.
const TOKEN_SYNONYMS: [RegExp, (match: RegExpMatchArray) => string[]][] = [
  [/^--colours-(.+)-default$/, m => [`--colours-${m[1]}-active`]],
  [/^--colours-(.+)-active$/, m => [`--colours-${m[1]}-default`]],
  [/^--colours-(text|border|icons|surface)-error$/, m => [`--colours-${m[1]}-element-error-default`]],
  [/^--colours-(text|border|icons|surface)-element-error-default$/, m => [`--colours-${m[1]}-error`]],
];

function addTokenSynonyms(variables: Record<string, string>) {
  for (const [name, value] of Object.entries(variables)) {
    for (const [pattern, synonyms] of TOKEN_SYNONYMS) {
      const match = name.match(pattern);
      if (!match) continue;
      for (const synonym of synonyms(match)) variables[synonym] ??= value;
    }
  }
}

export const COMPONENT_COLOUR_TOKENS = [
  'text-element-primary-default', 'text-element-primary-hover', 'text-element-primary-pressed',
  'icons-element-primary-default', 'icons-element-primary-hover', 'icons-element-primary-pressed',
  'surface-element-primary-default', 'surface-element-primary-hover', 'surface-element-primary-pressed',
  'border-element-primary-active', 'border-element-primary-hover', 'border-element-primary-pressed',
  'text-element-secondary-default', 'text-element-secondary-hover', 'text-element-secondary-pressed',
  'icons-element-secondary-default', 'icons-element-secondary-hover', 'icons-element-secondary-pressed',
  'surface-element-secondary-default', 'surface-element-secondary-hover', 'surface-element-secondary-pressed',
  'text-error', 'text-element-error-hover', 'text-element-error-pressed',
  'icons-element-error-default', 'icons-element-error-hover', 'icons-element-error-pressed',
  'border-error', 'border-element-error-hover', 'border-element-error-pressed',
  'text-on-filled-button', 'text-on-filled-button-black', 'icons-on-filled-button', 'icons-on-filled-button-black',
  'text-on-button-disabled', 'icons-disabled', 'surface-element-disabled-reverse', 'border-default',
  'text-label', 'text-title', 'text-field-active', 'text-field-idle', 'text-white-only', 'icons-default',
  'surface-field', 'surface-page', 'surface-card', 'border-grey-only',
] as const;

/** Semantic colour roles the components need that the token file does not define (after name equivalents). */
export function missingComponentTokens(tokens: Record<string, unknown> | null): string[] {
  const variables = projectCssVariables(tokens);
  return COMPONENT_COLOUR_TOKENS.filter(name => !variables[`--colours-${name}`]).map(name => `colours.${name.replace('-', '.')}`);
}

const COLOUR_GROUP_ORDER: Record<string, readonly string[]> = {
  colours: ['main', 'functions'],
  'colours.main': ['global', 'primary', 'secondary', 'neutral', 'accent'],
  'colours.functions': ['success', 'warning', 'info', 'magic', 'error'],
};
const COLOUR_NAME_ORDER = new Intl.Collator('en', { numeric: true });

export function projectTokenList(tokens: Record<string, unknown> | null): DesignToken[] {
  const collection = tokens?.['Primitive/Indice'];
  if (!isObject(collection)) return [];
  const list: DesignToken[] = [];
  function visit(node: Record<string, unknown>, segments: string[]) {
    if (Object.hasOwn(node, '$value')) {
      const value = node['$value'];
      if (typeof value !== 'string' && typeof value !== 'number') return;
      const type = String(node['$type'] ?? '');
      let cssValue = String(value);
      if (type === 'number') cssValue = `${value}px`;
      if (segments[0] === 'fonts' && segments[1] === 'weight') cssValue = fontWeight(String(value)) ?? String(value);
      if (segments[0] === 'fonts' && segments[1] === 'family') cssValue = `"${value}"`;
      list.push({ name: segments.join('.'), variable: `--indice-${segments.join('-')}`, category: segments[0], group: segments.slice(0, -1).join('.'), label: segments.at(-1) ?? '', value, cssValue, type });
      return;
    }
    const entries = Object.entries(node);
    if (segments[0] === 'colours') {
      const order = COLOUR_GROUP_ORDER[segments.join('.')] ?? [];
      const rank = (name: string) => {
        const index = order.indexOf(name);
        return index < 0 ? order.length : index;
      };
      // JSON object order can change when token data is stored in Supabase JSONB.
      entries.sort(([a], [b]) => rank(a) - rank(b) || COLOUR_NAME_ORDER.compare(a, b));
    }
    for (const [key, child] of entries) {
      if (!key.startsWith('$') && key !== '-' && isObject(child)) visit(child, [...segments, key]);
    }
  }
  visit(collection, []);
  return list.filter(token => token.category && token.group);
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
    && (value['thumbnail'] === undefined || value['thumbnail'] === null || isUploadedImage(value['thumbnail']))
    && (value['iconLibraryId'] === undefined || ICON_LIBRARIES.some(library => library.id === value['iconLibraryId']))
    && (value['logo'] === undefined || value['logo'] === null || isUploadedImage(value['logo']))
    && Array.isArray(value['images']) && value['images'].every(image => typeof image === 'string' && (/^data:image\/(png|jpeg|webp);base64,/.test(image) || /^assets\/theme-company-[a-d]\.png$/.test(image)))
    && typeof value['tokenCount'] === 'number' && Number.isSafeInteger(value['tokenCount']) && value['tokenCount'] >= 0
    && (value['tokens'] === null || isObject(value['tokens']));
}

export function loadProjectState(storage?: Pick<Storage, 'getItem'>): ProjectState {
  const fallback = () => ({ projects: structuredClone(BASE_PROJECTS), activeId: BASE_PROJECT_ID, warning: '', storedIds: [] as string[], requestedActiveId: null, removedDemoIds: [] as string[] });
  try {
    const source = (storage ?? localStorage).getItem(PROJECT_STORAGE_KEY);
    if (!source) return fallback();
    const parsed: unknown = JSON.parse(source);
    if (!isObject(parsed) || parsed['version'] !== 1 || !Array.isArray(parsed['projects']) || !parsed['projects'].every(isProject)) throw new Error('Invalid project data');
    const stored = parsed['projects'] as Project[];
    const uploaded = stored.filter(project => project.status === 'Draft' && !BASE_PROJECT_IDS.has(project.id)).map(project => {
      const { logo, ...savedProject } = project as Project & { logo?: string | null };
      return { ...savedProject, logoDark: project.logoDark ?? null, logoLight: project.logoLight ?? logo ?? null };
    });
    const base = BASE_PROJECTS.map(project => {
      const edited = stored.find(saved => saved.id === project.id && saved.status === 'Base');
      return edited ? { ...structuredClone(project), ...edited, logoDark: edited.logoDark ?? null, logoLight: edited.logoLight ?? null } : structuredClone(project);
    });
    const projects = [...base, ...uploaded];
    if (new Set(projects.map(project => project.id)).size !== projects.length) throw new Error('Duplicate project identifiers');
    const requestedActiveId = typeof parsed['activeId'] === 'string' ? parsed['activeId'] : null;
    const removedDemoIds = Array.isArray(parsed['removedDemoIds']) ? parsed['removedDemoIds'].filter((id): id is string => typeof id === 'string') : [];
    return { projects, activeId: projects.some(project => project.id === requestedActiveId) ? requestedActiveId : BASE_PROJECT_ID, warning: '', storedIds: stored.map(project => project.id), requestedActiveId, removedDemoIds };
  } catch {
    return { ...fallback(), warning: 'Saved projects could not be loaded. Only the IAM project is shown.' };
  }
}

function changedProjects(projects: Project[], reference: Project[]): Project[] {
  return projects.filter(project => {
    if (project.source === 'shared') return false;
    const original = reference.find(item => item.id === project.id) ?? BASE_PROJECTS.find(item => item.id === project.id);
    return original ? JSON.stringify(project) !== JSON.stringify(original) : !BASE_PROJECT_IDS.has(project.id);
  });
}

export function saveProjectState(projects: Project[], activeId: string | null, storage?: Pick<Storage, 'setItem'>, demoProjects: Project[] = [], removedDemoIds: string[] = []) {
  const uploaded = changedProjects(projects, demoProjects);
  try { (storage ?? localStorage).setItem(PROJECT_STORAGE_KEY, JSON.stringify({ version: 1, projects: uploaded, activeId, ...(removedDemoIds.length ? { removedDemoIds } : {}) })); }
  catch { throw new Error('Projects could not be saved in this browser. Free storage space or remove reference images, then try again.'); }
}
export function parseDemoData(source: unknown): Project[] {
  if (!isObject(source) || source['version'] !== 1 || !Array.isArray(source['projects'])) return [];
  return source['projects'].filter(isProject).filter(project => !BASE_PROJECT_IDS.has(project.id) || BASE_PROJECTS.some(base => base.id === project.id && project.status === 'Base'))
    .map(project => ({ ...project, logoDark: project.logoDark ?? null, logoLight: project.logoLight ?? null, thumbnail: project.thumbnail ?? null }));
}

export function mergeDemoProjects(current: Project[], demo: Project[], storedIds: string[], removedDemoIds: string[]): Project[] {
  const skip = new Set([...storedIds, ...removedDemoIds]);
  const merged = [...current];
  for (const project of demo) {
    if (skip.has(project.id)) continue;
    const index = merged.findIndex(existing => existing.id === project.id);
    if (index >= 0) {
      if (merged[index].source !== 'shared') merged[index] = { ...merged[index], ...project, status: merged[index].status };
    }
    else if (!merged.some(existing => existing.name.toLowerCase() === project.name.toLowerCase())) merged.push(project);
  }
  return merged;
}