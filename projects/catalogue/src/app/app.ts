import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { TOKENS, DesignToken } from 'indice-tokens';
import { Icon } from './icon';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';
import { SocialButtonCatalogue } from './social-buttons';
import { FieldCatalogue } from './fields';
import { Projects } from './projects';
import { IconLibraries } from './icon-libraries';
import { BASE_PROJECT_ID, DEMO_DATA_URL, Project, loadProjectState, mergeDemoProjects, parseDemoData, projectCssVariables, projectTokenList, saveProjectState } from './project-data';
import { IAM_TOKENS } from './iam-tokens';
import { SupabaseProjects } from './supabase-projects';

// The workspace chrome always uses the IAM palette; project palettes only theme the component previews.
const APP_THEME = projectCssVariables(IAM_TOKENS);

@Component({
  imports: [Icon, ButtonCatalogue, IconButtonCatalogue, SocialButtonCatalogue, FieldCatalogue, Projects, IconLibraries],
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
  readonly category = signal('colours');
  readonly query = signal('');
  readonly copyMode = signal<'variable' | 'value'>('variable');
  readonly role = signal<'designer' | 'developer'>('developer');
  private readonly savedProjects = loadProjectState();
  readonly projects = signal<Project[]>(this.savedProjects.projects);
  private demoProjects: Project[] = [];
  private removedDemoIds = [...this.savedProjects.removedDemoIds];
  readonly activeProjectId = signal<string | null>(this.savedProjects.activeId);
  readonly currentProject = computed(() => this.projects().find(project => project.id === this.activeProjectId()) ?? null);
  readonly projectTheme = computed(() => projectCssVariables(this.currentProject()?.tokens ?? null));
  readonly tokens = computed<readonly DesignToken[]>(() => {
    const list = projectTokenList(this.currentProject()?.tokens ?? null);
    return list.length ? list : TOKENS;
  });
  readonly welcomeStep = signal<1 | 2>(1);
  readonly previewProjectId = signal<string | null>(this.savedProjects.activeId);
  readonly selectedProjectPreview = computed(() => this.projects().find(project => project.id === this.previewProjectId()) ?? null);
  readonly view = signal<'library' | 'create' | 'edit' | 'manage' | 'icon-libraries'>('library');
  readonly editingProjectId = signal<string | null>(null);
  readonly editingProject = computed(() => this.projects().find(project => project.id === this.editingProjectId()) ?? null);
  readonly projectError = signal(this.savedProjects.warning);
  readonly cloudError = signal('');
  readonly projectSaving = signal(false);
  private readonly sharedProjects = inject(SupabaseProjects);
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
    return this.tokens().filter(token => query
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
    for (const [name, value] of Object.entries(APP_THEME)) document.documentElement.style.setProperty(name, value);
    afterNextRender(() => this.openWelcome());
    void this.loadDemoProjects();
    void this.loadSharedProjects();
  }

  async loadSharedProjects() {
    try {
      const shared = await this.sharedProjects.list();
      const projects = this.projects().filter(project => project.source !== 'shared');
      for (const project of shared) {
        const index = projects.findIndex(existing => existing.id === project.id);
        if (index >= 0) projects[index] = project;
        else projects.push(project);
      }
      this.projects.set(projects);
      const requestedId = this.savedProjects.requestedActiveId;
      if (requestedId && this.activeProjectId() === this.savedProjects.activeId && projects.some(project => project.id === requestedId)) {
        this.activeProjectId.set(requestedId);
        this.previewProjectId.set(requestedId);
      }
      this.cloudError.set('');
    } catch (error) {
      this.cloudError.set(error instanceof Error ? error.message : 'Shared projects could not be loaded.');
    }
  }

  async loadDemoProjects() {
    try {
      const response = await fetch(DEMO_DATA_URL, { cache: 'no-cache' });
      if (!response.ok) return;
      this.applyDemoProjects(parseDemoData(await response.json()));
    } catch { /* The demo file is optional. */ }
  }

  applyDemoProjects(demo: Project[]) {
    this.demoProjects = demo;
    if (!demo.length) return;
    this.projects.set(mergeDemoProjects(this.projects(), demo, this.savedProjects.storedIds, this.removedDemoIds));
    const requested = this.savedProjects.requestedActiveId;
    if (requested && this.activeProjectId() === this.savedProjects.activeId && this.projects().some(project => project.id === requested)) {
      this.activeProjectId.set(requested);
      this.previewProjectId.set(requested);
    }
  }

  openWelcome() {
    this.welcomeStep.set(1);
    const dialog = this.welcomeDialog().nativeElement;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  chooseRole(role: 'designer' | 'developer') {
    this.setRole(role);
    this.previewProjectId.set(this.activeProjectId() ?? this.projects()[0]?.id ?? null);
    this.welcomeStep.set(2);
    setTimeout(() => document.getElementById('welcome-title')?.focus());
  }

  backToRoleStep() {
    this.welcomeStep.set(1);
    setTimeout(() => document.getElementById('welcome-title')?.focus());
  }

  selectProject(select: HTMLSelectElement) {
    const id = select.value;
    if (!this.projects().some(project => project.id === id) || !this.commitProjects(this.projects(), id)) {
      select.value = this.activeProjectId() ?? '';
      return;
    }
    this.previewProjectId.set(id);
  }

  count(category: string) { return this.tokens().filter(token => token.category === category).length; }

  collapseAll(sidebar: HTMLElement) {
    sidebar.querySelectorAll<HTMLDetailsElement>('details').forEach(section => section.open = false);
  }

  setRole(role: 'designer' | 'developer') {
    this.role.set(role);
    this.menuOpen.set(false);
    if (role === 'developer' && (this.view() === 'create' || this.view() === 'edit')) this.view.set('manage');
  }

  showProjects(view: 'library' | 'create' | 'manage' | 'icon-libraries') {
    this.editingProjectId.set(null);
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
      const localProjects = projects.filter(project => project.source !== 'shared');
      saveProjectState(localProjects, activeId, undefined, this.demoProjects, this.removedDemoIds);
      this.projects.set(projects);
      this.activeProjectId.set(activeId);
      this.projectError.set('');
      return true;
    } catch (error) {
      this.projectError.set(error instanceof Error ? error.message : 'Projects could not be saved.');
      return false;
    }
  }

  async createProject(project: Project) {
    if (!project.name.trim() || !project.tokens || !project.tokenFileName.trim() || !Number.isSafeInteger(project.tokenCount) || project.tokenCount < 1
      || this.projects().some(existing => existing.id === project.id || existing.name.toLowerCase() === project.name.toLowerCase())) {
      this.projectError.set('Use a unique project name and choose a valid token JSON file containing at least one token value.');
      return;
    }
    this.projectSaving.set(true);
    this.projectError.set('');
    try {
      const published = await this.sharedProjects.publish(project);
      if (published.source === 'shared') {
        const projects = [...this.projects().filter(existing => existing.id !== published.id), published];
        this.projects.set(projects);
        this.activeProjectId.set(published.id);
        this.commitProjects(projects, published.id);
        this.cloudError.set('');
        this.showProjects('manage');
        this.showNotice('Project published publicly');
      } else if (this.commitProjects([...this.projects(), published], published.id)) {
        this.showProjects('manage');
        this.showNotice('Project created');
      }
    } catch (error) {
      this.projectError.set(error instanceof Error ? error.message : 'The project could not be published.');
    } finally {
      this.projectSaving.set(false);
    }
  }

  async publishProject(project: Project) {
    if (project.source === 'shared' || project.status !== 'Draft') return;
    if (!project.tokens || !project.tokenFileName.trim() || !Number.isSafeInteger(project.tokenCount) || project.tokenCount < 1) {
      this.projectError.set('This draft has no valid token JSON file. Edit it and choose a valid file before publishing.');
      return;
    }
    this.projectSaving.set(true);
    this.projectError.set('');
    try {
      const published = await this.sharedProjects.publish(project);
      if (published.source !== 'shared') throw new Error('The saved project was not confirmed as public.');
      this.projects.update(projects => projects.map(existing => existing.id === project.id ? published : existing));
      this.commitProjects(this.projects(), this.activeProjectId());
      this.showNotice('Project published publicly');
    } catch (error) {
      this.projectError.set(error instanceof Error ? error.message : 'The project could not be published.');
    } finally {
      this.projectSaving.set(false);
    }
  }

  editProject(id: string) {
    if (this.role() !== 'designer' || this.projectSaving() || !this.projects().some(project => project.id === id)) return;
    this.editingProjectId.set(id);
    this.view.set('edit');
    this.menuOpen.set(false);
    window.scrollTo({ top: 0 });
    document.getElementById('main')?.focus({ preventScroll: true });
  }

  async saveProject(project: Project) {
    if (this.role() !== 'designer' || this.projectSaving() || this.editingProjectId() !== project.id) return;
    const original = this.projects().find(existing => existing.id === project.id);
    if (!original) {
      this.projectError.set('The project no longer exists. Reload the project list before editing.');
      return;
    }
    if (!project.name.trim() || !project.tokens || !project.tokenFileName.trim() || !Number.isSafeInteger(project.tokenCount) || project.tokenCount < 1) {
      this.projectError.set('Enter a project name and choose a valid token JSON file containing at least one token value.');
      return;
    }
    if (this.projects().some(existing => existing.id !== project.id && existing.name.toLowerCase() === project.name.trim().toLowerCase())) {
      this.projectError.set('Use a unique project name and a valid token JSON file.');
      return;
    }
    if (original.source === 'shared' || original.id === BASE_PROJECT_ID) {
      this.projectSaving.set(true);
      this.projectError.set('');
      try {
        const result = original.source === 'shared'
          ? await this.sharedProjects.update(project)
          : { project: await this.sharedProjects.publish(project), warning: null };
        if (result.project.source !== 'shared' || result.project.id !== original.id) {
          throw new Error('The saved project was not confirmed as the same public project.');
        }
        this.projects.update(projects => projects.map(existing => existing.id === original.id ? result.project : existing));
        this.commitProjects(this.projects(), this.activeProjectId());
        this.cloudError.set('');
        this.showProjects('manage');
        if (result.warning) this.projectError.set(result.warning);
        else this.showNotice('Public project updated');
      } catch (error) {
        this.projectError.set(error instanceof Error ? error.message : 'The public project could not be saved.');
      } finally {
        this.projectSaving.set(false);
      }
      return;
    }
    if (this.commitProjects(this.projects().map(existing => existing.id === project.id ? project : existing), this.activeProjectId())) {
      this.showProjects('manage');
      this.showNotice('Project updated');
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
    if (request.project.source !== 'shared' && this.role() !== 'designer') return;
    const project = this.projects().find(project => project.id === request.project.id);
    if (!project || project.status === 'Base') return;
    this.pendingDeletion.set(project);
    this.deleteTrigger = request.trigger;
    dialog.showModal();
  }

  async confirmProjectDeletion(dialog: HTMLDialogElement) {
    const project = this.pendingDeletion();
    if (!project || project.status === 'Base' || (project.source !== 'shared' && this.role() !== 'designer') || this.projectSaving()) return;

    if (project.source === 'shared') {
      this.projectSaving.set(true);
      this.projectError.set('');
      try {
        const cleanupWarning = await this.sharedProjects.delete(project.id);
        const remaining = this.projects().filter(existing => existing.id !== project.id);
        const activeId = this.activeProjectId() === project.id ? remaining[0]?.id ?? null : this.activeProjectId();
        this.projects.set(remaining);
        this.activeProjectId.set(activeId);
        this.previewProjectId.set(activeId);
        this.commitProjects(remaining, activeId);
        dialog.close();
        if (cleanupWarning) this.projectError.set(cleanupWarning);
        else this.showNotice('Public project deleted');
      } catch (error) {
        this.projectError.set(error instanceof Error ? error.message : 'The public project could not be deleted.');
      } finally {
        this.projectSaving.set(false);
      }
      return;
    }

    const remaining = this.projects().filter(existing => existing.id !== project.id);
    const activeId = this.activeProjectId() === project.id ? remaining[0]?.id ?? null : this.activeProjectId();
    const previousRemoved = this.removedDemoIds;
    if (this.demoProjects.some(demo => demo.id === project.id)) this.removedDemoIds = [...new Set([...previousRemoved, project.id])];
    if (!this.commitProjects(remaining, activeId)) { this.removedDemoIds = previousRemoved; return; }
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
