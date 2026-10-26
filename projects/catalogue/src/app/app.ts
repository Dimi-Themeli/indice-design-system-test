import { Component, ElementRef, afterNextRender, computed, signal, viewChild } from '@angular/core';
import { TOKENS, DesignToken } from 'indice-tokens';
import { Icon } from './icon';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';
import { SocialButtonCatalogue } from './social-buttons';
import { FieldCatalogue } from './fields';
import { Projects } from './projects';
import { Project, loadProjectState, saveProjectState } from './project-data';

@Component({
  imports: [Icon, ButtonCatalogue, IconButtonCatalogue, SocialButtonCatalogue, FieldCatalogue, Projects],
  selector: 'app-root',
  styleUrls: ['./app.css', './sidebar.css', './theme-chooser.css', './project-wizard.css', './welcome.css'],
  templateUrl: './app.html',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)', '[attr.data-role]': 'role()' },
})
export class App {
  readonly categories = [
    { id: 'colours', title: 'Colours', number: '01' },
    { id: 'fonts', title: 'Typography', number: '02' },
    { id: 'space', title: 'Spacing', number: '03' },
    { id: 'border', title: 'Borders', number: '04' },
    { id: 'containers', title: 'Containers', number: '05' },
  ];
  readonly tokens = TOKENS;
  readonly category = signal('colours');
  readonly query = signal('');
  readonly copyMode = signal<'variable' | 'value'>('variable');
  readonly role = signal<'designer' | 'developer'>('developer');
  private readonly savedProjects = loadProjectState();
  readonly projects = signal<Project[]>(this.savedProjects.projects);
  readonly activeProjectId = signal<string | null>(this.savedProjects.activeId);
  readonly currentProject = computed(() => this.projects().find(project => project.id === this.activeProjectId()) ?? null);
  readonly previewProjectId = signal<string | null>(this.savedProjects.activeId);
  readonly selectedProjectPreview = computed(() => this.projects().find(project => project.id === this.previewProjectId()) ?? null);
  readonly view = signal<'library' | 'create' | 'manage'>('library');
  readonly projectError = signal(this.savedProjects.warning);
  readonly pendingDeletion = signal<Project | null>(null);
  private deleteTrigger: HTMLButtonElement | null = null;
  readonly menuOpen = signal(false);
  readonly notice = signal('');
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private readonly welcomeDialog = viewChild.required<ElementRef<HTMLDialogElement>>('welcome');
  readonly isComponent = computed(() => ['buttons', 'icon-buttons', 'social-buttons', 'fields'].includes(this.category()));
  readonly title = computed(() => this.category() === 'buttons' ? 'Buttons' : this.category() === 'icon-buttons' ? 'Icon Buttons' : this.category() === 'social-buttons' ? 'Social Media Buttons' : this.category() === 'fields' ? 'Input Field' : this.query().trim() ? 'Search results' : this.categories.find(item => item.id === this.category())!.title);
  readonly visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    return TOKENS.filter(token => query
      ? `${token.name} ${token.variable} ${token.value} ${token.cssValue}`.toLowerCase().includes(query)
      : token.category === this.category());
  });
  readonly groups = computed(() => {
    const groups = new Map<string, DesignToken[]>();
    for (const token of this.visible()) {
      const group = groups.get(token.group) ?? [];
      group.push(token);
      groups.set(token.group, group);
    }
    return [...groups].map(([name, tokens]) => ({ name, title: name.split('.').slice(1).join(' / ') || name, tokens, category: tokens[0].category }));
  });

  constructor() {
    afterNextRender(() => this.openWelcome());
  }

  openWelcome() {
    const dialog = this.welcomeDialog().nativeElement;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  count(category: string) { return TOKENS.filter(token => token.category === category).length; }

  collapseAll(sidebar: HTMLElement) {
    sidebar.querySelectorAll<HTMLDetailsElement>('details').forEach(section => section.open = false);
  }

  setRole(role: 'designer' | 'developer') {
    this.role.set(role);
    this.menuOpen.set(false);
    if (role === 'developer' && this.view() === 'create') this.view.set('manage');
  }

  openThemeChooser(dialog: HTMLDialogElement) {
    this.menuOpen.set(false);
    this.previewProjectId.set(this.activeProjectId());
    dialog.showModal();
  }

  showProjects(view: 'library' | 'create' | 'manage') {
    if (view === 'create' && this.role() !== 'designer') return;
    this.view.set(view);
    this.menuOpen.set(false);
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }

  selectProjectPreview(id: string) {
    if (this.projects().some(project => project.id === id)) this.previewProjectId.set(id);
  }

  private commitProjects(projects: Project[], activeId: string | null): boolean {
    try {
      saveProjectState(projects, activeId);
      this.projects.set(projects);
      this.activeProjectId.set(activeId);
      this.projectError.set('');
      return true;
    } catch (error) {
      this.projectError.set(error instanceof Error ? error.message : 'Projects could not be saved.');
      return false;
    }
  }

  createProject(project: Project) {
    if (this.role() !== 'designer') return;
    if (!project.name.trim() || !project.tokens || this.projects().some(existing => existing.id === project.id || existing.name.toLowerCase() === project.name.toLowerCase())) {
      this.projectError.set('Use a unique project name and a valid token JSON file.');
      return;
    }
    if (this.commitProjects([...this.projects(), project], project.id)) {
      this.showProjects('manage');
      this.showNotice('Project created');
    }
  }

  activateProject(id: string): boolean {
    if (!this.projects().some(project => project.id === id)) return false;
    if (!this.commitProjects(this.projects(), id)) return false;
    this.previewProjectId.set(id);
    this.showProjects('library');
    return true;
  }

  applyProject(dialog: HTMLDialogElement) {
    const id = this.previewProjectId();
    if (id && this.activateProject(id)) dialog.close();
  }

  requestProjectDeletion(request: { project: Project; trigger: HTMLButtonElement }, dialog: HTMLDialogElement) {
    if (this.role() !== 'designer') return;
    const project = this.projects().find(project => project.id === request.project.id);
    if (!project) return;
    this.pendingDeletion.set(project);
    this.deleteTrigger = request.trigger;
    dialog.showModal();
  }

  confirmProjectDeletion(dialog: HTMLDialogElement) {
    const project = this.pendingDeletion();
    if (!project || this.role() !== 'designer') return;
    const remaining = this.projects().filter(existing => existing.id !== project.id);
    const activeId = this.activeProjectId() === project.id ? remaining[0]?.id ?? null : this.activeProjectId();
    if (!this.commitProjects(remaining, activeId)) return;
    this.previewProjectId.set(activeId);
    dialog.close();
    this.showNotice('Project deleted');
  }

  closeProjectDeletion(fallback: HTMLButtonElement) {
    this.pendingDeletion.set(null);
    (this.deleteTrigger?.isConnected ? this.deleteTrigger : fallback).focus();
    this.deleteTrigger = null;
  }

  onThemeBackdrop(event: MouseEvent) {
    const dialog = event.currentTarget as HTMLDialogElement;
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }

  select(category: string) {
    this.view.set('library');
    this.category.set(category);
    this.query.set('');
    this.menuOpen.set(false);
    window.scrollTo({ top: 0 });
  }

  async copy(token: DesignToken) {
    const value = this.copyMode() === 'variable' ? `var(${token.variable})` : token.cssValue;
    try {
      await navigator.clipboard.writeText(value);
      this.showNotice(`Copied ${value}`);
    } catch {
      this.showNotice('Clipboard unavailable. Select and copy the token text.');
    }
  }

  private showNotice(message: string) {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(''), 3500);
  }
}
