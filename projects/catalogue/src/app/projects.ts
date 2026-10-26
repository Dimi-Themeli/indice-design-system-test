import { Component, computed, effect, input, output, signal } from '@angular/core';
import { Icon } from './icon';
import { Project, PROJECT_MODES, PROJECT_PLATFORMS, parseTokenFile, validFigmaUrl } from './project-data';

type AssetKey = 'dark' | 'light' | 'thumbnail';
interface ProjectDraft { name: string; customer: string; description: string; figmaUrl: string; modes: string; platform: string; }

@Component({
  selector: 'app-projects',
  imports: [Icon],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  readonly page = input<'create' | 'edit' | 'manage'>('manage');
  readonly projects = input<Project[]>([]);
  readonly editing = input<Project | null>(null);
  readonly canEdit = input(false);
  readonly activeId = input<string | null>(null);
  readonly error = input('');
  readonly create = output<Project>();
  readonly save = output<Project>();
  readonly edit = output<string>();
  readonly open = output<string>();
  readonly remove = output<{ project: Project; trigger: HTMLButtonElement }>();
  readonly navigate = output<'create' | 'library' | 'manage'>();
  readonly exportData = output<void>();
  readonly modes = PROJECT_MODES;
  readonly platforms = PROJECT_PLATFORMS;
  readonly draft = signal<ProjectDraft>({ name: '', customer: '', description: '', figmaUrl: '', modes: 'Light', platform: 'Desktop app' });
  readonly query = signal('');
  readonly matches = computed(() => this.projects().filter(project => `${project.name} ${project.customer}`.toLowerCase().includes(this.query().trim().toLowerCase())));
  readonly tokenFileName = signal('');
  readonly tokenDocument = signal<ReturnType<typeof parseTokenFile> | null>(null);
  readonly tokenError = signal('');
  readonly formError = signal('');
  readonly logos = signal<Record<AssetKey, string | null>>({ dark: null, light: null, thumbnail: null });
  readonly logoErrors = signal<Record<AssetKey, string>>({ dark: '', light: '', thumbnail: '' });
  readonly readingLogos = signal<Record<AssetKey, boolean>>({ dark: false, light: false, thumbnail: false });
  readonly images = signal<string[]>([]);
  readonly imageError = signal('');
  readonly readingTokens = signal(false);
  readonly readingImages = signal(false);
  readonly readingAssets = computed(() => Object.values(this.readingLogos()).some(Boolean));
  private tokenRead = 0;
  private logoRead: Record<AssetKey, number> = { dark: 0, light: 0, thumbnail: 0 };
  private imageRead = 0;

  constructor() {
    effect(() => {
      this.page();
      const project = this.page() === 'edit' ? this.editing() : null;
      this.tokenRead++;
      this.logoRead.dark++;
      this.logoRead.light++;
      this.logoRead.thumbnail++;
      this.imageRead++;
      this.draft.set(project
        ? { name: project.name, customer: project.customer, description: project.description, figmaUrl: project.figmaUrl, modes: project.modes, platform: project.platform }
        : { name: '', customer: '', description: '', figmaUrl: '', modes: 'Light', platform: 'Desktop app' });
      this.tokenFileName.set(project?.tokenFileName ?? '');
      this.tokenDocument.set(project?.tokens ? { tokens: project.tokens, count: project.tokenCount } : null);
      this.tokenError.set('');
      this.formError.set('');
      this.logos.set({ dark: project?.logoDark ?? null, light: project?.logoLight ?? null, thumbnail: project?.thumbnail ?? null });
      this.logoErrors.set({ dark: '', light: '', thumbnail: '' });
      this.readingLogos.set({ dark: false, light: false, thumbnail: false });
      this.images.set(project ? [...project.images] : []);
      this.imageError.set('');
      this.readingTokens.set(false);
      this.readingImages.set(false);
    });
  }

  update(key: keyof ProjectDraft, value: string) {
    this.draft.update(draft => ({ ...draft, [key]: value }));
    this.formError.set('');
  }

  async selectTokenFile(file: File | null) {
    const version = ++this.tokenRead;
    const original = this.page() === 'edit' ? this.editing() : null;
    this.tokenDocument.set(!file && original?.tokens ? { tokens: original.tokens, count: original.tokenCount } : null);
    this.tokenFileName.set(file?.name ?? original?.tokenFileName ?? '');
    this.tokenError.set('');
    this.formError.set('');
    this.readingTokens.set(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 1024 * 1024) {
      this.tokenError.set('Choose a .json token file smaller than 1 MB.');
      return;
    }
    this.readingTokens.set(true);
    try {
      const source = await file.text();
      if (version !== this.tokenRead) return;
      this.tokenDocument.set(parseTokenFile(source));
    } catch (error) {
      if (version === this.tokenRead) this.tokenError.set(error instanceof Error ? error.message : 'The token file could not be read.');
    } finally {
      if (version === this.tokenRead) this.readingTokens.set(false);
    }
  }

  async selectLogoFile(theme: AssetKey, file: File | null) {
    const version = ++this.logoRead[theme];
    this.logos.update(logos => ({ ...logos, [theme]: null }));
    this.logoErrors.update(errors => ({ ...errors, [theme]: '' }));
    this.formError.set('');
    this.readingLogos.update(reading => ({ ...reading, [theme]: false }));
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024 || file.size === 0) {
      this.logoErrors.update(errors => ({ ...errors, [theme]: theme === 'thumbnail' ? 'Choose one PNG, JPEG or WebP image smaller than 1 MB.' : 'Choose one PNG, JPEG or WebP logo smaller than 1 MB.' }));
      return;
    }
    this.readingLogos.update(reading => ({ ...reading, [theme]: true }));
    try {
      const logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('The logo could not be read.'));
        reader.readAsDataURL(file);
      });
      if (version === this.logoRead[theme]) this.logos.update(logos => ({ ...logos, [theme]: logo }));
    } catch (error) {
      if (version === this.logoRead[theme]) this.logoErrors.update(errors => ({ ...errors, [theme]: error instanceof Error ? error.message : 'The logo could not be read.' }));
    } finally {
      if (version === this.logoRead[theme]) this.readingLogos.update(reading => ({ ...reading, [theme]: false }));
    }
  }

  clearLogo(theme: AssetKey) {
    this.logoRead[theme]++;
    this.logos.update(logos => ({ ...logos, [theme]: null }));
    this.logoErrors.update(errors => ({ ...errors, [theme]: '' }));
    this.readingLogos.update(reading => ({ ...reading, [theme]: false }));
  }

  async selectImages(files: FileList | null) {
    const version = ++this.imageRead;
    this.imageError.set('');
    this.images.set([]);
    this.readingImages.set(false);
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length > 3 || selected.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024)) {
      this.imageError.set('Choose up to 3 PNG, JPEG or WebP images, each smaller than 1 MB.');
      return;
    }
    this.readingImages.set(true);
    try {
      const images = await Promise.all(selected.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('A reference image could not be read.'));
        reader.readAsDataURL(file);
      })));
      if (version === this.imageRead) this.images.set(images);
    } catch (error) {
      if (version === this.imageRead) this.imageError.set(error instanceof Error ? error.message : 'Images could not be read.');
    } finally {
      if (version === this.imageRead) this.readingImages.set(false);
    }
  }

  clearImages() {
    this.imageRead++;
    this.images.set([]);
    this.imageError.set('');
    this.readingImages.set(false);
  }

  submit() {
    if (!this.canEdit() || this.readingTokens() || this.readingAssets() || this.readingImages()) return;
    const editing = this.page() === 'edit' ? this.editing() : null;
    if (this.page() === 'edit' && !editing) return;
    const draft = this.draft();
    const name = draft.name.trim();
    const document = this.tokenDocument();
    if (!name || name.length > 80) { this.formError.set('Enter a project name of 1 to 80 characters.'); return; }
    if (this.projects().some(project => project.id !== editing?.id && project.name.toLowerCase() === name.toLowerCase())) { this.formError.set('A project with this name already exists.'); return; }
    if (!document) { this.formError.set('Choose a valid token JSON file.'); return; }
    if (!validFigmaUrl(draft.figmaUrl)) { this.formError.set('Use an HTTPS Figma link, or leave the link empty.'); return; }
    if (this.logoErrors().dark || this.logoErrors().light || this.logoErrors().thumbnail) { this.formError.set('Remove or replace the invalid logo or thumbnail image.'); return; }
    if (this.imageError()) { this.formError.set('Remove or replace the invalid reference images.'); return; }
    this.formError.set('');
    const fields = { name, customer: draft.customer.trim(), description: draft.description.trim(), figmaUrl: draft.figmaUrl.trim(), logoDark: this.logos().dark, logoLight: this.logos().light, thumbnail: this.logos().thumbnail, modes: draft.modes, platform: draft.platform, images: this.images(), tokenFileName: this.tokenFileName(), tokens: document.tokens, tokenCount: document.count };
    if (editing) this.save.emit({ ...editing, ...fields });
    else this.create.emit({ id: crypto.randomUUID(), ...fields, createdAt: new Date().toISOString(), status: 'Draft' });
  }
}