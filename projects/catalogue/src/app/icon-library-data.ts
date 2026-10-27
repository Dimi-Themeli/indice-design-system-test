export const DEFAULT_ICON_LIBRARY = 'lucide';
export const ICON_LIBRARIES = [
  { id: 'lucide', name: 'Lucide', description: 'Consistent outline icons, bundled locally. Open to preview the starter collection.', url: 'https://lucide.dev', license: 'ISC' },
  { id: 'tabler', name: 'Tabler Icons', description: 'Clean outline icons on a 24px grid. Open to preview the starter collection.', url: 'https://tabler.io/icons', license: 'MIT' },
  { id: 'bootstrap', name: 'Bootstrap Icons', description: 'Versatile icons on a 16px grid. Open to preview the starter collection.', url: 'https://icons.getbootstrap.com', license: 'MIT' },
] as const;
export const STARTER_ICON_NAMES = ['search', 'check', 'plus', 'arrow-left', 'heart', 'star'] as const;
