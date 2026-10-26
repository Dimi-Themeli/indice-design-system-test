import { Component, computed, effect, input, output, signal } from '@angular/core';
import { Icon } from './icon';
import { Project, PROJECT_MODES, PROJECT_PLATFORMS, parseTokenFile, validFigmaUrl } from './project-data';

interface ProjectDraft { name: string; customer: string; description: string; figmaUrl: string; modes: string; platform: string; }

@Component({
  selector: 'app-projects',
  imports: [Icon],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  readonly page = input<'create' | 'manage'>('manage');
  readonly projects = input<Project[]>([]);
  readonly canEdit = input(false);
  readonly activeId = input<string | null>(null);
  readonly error = input('');
  readonly create = output<Project>();
  readonly open = output<string>();
  readonly remove = output<{ project: Project; trigger: HTMLButtonElement }>();
  readonly navigate = output<'create' | 'library'>();
  readonly modes = PROJECT_MODES;
  readonly platforms = PROJECT_PLATFORMS;
  readonly draft = signal<ProjectDraft>({ name: '', customer: '', description: '', figmaUrl: '', modes: 'Light', platform: 'Desktop app' });
  readonly query = signal('');
  readonly matches = computed(() => this.projects().filter(project => `${project.name} ${project.customer}`.toLowerCase().includes(this.query().trim().toLowerCase())));
  readonly tokenFileName = signal('');
  readonly tokenDocument = signal<ReturnType<typeof parseTokenFile> | null>(null);
  readonly tokenError = signal('');
  readonly formError = signal('');
  readonly logo = signal<string | null>(null);
  readonly logoError = signal('');
  readonly readingLogo = signal(false);
  readonly images = signal<string[]>([]);
  readonly imageError = signal('');
  readonly readingTokens = signal(false);
  readonly readingImages = signal(false);
  private tokenRead = 0;
  private logoRead = 0;
  private imageRead = 0;

  constructor() {
    effect(() => {
      this.page();
      this.tokenRead++;
      this.logoRead++;
      this.imageRead++;
      this.draft.set({ name: '', customer: '', description: '', figmaUrl: '', modes: 'Light', platform: 'Desktop app' });
      this.tokenFileName.set('');
      this.tokenDocument.set(null);
      this.tokenError.set('');
      this.formError.set('');
      this.logo.set(null);
      this.logoError.set('');
      this.readingLogo.set(false);
      this.images.set([]);
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
    this.tokenDocument.set(null);
    this.tokenFileName.set(file?.name ?? '');
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

  async selectLogoFile(file: File | null) {
    const version = ++this.logoRead;
    this.logo.set(null);
    this.logoError.set('');
    this.formError.set('');
    this.readingLogo.set(false);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024 || file.size === 0) {
      this.logoError.set('Choose one PNG, JPEG or WebP logo smaller than 1 MB.');
      return;
    }
    this.readingLogo.set(true);
    try {
      const logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('The logo could not be read.'));
        reader.readAsDataURL(file);
      });
      if (version === this.logoRead) this.logo.set(logo);
    } catch (error) {
      if (version === this.logoRead) this.logoError.set(error instanceof Error ? error.message : 'The logo could not be read.');
    } finally {
      if (version === this.logoRead) this.readingLogo.set(false);
    }
  }

  clearLogo() {
    this.logoRead++;
    this.logo.set(null);
    this.logoError.set('');
    this.readingLogo.set(false);
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
    if (!this.canEdit() || this.readingTokens() || this.readingLogo() || this.readingImages()) return;
    const draft = this.draft();
    const name = draft.name.trim();
    const document = this.tokenDocument();
    if (!name || name.length > 80) { this.formError.set('Enter a project name of 1 to 80 characters.'); return; }
    if (this.projects().some(project => project.name.toLowerCase() === name.toLowerCase())) { this.formError.set('A project with this name already exists.'); return; }
    if (!document) { this.formError.set('Choose a valid token JSON file.'); return; }
    if (!validFigmaUrl(draft.figmaUrl)) { this.formError.set('Use an HTTPS Figma link, or leave the link empty.'); return; }
    if (this.logoError()) { this.formError.set('Remove or replace the invalid logo.'); return; }
    if (this.imageError()) { this.formError.set('Remove or replace the invalid reference images.'); return; }
    this.formError.set('');
    this.create.emit({ id: crypto.randomUUID(), name, customer: draft.customer.trim(), description: draft.description.trim(), figmaUrl: draft.figmaUrl.trim(), logo: this.logo(), modes: draft.modes, platform: draft.platform, images: this.images(), tokenFileName: this.tokenFileName(), tokens: document.tokens, tokenCount: document.count, createdAt: new Date().toISOString(), status: 'Draft' });
  }
}