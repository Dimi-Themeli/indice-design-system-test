import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Icon } from './icon';
import { SideDrawer } from './side-drawer';
import { Project, missingComponentTokens, parseTokenFile } from './project-data';
import { REVISION_STATUSES, RevisionState, RevisionStatus, TokenRevision, TokenRevisions } from './token-revisions';

@Component({
  selector: 'app-project-tokens',
  imports: [DatePipe, Icon, SideDrawer],
  templateUrl: './project-tokens.html',
  styleUrls: ['./projects.css', './project-tokens.css', './token-status.css'],
})
export class ProjectTokens {
  readonly project = input.required<Project | null>();
  readonly canEdit = input(false);
  readonly changed = output<Project>();
  readonly currentStatusChanged = output<{ projectId: string; status: RevisionStatus | null }>();
  readonly publish = output<Project>();
  readonly publishing = input(false);
  readonly publishError = input('');
  private readonly service = inject(TokenRevisions);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('file');
  readonly state = signal<RevisionState | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly selected = signal<TokenRevision | null>(null);
  readonly adding = signal(false);
  readonly uploadDirty = computed(() => !!(this.version() || this.note() || this.fileName()) || this.status() !== 'Draft');
  readonly current = computed(() => this.state()?.revisions.find(item => item.id === this.state()?.currentId) ?? null);
  readonly history = computed(() => this.state()?.revisions.filter(item => item.id !== this.state()?.currentId) ?? []);
  readonly statuses = REVISION_STATUSES;
  readonly version = signal('');
  readonly status = signal<RevisionStatus>('Draft');
  readonly note = signal('');
  readonly fileName = signal('');
  readonly document = signal<ReturnType<typeof parseTokenFile> | null>(null);
  readonly reading = signal(false);
  readonly missing = computed(() => this.document() ? missingComponentTokens(this.document()!.tokens) : []);
  private generation = 0;
  private fileRead = 0;

  constructor() {
    effect(() => {
      const project = this.project();
      if (project) this.currentStatusChanged.emit({ projectId: project.id, status: this.current()?.status ?? null });
    });
    inject(DestroyRef).onDestroy(() => { this.generation++; this.fileRead++; });
    effect(() => {
      const project = this.project();
      const generation = ++this.generation;
      this.fileRead++;
      this.state.set(null);
      this.selected.set(null);
      this.adding.set(false);
      this.document.set(null);
      this.fileName.set('');
      this.version.set('');
      this.status.set('Draft');
      this.note.set('');
      this.error.set('');
      this.notice.set('');
      this.reading.set(false);
      this.loading.set(false);
      if (project?.source === 'shared') void this.load(project.id, generation);
    });
  }

  async load(id = this.project()?.id, generation = this.generation) {
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const state = await this.service.load(id);
      if (generation === this.generation) this.state.set(state);
    } catch (error) {
      if (generation === this.generation) this.error.set(error instanceof Error ? error.message : 'Token history could not be loaded.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  async readFile(file: File | null) {
    const read = ++this.fileRead;
    this.document.set(null);
    this.fileName.set('');
    this.error.set('');
    this.reading.set(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 1024 * 1024) {
      this.error.set('Choose a .json token file up to 1 MB.');
      return;
    }
    this.reading.set(true);
    try {
      const source = await file.text();
      if (read !== this.fileRead) return;
      this.document.set(parseTokenFile(source));
      this.fileName.set(file.name);
    } catch (error) {
      if (read === this.fileRead) this.error.set(error instanceof Error ? error.message : 'The token file could not be read.');
    } finally {
      if (read === this.fileRead) this.reading.set(false);
    }
  }

  private async run(action: (project: Project) => Promise<void>) {
    const project = this.project();
    if (!this.canEdit() || !project || project.source !== 'shared' || this.busy() || this.loading()) return;
    const generation = this.generation;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await action(project);
      if (generation === this.generation) await this.load(project.id, generation);
    } catch (error) {
      if (generation === this.generation) this.error.set(error instanceof Error ? error.message : 'The token change could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }

  async upload() {
    const document = this.document();
    if (this.reading()) return;
    if (!document || !this.fileName()) {
      this.error.set('Choose a valid token JSON file before saving a revision.');
      return;
    }
    await this.run(async project => {
      const saved = await this.service.add(project.id, this.version().trim(), this.status(), this.note().trim(), this.fileName(), document.tokens);
      if (this.project()?.id === project.id) {
        this.changed.emit({ ...project, tokens: saved.tokens, tokenFileName: saved.fileName, tokenCount: saved.tokenCount });
        this.document.set(null);
        this.fileName.set('');
        const input = this.fileInput()?.nativeElement;
        if (input) input.value = '';
        this.adding.set(false);
        this.notice.set('New version saved and made current. The previous version is retained in History.');
      }
    });
  }

  closeUpload() {
    this.adding.set(false);
    this.fileRead++;
    this.document.set(null);
    this.fileName.set('');
    this.version.set('');
    this.status.set('Draft');
    this.note.set('');
    this.error.set('');
  }

  onStatusChange(item: TokenRevision, select: HTMLSelectElement) {
    const value = select.value;
    select.value = item.status;
    void this.changeStatus(item, value);
  }

  async changeStatus(item: TokenRevision, value: string) {
    const status = REVISION_STATUSES.find(option => option === value);
    if (!status) { this.error.set('Choose an available revision status.'); return; }
    await this.run(async project => {
      await this.service.setStatus(project.id, item.id, status);
      if (this.project()?.id === project.id) {
        if (this.selected()?.id === item.id) this.selected.set({ ...item, status });
        this.notice.set('Revision status updated.');
      }
    });
  }

  async makeCurrent(item: TokenRevision) {
    await this.run(async project => {
      await this.service.activate(project, item);
      if (this.project()?.id === project.id) {
        this.changed.emit({ ...project, tokens: item.tokens, tokenFileName: item.fileName, tokenCount: item.tokenCount });
        this.selected.set(null);
        this.notice.set('Current token revision updated.');
      }
    });
  }

  download(tokens: Record<string, unknown> | null, fileName: string) {
    if (!tokens) { this.error.set('This project has no token data to download.'); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(tokens, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'tokens.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  json(item: TokenRevision) { return JSON.stringify(item.tokens, null, 2); }
}
