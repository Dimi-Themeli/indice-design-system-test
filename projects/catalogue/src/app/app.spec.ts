import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { vi } from 'vitest';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';
import { SocialButtonCatalogue } from './social-buttons';
import { FieldCatalogue } from './fields';
import { UseIt } from './use-it';
import { buildConfiguredUsage, buildUsageExample, parseUsageSettings, USAGE } from './usage-data';
import { BASE_PROJECTS, loadProjectState, parseTokenFile, projectCssVariables, PROJECT_STORAGE_KEY, saveProjectState, validFigmaUrl } from './project-data';
import { Projects } from './projects';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('opens the welcome on each new app load and lets either role enter the demo', async () => {
    for (const role of ['developer', 'designer'] as const) {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const dialog = element.querySelector('.welcome-dialog') as HTMLDialogElement;
      dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
      dialog.close = vi.fn(() => dialog.removeAttribute('open'));
      fixture.componentInstance.openWelcome();
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('.welcome-signoff')?.textContent).toBe('.... and always an Indicer! <3');
      const buttons = dialog.querySelectorAll<HTMLButtonElement>('.welcome-roles button');
      expect(dialog.querySelector('.welcome-steps li.current')?.textContent).toContain('01');
      buttons[role === 'developer' ? 0 : 1].click();
      await fixture.whenStable();
      expect(fixture.componentInstance.role()).toBe(role);
      expect(dialog.close).not.toHaveBeenCalled();
      expect(dialog.querySelector('.welcome-steps li.current')?.textContent).toContain('02');
      expect(dialog.querySelector('#welcome-title')?.textContent).toBe('Choose a project');
      const choices = dialog.querySelectorAll<HTMLInputElement>('input[name="welcome-project-choice"]');
      expect(choices.length).toBe(1);
      expect(choices[0].value).toBe('iam');
      expect(choices[0].checked).toBe(true);
      (dialog.querySelector('.welcome-actions .project-text-link') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(dialog.querySelector('.welcome-roles')).not.toBeNull();
      dialog.querySelectorAll<HTMLButtonElement>('.welcome-roles button')[role === 'developer' ? 0 : 1].click();
      await fixture.whenStable();
      (dialog.querySelector('.welcome-open') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(fixture.componentInstance.activeProjectId()).toBe('iam');
      expect(dialog.close).toHaveBeenCalledOnce();
      expect(dialog.open).toBe(false);
      expect((element.querySelector('.topbar-actions') as HTMLElement).style.display).toBe(role === 'designer' ? '' : 'none');
      const radio = element.querySelector(`input[name="demo-role"][value="${role}"]`) as HTMLInputElement;
      const focus = vi.spyOn(radio, 'focus');
      dialog.dispatchEvent(new Event('close'));
      expect(focus).toHaveBeenCalledOnce();
      fixture.destroy();
    }
  });

  it('keeps Escape dismissal without a welcome close button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('.welcome-dialog') as HTMLDialogElement;
    dialog.close = vi.fn();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(dialog.querySelector('.welcome-close')).toBeNull();
    expect(dialog.querySelectorAll('button').length).toBe(2);
  });

  it('switches the current project from the header dropdown without leaving the page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    const uploaded = { ...structuredClone(BASE_PROJECTS[0]), id: 'novio', name: 'Novio', status: 'Draft' as const, tokens: { 'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#005b97' } } } } } } };
    app.projects.set([...BASE_PROJECTS, uploaded]);
    app.showProjects('manage');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector('.theme-context select') as HTMLSelectElement;
    expect([...select.options].map(option => option.textContent)).toEqual(['IAM', 'Novio']);
    expect(select.value).toBe('iam');
    select.value = 'novio';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(app.activeProjectId()).toBe('novio');
    expect(app.view()).toBe('manage');
    expect(loadProjectState().activeId).toBe('novio');
    expect((element.querySelector('main') as HTMLElement).style.getPropertyValue('--indice-colours-main-primary-600')).toBe('#005b97');
    expect(document.documentElement.style.getPropertyValue('--indice-colours-main-primary-600')).toBe('#e5861a');
  });

  it('validates token files and optional Figma links', () => {
    expect(parseTokenFile('{"Palette":{"primary":{"$value":"#000000","$type":"color"}}}').count).toBe(1);
    expect(parseTokenFile('{"primary":"#000000","spacing":8}').count).toBe(2);
    for (const source of ['{', '[]', 'null', '{}', '{"$description":"Empty"}']) expect(() => parseTokenFile(source)).toThrow();
    expect(validFigmaUrl('')).toBe(true);
    expect(validFigmaUrl('https://www.figma.com/design/demo/Project')).toBe(true);
    expect(validFigmaUrl('https://figma.com.evil.example/design/demo')).toBe(false);
    expect(validFigmaUrl('javascript:alert(1)')).toBe(false);
  });

  it('maps project primitive and semantic color tokens to component CSS variables', () => {
    const variables = projectCssVariables({
      'Primitive/Indice': {
        colours: { main: { primary: { '600': { $value: '#005b97', $type: 'color' } } } },
      },
      'Semantic/Default - Light Mode': {
        colours: { surface: { 'element-primary-default': { $value: '{colours.main.primary.600}', $type: 'color' } } },
      },
    });
    expect(variables['--indice-colours-main-primary-600']).toBe('#005b97');
    expect(variables['--colours-surface-element-primary-default']).toBe('#005b97');
    const otherProjectVariables = projectCssVariables({
      'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#e5861a' } } } } },
    });
    expect(otherProjectVariables['--indice-colours-main-primary-600']).toBe('#e5861a');
  });

  it('persists only uploaded projects, keeps IAM built in and reports corrupt or unavailable storage', () => {
    const uploaded = { ...structuredClone(BASE_PROJECTS[0]), id: 'uploaded', name: 'Uploaded', status: 'Draft' as const, tokens: { color: '#000000' } };
    saveProjectState([...BASE_PROJECTS, uploaded], 'uploaded');
    expect(JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY)!).projects.map((project: { id: string }) => project.id)).toEqual(['uploaded']);
    expect(loadProjectState().activeId).toBe('uploaded');
    expect(loadProjectState().projects.map(project => project.id)).toEqual(['iam', 'uploaded']);
    const legacySample = { ...structuredClone(BASE_PROJECTS[0]), id: 'company-b', name: 'Company B', status: 'Sample', tokens: null, images: ['assets/theme-company-b.png'] };
    expect(loadProjectState({ getItem: () => JSON.stringify({ version: 1, projects: [legacySample], activeId: 'company-a' }) })).toMatchObject({ activeId: 'iam', warning: '' });
    const legacyProject = { ...uploaded } as Partial<typeof uploaded>;
    delete legacyProject.logoDark;
    delete legacyProject.logoLight;
    Object.assign(legacyProject, { logo: 'data:image/png;base64,AA==' });
    const legacyState = loadProjectState({ getItem: () => JSON.stringify({ version: 1, projects: [legacyProject], activeId: legacyProject.id }) });
    expect(legacyState.projects[1].logoLight).toBe('data:image/png;base64,AA==');
    expect(legacyState.projects[1].logoDark).toBeNull();
    const projectWithLogo = { ...uploaded, logoDark: 'data:image/png;base64,AQID', logoLight: 'data:image/png;base64,AA==' };
    saveProjectState([projectWithLogo], projectWithLogo.id);
    expect(loadProjectState().warning).toBe('');
    expect(loadProjectState().projects[1].logoLight).toBe(projectWithLogo.logoLight);
    expect(loadProjectState().projects[1].logoDark).toBe(projectWithLogo.logoDark);
    saveProjectState([], null);
    expect(loadProjectState().projects.map(project => project.id)).toEqual(['iam']);
    expect(loadProjectState().activeId).toBe('iam');
    expect(loadProjectState().projects[0].tokens).not.toBeNull();
    expect(loadProjectState({ getItem: () => '{' }).warning).toBeTruthy();
    expect(() => saveProjectState([], null, { setItem: () => { throw new Error('Quota'); } })).toThrow('could not be saved');
  });

  it('creates a project with only a name and token JSON, and rejects missing or invalid required data', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('page', 'create');
    fixture.componentRef.setInput('canEdit', true);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const create = vi.fn();
    component.create.subscribe(create);
    component.submit();
    expect(component.formError()).toContain('project name');
    component.update('name', 'Demo customer');
    component.submit();
    expect(component.formError()).toContain('token JSON');
    await component.selectTokenFile({ name: 'broken.json', size: 10, text: async () => '{' } as File);
    expect(component.tokenError()).toContain('not valid JSON');
    await component.selectTokenFile({ name: 'tokens.json', size: 100, text: async () => '{"brand":{"$value":"#123456"}}' } as File);
    component.submit();
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toMatchObject({ name: 'Demo customer', customer: '', figmaUrl: '', images: [], tokenFileName: 'tokens.json', tokenCount: 1, status: 'Draft' });
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[required]').length).toBe(2);
    component.update('figmaUrl', 'https://not-figma.example');
    component.submit();
    expect(component.formError()).toContain('HTTPS Figma');
    expect(create).toHaveBeenCalledOnce();
  });

  it('uploads optional dark and light theme logos, previews them, and includes both in the draft', async () => {
    const readImage = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', { configurable: true, value: 'data:image/png;base64,AA==' });
      this.onload?.call(this, new ProgressEvent('load') as ProgressEvent<FileReader>);
    });
    try {
      const fixture = TestBed.createComponent(Projects);
      fixture.componentRef.setInput('page', 'create');
      fixture.componentRef.setInput('canEdit', true);
      await fixture.whenStable();
      const component = fixture.componentInstance;
      const create = vi.fn();
      component.create.subscribe(create);
      component.update('name', 'Logo project');
      await component.selectTokenFile({ name: 'tokens.json', size: 20, text: async () => '{"brand":"#000000"}' } as File);
      await component.selectLogoFile('dark', { name: 'dark-logo.png', type: 'image/png', size: 3 } as File);
      await component.selectLogoFile('light', { name: 'light-logo.png', type: 'image/png', size: 3 } as File);
      fixture.detectChanges();
      expect(component.logos()).toEqual({ dark: 'data:image/png;base64,AA==', light: 'data:image/png;base64,AA==', thumbnail: null });
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('.logo-preview').length).toBe(2);
      component.submit();
      expect(create.mock.calls[0][0].logoDark).toBe('data:image/png;base64,AA==');
      expect(create.mock.calls[0][0].logoLight).toBe('data:image/png;base64,AA==');
      component.clearLogo('dark');
      fixture.detectChanges();
      expect(component.logos().dark).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('.logo-preview').length).toBe(1);
    } finally {
      readImage.mockRestore();
    }
  });

  it('shows the project light logo on project tiles but not in the workspace header', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;
    component.setRole('designer');
    const project = {
      ...structuredClone(BASE_PROJECTS[0]),
      id: 'brand-project',
      name: 'Brand project',
      status: 'Draft' as const,
      tokens: { brand: '#000000' },
      tokenFileName: 'tokens.json',
      tokenCount: 1,
      logoDark: 'data:image/png;base64,AQ==',
      logoLight: 'data:image/png;base64,AA==',
      images: [],
    };
    component.createProject(project);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.topbar img')).toBeNull();
    expect(element.querySelector('.project-row .project-logo[alt="Brand project logo"]')?.getAttribute('src')).toBe(project.logoLight);
    component.chooseRole('designer');
    fixture.detectChanges();
    expect(element.querySelector('.welcome-dialog .theme-option .theme-logo-preview')?.getAttribute('src')).toBe(project.logoLight);
  });

  it('applies the selected project palette to the shared component library and removes it on project switch', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.setRole('designer');
    const project = {
      ...structuredClone(BASE_PROJECTS[0]),
      id: 'themed-project',
      name: 'Themed project',
      status: 'Draft' as const,
      tokens: {
        'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#005b97', $type: 'color' } } } } },
        'Semantic/Default - Light Mode': { colours: { surface: { 'element-primary-default': { $value: '{colours.main.primary.600}', $type: 'color' } } } },
      },
      tokenFileName: 'tokens.json',
      tokenCount: 1,
      images: [],
    };
    app.createProject(project);
    await fixture.whenStable();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    const root = document.documentElement;
    expect(main.style.getPropertyValue('--indice-colours-main-primary-600')).toBe('#005b97');
    expect(main.style.getPropertyValue('--colours-surface-element-primary-default')).toBe('#005b97');
    expect(root.style.getPropertyValue('--indice-colours-main-primary-600')).toBe('#e5861a');
    expect(root.style.getPropertyValue('--colours-surface-element-primary-default')).toBe('');
    app.activateProject('iam');
    await fixture.whenStable();
    expect(main.style.getPropertyValue('--indice-colours-main-primary-600')).toBe('#e5861a');
    expect(main.style.getPropertyValue('--colours-surface-element-primary-default')).toBe('');
    expect(root.style.getPropertyValue('--indice-colours-main-primary-600')).toBe('#e5861a');
  });

  it('shows the active project tokens on the foundation pages and falls back to IAM', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.setRole('designer');
    app.createProject({
      ...structuredClone(BASE_PROJECTS[0]),
      id: 'novio', name: 'Novio', status: 'Draft' as const, tokenFileName: 'novio.json', tokenCount: 2, images: [],
      tokens: { 'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#005b97', $type: 'color' } } } }, space: { '8': { $value: 8, $type: 'number' } } } },
    });
    app.select('colours');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(app.count('colours')).toBe(1);
    expect(element.querySelector('.token .token-value')?.textContent).toBe('#005b97');
    expect(element.querySelector('.total strong')?.textContent).toBe('2');
    app.activateProject('iam');
    fixture.detectChanges();
    expect(app.count('colours')).toBeGreaterThan(100);
    expect(element.querySelector('.token-section[aria-label="colours.main.primary"] .token-value')?.textContent).not.toBe('#005b97');
  });

  it('uploads a thumbnail background image and shows the dark theme logo in front of it on project tiles', async () => {
    const readImage = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', { configurable: true, value: 'data:image/png;base64,AA==' });
      this.onload?.call(this, new ProgressEvent('load') as ProgressEvent<FileReader>);
    });
    try {
      const form = TestBed.createComponent(Projects);
      form.componentRef.setInput('page', 'create');
      form.componentRef.setInput('canEdit', true);
      await form.whenStable();
      const create = vi.fn();
      form.componentInstance.create.subscribe(create);
      form.componentInstance.update('name', 'Thumb project');
      await form.componentInstance.selectTokenFile({ name: 'tokens.json', size: 20, text: async () => '{"brand":"#000000"}' } as File);
      await form.componentInstance.selectLogoFile('thumbnail', { name: 'bg.png', type: 'image/png', size: 3 } as File);
      form.detectChanges();
      expect((form.nativeElement as HTMLElement).querySelector('.thumbnail-preview')).not.toBeNull();
      form.componentInstance.submit();
      expect(create.mock.calls[0][0].thumbnail).toBe('data:image/png;base64,AA==');
    } finally {
      readImage.mockRestore();
    }
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.setRole('designer');
    app.createProject({ ...structuredClone(BASE_PROJECTS[0]), id: 'thumb', name: 'Thumb', status: 'Draft' as const, tokens: { brand: '#000000' }, tokenFileName: 'tokens.json', tokenCount: 1, images: [], logoLight: 'data:image/png;base64,AA==', logoDark: 'data:image/png;base64,Ag==', thumbnail: 'data:image/png;base64,AQ==' });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('.project-thumbnail-bg') as HTMLElement).style.backgroundImage).toContain('data:image/png;base64,AQ==');
    expect(element.querySelector('.project-thumbnail-bg img')?.getAttribute('src')).toBe('data:image/png;base64,Ag==');
    expect(element.querySelector('.delete-action[aria-disabled="true"]')?.getAttribute('title')).toBe('IAM is the built-in project and cannot be deleted');
    app.chooseRole('designer');
    fixture.detectChanges();
    expect((element.querySelector('.theme-thumbnail-preview') as HTMLElement).style.backgroundImage).toContain('data:image/png;base64,AQ==');
    expect(element.querySelector('.theme-thumbnail-preview img')?.getAttribute('src')).toBe('data:image/png;base64,Ag==');
  });
  it('ignores stale token file reads and prevents creation for read-only users', async () => {
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const create = vi.fn();
    component.create.subscribe(create);
    let finish!: (source: string) => void;
    const slow = component.selectTokenFile({ name: 'old.json', size: 20, text: () => new Promise<string>(resolve => { finish = resolve; }) } as File);
    await component.selectTokenFile({ name: 'new.json', size: 20, text: async () => '{"color":"#ffffff"}' } as File);
    finish('{"old":"#000000","other":1}');
    await slow;
    expect(component.tokenFileName()).toBe('new.json');
    expect(component.tokenDocument()?.count).toBe(1);
    component.update('name', 'Read-only');
    component.submit();
    expect(create).not.toHaveBeenCalled();
  });

  it('edits a project from Manage projects, keeping its tokens unless a replacement JSON is chosen', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.setRole('designer');
    await fixture.whenStable();
    const project = { ...structuredClone(BASE_PROJECTS[0]), id: 'novio', name: 'Novio', status: 'Draft' as const, tokens: { color: '#111111' }, tokenFileName: 'old.json', tokenCount: 1, logoLight: 'data:image/png;base64,AA==', images: [] };
    app.createProject(project);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    (element.querySelector('[aria-label="Edit Novio"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(app.view()).toBe('edit');
    expect(element.querySelector('.topbar')?.hasAttribute('hidden')).toBe(true);
    expect(element.querySelector('app-projects h1')?.textContent).toContain('Edit Novio');
    const form = fixture.debugElement.query(By.directive(Projects)).componentInstance as Projects;
    expect(form.draft().name).toBe('Novio');
    expect(form.tokenFileName()).toBe('old.json');
    expect(form.logos().light).toBe(project.logoLight);
    expect((element.querySelector('input[name="projectName"]') as HTMLInputElement).value).toBe('Novio');
    expect(element.querySelector('app-projects .primary-action')?.textContent).toContain('Save changes');
    form.update('name', 'IAM');
    form.submit();
    expect(form.formError()).toContain('already exists');
    form.update('name', 'Novio renamed');
    form.clearLogo('light');
    form.submit();
    await fixture.whenStable();
    expect(app.view()).toBe('manage');
    expect(app.projects().find(item => item.id === 'novio')).toMatchObject({ name: 'Novio renamed', tokenFileName: 'old.json', tokens: { color: '#111111' }, logoLight: null });
    app.editProject('novio');
    await fixture.whenStable();
    await form.selectTokenFile({ name: 'new.json', size: 20, text: async () => '{"color":"#222222","other":"#333333"}' } as File);
    form.submit();
    await fixture.whenStable();
    expect(loadProjectState().projects.find(item => item.id === 'novio')).toMatchObject({ tokenFileName: 'new.json', tokenCount: 2, tokens: { color: '#222222' } });
    app.editProject('iam');
    await fixture.whenStable();
    form.update('name', 'IAM edited');
    form.submit();
    await fixture.whenStable();
    expect(loadProjectState().projects[0]).toMatchObject({ id: 'iam', name: 'IAM edited', status: 'Base' });
    expect(element.querySelector('[aria-label="Delete IAM edited"]')).toBeNull();
    app.setRole('developer');
    await fixture.whenStable();
    expect(element.querySelector('[aria-label="Edit IAM edited"]')).toBeNull();
    app.editProject('novio');
    expect(app.view()).toBe('manage');
  });

  it('starts a fresh project form when returning from management', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('page', 'create');
    await fixture.whenStable();
    fixture.componentInstance.update('name', 'Old draft');
    await fixture.componentInstance.selectTokenFile({ name: 'tokens.json', size: 20, text: async () => '{"brand":"#000000"}' } as File);
    fixture.componentRef.setInput('page', 'manage');
    await fixture.whenStable();
    fixture.componentRef.setInput('page', 'create');
    await fixture.whenStable();
    expect(fixture.componentInstance.draft().name).toBe('');
    expect(fixture.componentInstance.tokenDocument()).toBeNull();
  });

  it('creates and persists a draft project, then deletes it only after confirmation', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;
    component.setRole('designer');
    await fixture.whenStable();
    const project = { ...structuredClone(BASE_PROJECTS[0]), id: 'new-project', name: 'New project', status: 'Draft' as const, tokens: { primary: '#000000' }, tokenFileName: 'tokens.json', tokenCount: 1, images: [] };
    component.createProject(project);
    await fixture.whenStable();
    expect(component.view()).toBe('manage');
    expect(component.currentProject()?.id).toBe(project.id);
    expect(loadProjectState().projects.some(saved => saved.id === project.id)).toBe(true);
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('.delete-project-dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    const trigger = element.querySelector('[aria-label="Delete New project"]') as HTMLButtonElement;
    trigger.click();
    await fixture.whenStable();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.textContent).toContain('New project');
    expect(component.projects().length).toBe(2);
    (dialog.querySelector('.project-text-link') as HTMLButtonElement).click();
    dialog.dispatchEvent(new Event('close'));
    expect(component.projects().length).toBe(2);
    trigger.click();
    (dialog.querySelector('.confirm-delete') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(component.projects().length).toBe(1);
    expect(component.activeProjectId()).toBe('iam');
    expect(loadProjectState().projects.some(saved => saved.id === project.id)).toBe(false);
    expect(loadProjectState().activeId).toBe('iam');
    expect(element.querySelector('[aria-label="Delete IAM"]')).toBeNull();
    component.requestProjectDeletion({ project: BASE_PROJECTS[0], trigger }, dialog);
    component.confirmProjectDeletion(dialog);
    await fixture.whenStable();
    expect(component.currentProject()?.id).toBe('iam');
    expect(loadProjectState().projects.map(saved => saved.id)).toEqual(['iam']);
  });

  it('keeps projects intact on storage failure and rejects developer mutations', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;
    const project = { ...structuredClone(BASE_PROJECTS[0]), id: 'new-project', name: 'New project', tokens: { color: '#000000' } };
    component.createProject(project);
    expect(component.projects().length).toBe(1);
    component.setRole('designer');
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    try {
      component.createProject(project);
      expect(component.projects().length).toBe(1);
      expect(component.projectError()).toContain('could not be saved');
      expect(component.activeProjectId()).toBe('iam');
    } finally { write.mockRestore(); }
    component.setRole('developer');
    const dialog = document.createElement('dialog');
    dialog.showModal = vi.fn();
    component.requestProjectDeletion({ project: BASE_PROJECTS[0], trigger: document.createElement('button') }, dialog);
    expect(dialog.showModal).not.toHaveBeenCalled();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('defaults to Developer and switches demo roles without losing the current component selection', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.select('buttons');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const designer = element.querySelector('.role-options input[value="designer"]') as HTMLInputElement;
    const developer = element.querySelector('.role-options input[value="developer"]') as HTMLInputElement;
    expect(fixture.componentInstance.role()).toBe('developer');
    expect(developer.checked).toBe(true);
    expect(designer.checked).toBe(false);
    const catalogue = element.querySelector('app-button-catalogue');
    (element.querySelector('input[name="button-variant"][value="delete-clear"]') as HTMLInputElement).click();
    await fixture.whenStable();
    fixture.componentInstance.menuOpen.set(true);
    designer.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.role()).toBe('designer');
    expect(designer.checked).toBe(true);
    expect(developer.checked).toBe(false);
    expect(element.getAttribute('data-role')).toBe('designer');
    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(fixture.componentInstance.category()).toBe('buttons');
    expect(element.querySelector('app-button-catalogue')).toBe(catalogue);
    expect((element.querySelector('input[name="button-variant"][value="delete-clear"]') as HTMLInputElement).checked).toBe(true);
    expect((element.querySelector('.use-it-trigger') as HTMLButtonElement).disabled).toBe(false);
    developer.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.role()).toBe('developer');
    expect(element.getAttribute('data-role')).toBe('developer');
  });

  it('hides project editing for Developer and opens the creation page for Designer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.demo-ribbon .role-options input').length).toBe(2);
    expect(element.querySelectorAll('.demo-ribbon .role-choice app-icon').length).toBe(0);
    expect(element.querySelector('.topbar .role-switcher')).toBeNull();
    const trigger = element.querySelector('.topbar .add-project') as HTMLButtonElement;
    const actions = element.querySelector('.topbar-actions') as HTMLElement;
    expect(trigger.disabled).toBe(true);
    expect(actions.style.display).toBe('none');
    fixture.componentInstance.showProjects('create');
    expect(fixture.componentInstance.view()).toBe('library');
    (element.querySelector('.demo-ribbon input[value="designer"]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(trigger.disabled).toBe(false);
    expect(actions.style.display).toBe('');
    trigger.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('create');
    expect((element.querySelector('.demo-ribbon') as HTMLElement).hidden).toBe(false);
    expect((element.querySelector('.topbar') as HTMLElement).hidden).toBe(true);
    expect(element.querySelector('app-projects h1')?.textContent).toBe('Add project');
    expect(element.querySelector('.project-dialog')).toBeNull();
    (element.querySelector('.demo-ribbon input[value="developer"]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(actions.style.display).toBe('none');
    expect(trigger.disabled).toBe(true);
    expect(fixture.componentInstance.view()).toBe('manage');
    expect((element.querySelector('.demo-ribbon') as HTMLElement).hidden).toBe(false);
    expect((element.querySelector('.topbar') as HTMLElement).hidden).toBe(false);
    expect(element.querySelector('app-projects .delete-action')).toBeNull();
  });

  it('shows only the design system name and project dropdown in the header, and lists all projects in welcome step 02', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    const uploadedProjects = [
      { ...structuredClone(BASE_PROJECTS[0]), id: 'uploaded-one', name: 'Uploaded One', status: 'Draft' as const, tokens: { color: '#111111' }, logoLight: 'data:image/png;base64,AA==' },
      { ...structuredClone(BASE_PROJECTS[0]), id: 'uploaded-two', name: 'Uploaded Two', status: 'Draft' as const, tokens: { color: '#222222' }, logoLight: 'data:image/png;base64,AQ==' },
    ];
    app.projects.set([...BASE_PROJECTS, ...uploadedProjects]);
    app.activeProjectId.set(uploadedProjects[0].id);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.breadcrumb')).toBeNull();
    expect(element.querySelector('.sidebar-label')).toBeNull();
    expect(element.querySelector('.system-name')?.textContent).toBe('Design System 0.0');
    expect((element.querySelector('.theme-context select') as HTMLSelectElement).value).toBe('uploaded-one');
    expect(element.querySelector('.topbar img')).toBeNull();
    expect(element.querySelector('.topbar')?.textContent).not.toContain('Change project');
    expect(element.querySelector('dialog[aria-labelledby="theme-chooser-title"]')).toBeNull();
    const dialog = element.querySelector('.welcome-dialog') as HTMLDialogElement;
    dialog.close = vi.fn();
    app.chooseRole('designer');
    fixture.detectChanges();
    const choices = dialog.querySelectorAll<HTMLInputElement>('input[name="welcome-project-choice"]');
    expect([...choices].map(choice => choice.value)).toEqual(['iam', 'uploaded-one', 'uploaded-two']);
    expect(choices[1].checked).toBe(true);
    expect(dialog.querySelectorAll('img.theme-preview').length).toBe(2);
    choices[2].click();
    fixture.detectChanges();
    expect(app.previewProjectId()).toBe('uploaded-two');
    expect(dialog.querySelectorAll('.is-selected').length).toBe(1);
    expect(app.activeProjectId()).toBe('uploaded-one');
    (dialog.querySelector('.welcome-open') as HTMLButtonElement).click();
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(app.activeProjectId()).toBe('uploaded-two');
  });
  it('offers the source JSON download only at the bottom of the sidebar without the progress status', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector('.sidebar-bottom .source-link') as HTMLAnchorElement;
    expect(link.textContent).toContain('Source JSON');
    expect(link.getAttribute('href')).toBe('tokens/primitive.json');
    expect(link.getAttribute('download')).toBe('indice-primitives.json');
    expect(element.querySelector('.topbar a[download]')).toBeNull();
    expect(element.querySelectorAll('.source-link[download]').length).toBe(1);
    expect(element.querySelector('.sidebar-bottom')?.textContent).not.toContain('In progress');
    expect(element.querySelector('.status-dot')).toBeNull();
  });

  it('renders the colour chapter from token data', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Colours');
    expect(compiled.querySelectorAll('.token').length).toBe(138);
  });

  it('searches all categories and handles no matches', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.query.set('space.8');
    expect(app.visible().map(token => token.name)).toEqual(['space.8', 'space.80']);
    app.query.set('not-a-token');
    expect(app.groups()).toEqual([]);
  });

  it('switches categories and clears search', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.query.set('primary');
    app.select('fonts');
    expect(app.query()).toBe('');
    expect(app.visible().length).toBe(8);
  });

  it('collapses both sidebar categories and nested groups without changing the selected page', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.select('buttons');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const sections = [...element.querySelectorAll<HTMLDetailsElement>('.sidebar .nav-section')];
    expect(sections.length).toBe(2);
    expect(sections.every(section => section.open)).toBe(true);
    const foundations = sections[0];
    (foundations.querySelector('summary') as HTMLElement).click();
    expect(foundations.open).toBe(false);
    (foundations.querySelector('summary') as HTMLElement).click();
    expect(foundations.open).toBe(true);
    (element.querySelector('[aria-label="Collapse all categories"]') as HTMLButtonElement).click();
    expect(element.querySelectorAll('.sidebar details[open]').length).toBe(0);
    expect(fixture.componentInstance.category()).toBe('buttons');
    expect(element.querySelector('h1')?.textContent).toContain('Buttons');
    (sections[1].querySelector('summary') as HTMLElement).click();
    expect(sections[1].open).toBe(true);
    expect(sections[1].querySelectorAll('details[open]').length).toBe(0);
    (sections[1].querySelector('.nav-group summary') as HTMLElement).click();
    expect((sections[1].querySelector('.nav-group') as HTMLDetailsElement).open).toBe(true);
  });

  it('groups all three button pages under an expanded Buttons category', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const group = fixture.nativeElement.querySelector('nav[aria-label="Components"] details') as HTMLDetailsElement;
    expect(group.open).toBe(true);
    expect(group.querySelector('summary')?.textContent).toContain('Buttons');
    expect([...group.querySelectorAll('.nav-children button')].map(button => button.querySelector('span')?.textContent)).toEqual(['Text Buttons', 'Icon Buttons', 'Social Media']);
    (group.querySelectorAll('button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.category()).toBe('icon-buttons');
    expect(group.querySelector('[aria-current="page"]')?.textContent).toContain('Icon Buttons');
  });

  it('opens the Buttons chapter with all 28 states and seven disabled buttons', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.select('buttons');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Buttons');
    expect(element.querySelectorAll('button[indiceButton]').length).toBe(28);
    expect(element.querySelectorAll('button[indiceButton]:disabled').length).toBe(7);
  });

  it('requires a button selection and synchronizes cards, playground and delivery markup', async () => {
    const fixture = TestBed.createComponent(ButtonCatalogue);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector('.use-it-trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(element.querySelector('input[type="radio"]:checked')).toBeNull();
    const choice = element.querySelector('input[value="delete-clear"]') as HTMLInputElement;
    choice.click();
    await fixture.whenStable();
    expect(trigger.disabled).toBe(false);
    expect(choice.checked).toBe(true);
    expect(element.querySelector('.is-selected')?.getAttribute('aria-label')).toBe('delete-clear');
    expect(element.querySelector('.usage-content')?.textContent).toBeTruthy();
    fixture.componentInstance.view.set('playground');
    await fixture.whenStable();
    const select = element.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('delete-clear');
    select.value = 'primary-filled';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toContain('variant="primary-filled"');
    const codeTab = [...element.querySelectorAll<HTMLButtonElement>('.usage-tabs button')].find(button => button.textContent?.trim() === 'Code')!;
    codeTab.click();
    await fixture.whenStable();
    expect(element.querySelector('.usage-content pre')?.textContent).toContain('variant="primary-filled"');
    fixture.componentInstance.view.set('states');
    fixture.componentInstance.query.set('delete');
    await fixture.whenStable();
    expect(trigger.disabled).toBe(false);
    fixture.componentInstance.query.set('');
    await fixture.whenStable();
    expect((element.querySelector('input[value="primary-filled"]') as HTMLInputElement).checked).toBe(true);
  });

  it('enables Use It from the playground only after choosing a valid variant', async () => {
    const fixture = TestBed.createComponent(ButtonCatalogue);
    fixture.componentInstance.view.set('playground');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('select') as HTMLSelectElement).value).toBe('');
    fixture.componentInstance.setVariant('invalid');
    expect(fixture.componentInstance.hasSelection()).toBe(false);
    fixture.componentInstance.setVariant('primary-filled');
    await fixture.whenStable();
    expect((element.querySelector('.use-it-trigger') as HTMLButtonElement).disabled).toBe(false);
  });

  it('filters button variants and generates escaped Angular markup', () => {
    const component = TestBed.createComponent(ButtonCatalogue).componentInstance;
    component.query.set('delete');
    expect(component.matches().length).toBe(2);
    component.disabled.set(true);
    component.leftIcon.set(false);
    component.label.set('<b>{{label}}</b>');
    expect(component.code()).toContain('[disabled]="true"');
    expect(component.code()).toContain('[showLeftIcon]="false"');
    expect(component.code()).toContain('&lt;b&gt;&#123;&#123;label&#125;&#125;&lt;/b&gt;');
  });

  it('opens Icon Buttons with all 64 combinations and 16 disabled buttons', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.select('icon-buttons');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Icon Buttons');
    expect(element.querySelectorAll('button[indiceIconButton]').length).toBe(64);
    expect(element.querySelectorAll('button[indiceIconButton]:disabled').length).toBe(16);
    expect(element.querySelectorAll('.icon-button-caption').length).toBe(16);
  });

  it('requires icon and social selections and preserves them in the playground', async () => {
    for (const entry of [
      { component: IconButtonCatalogue, value: 'teal-filled', attribute: 'variant' },
      { component: SocialButtonCatalogue, value: 'google', attribute: 'provider' },
    ]) {
      const fixture = TestBed.createComponent<IconButtonCatalogue | SocialButtonCatalogue>(entry.component);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const trigger = element.querySelector('.use-it-trigger') as HTMLButtonElement;
      expect(trigger.disabled).toBe(true);
      (element.querySelector(`input[value="${entry.value}"]`) as HTMLInputElement).click();
      await fixture.whenStable();
      expect(trigger.disabled).toBe(false);
      expect(fixture.componentInstance.code()).toContain(`${entry.attribute}="${entry.value}"`);
      fixture.componentInstance.view.set('playground');
      await fixture.whenStable();
      expect((element.querySelector('select') as HTMLSelectElement).value).toBe(entry.value);
      fixture.destroy();
    }
  });

  it('filters icon variants and safely generates icon-button attributes', () => {
    const component = TestBed.createComponent(IconButtonCatalogue).componentInstance;
    component.query.set('black');
    expect(component.matches()).toEqual(['black-filled', 'black-outline']);
    component.setSize('xx-large');
    component.label.set('Open "Admin"');
    component.caption.set('{{Admin}}');
    component.disabled.set(true);
    expect(component.code()).toContain('label="Open &quot;Admin&quot;"');
    expect(component.code()).toContain('caption="&#123;&#123;Admin&#125;&#125;"');
    expect(component.code()).toContain('[disabled]="true"');
  });

  it('opens Social Media with twelve original provider states', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.select('social-buttons');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Social Media Buttons');
    expect(element.querySelectorAll('button[indiceSocialButton]').length).toBe(12);
    expect(element.querySelectorAll('button[data-preview-state="focus"]').length).toBe(4);
  });

  it('finds Microsoft by its name and its Figma windows identifier', () => {
    const component = TestBed.createComponent(SocialButtonCatalogue).componentInstance;
    component.query.set('Microsoft');
    expect(component.matches().map(provider => provider.id)).toEqual(['windows']);
    component.query.set('windows');
    expect(component.matches().length).toBe(1);
    component.setProvider('google');
    component.disabled.set(true);
    expect(component.code()).toContain('provider="google"');
    expect(component.code()).toContain('[disabled]="true"');
  });

  it('opens Input Field with eleven original Figma variants', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.select('fields');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Input Field');
    expect(element.querySelectorAll('.field-example indice-field').length).toBe(11);
    expect(element.querySelectorAll('.field-example input:disabled').length).toBe(1);
    expect(element.querySelectorAll('.field-example input[readonly]').length).toBe(2);
  });

  it('selects every field preset with matching layout, state and safe example data', async () => {
    const fixture = TestBed.createComponent(FieldCatalogue);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('.use-it-trigger') as HTMLButtonElement).disabled).toBe(true);
    for (const example of component.examples) {
      (element.querySelector(`input[type="radio"][value="${example.id}"]`) as HTMLInputElement).click();
      await fixture.whenStable();
      expect(component.layout()).toBe(example.layout);
      expect(component.readOnly()).toBe(example.kind === 'view');
      expect(component.control.disabled).toBe(example.state === 'disabled');
      expect(component.control.value).toBe(example.value);
      expect(component.presetInvalid()).toBe(example.state === 'error');
      expect((element.querySelector('.use-it-trigger') as HTMLButtonElement).disabled).toBe(false);
    }
    component.control.setValue('Private typed value');
    const source = buildUsageExample('field', component.code(), { initialValue: component.initialValue(), readOnly: component.readOnly() });
    expect(source).toContain('Input field text default');
    expect(source).not.toContain('Private typed value');
    component.view.set('playground');
    await fixture.whenStable();
    expect((element.querySelector('select') as HTMLSelectElement).value).toBe('view-idle-horizontal');
  });

  it('filters field examples and validates and resets the live form', () => {
    const component = TestBed.createComponent(FieldCatalogue).componentInstance;
    component.query.set('horizontal');
    expect(component.matches().length).toBe(3);
    component.validate();
    expect(component.error()).toBe('This field is required.');
    component.control.setValue('A value');
    component.validate();
    expect(component.result()).toBe('Value submitted.');
    component.reset();
    expect(component.control.value).toBe('');
    expect(component.control.untouched).toBe(true);
    component.setType('email');
    component.control.setValue('not-an-email');
    component.validate();
    expect(component.error()).toBe('Enter a valid email address.');
  });

  it('provides Use It for all four implemented component pages', async () => {
    for (const category of ['buttons', 'icon-buttons', 'social-buttons', 'fields']) {
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance.select(category);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('.use-it-trigger')?.textContent).toContain('Use It');
      expect(element.querySelector('[role="tab"][aria-selected="true"][id^="usage-"]')?.textContent?.trim()).toBe('Code');
      expect(element.querySelector('.package-downloads')).toBeNull();
      (element.querySelector('[id$="-Setup"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect(element.querySelectorAll('.package-downloads a').length).toBe(2);
      expect(element.querySelector('.usage-header h2')?.textContent).toBeTruthy();
      fixture.destroy();
    }
  });

  it('generates complete Field setup matching selected validation and disabled options', () => {
    const source = buildUsageExample('field', '<indice-field label="Email" [formControl]="fieldControl" [error]="fieldError" />', { required: true, type: 'email', disabled: true });
    expect(source).toContain('imports: [IndiceField, ReactiveFormsModule]');
    expect(source).toContain('disabled: true');
    expect(source).toContain('Validators.required, Validators.email');
    expect(source).toContain('[error]="fieldError()"');
    const readonly = buildUsageExample('field', '<indice-field label="Value" />', { required: true, readOnly: true, type: 'email' });
    expect(readonly).toContain('validators: []');
  });

  it('updates the delivery example when playground markup changes', async () => {
    const fixture = TestBed.createComponent(UseIt);
    fixture.componentRef.setInput('component', 'button');
    fixture.componentRef.setInput('markup', '<button indiceButton>Save</button>');
    await fixture.whenStable();
    expect(fixture.componentInstance.example()).toContain('Save</button>');
    fixture.componentRef.setInput('markup', '<button indiceButton variant="delete-clear">Delete</button>');
    await fixture.whenStable();
    expect(fixture.componentInstance.example()).toContain('variant="delete-clear"');
    expect(fixture.componentInstance.install).toContain('./indice-ui-0.0.1.tgz');
    expect(USAGE.field.inputs.find(input => input.name === 'label')?.default).toBe('Required');
  });

  it('puts the standalone component first and keeps code fragments read-only', async () => {
    const fixture = TestBed.createComponent(UseIt);
    fixture.componentRef.setInput('component', 'field');
    fixture.componentRef.setInput('markup', '<indice-field label="Email" [formControl]="fieldControl" [error]="fieldError" />');
    fixture.componentRef.setInput('configuration', { required: true, type: 'email' });
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    const copy = vi.spyOn(component, 'copy').mockResolvedValue();
    expect(element.querySelector('.usage-content h3')?.textContent).toBe('Standalone Component');
    (element.querySelector('[aria-label="Copy complete Angular example"]') as HTMLButtonElement).click();
    expect(copy).toHaveBeenLastCalledWith(component.example(), 'Angular example');
    (element.querySelector('[aria-label="Copy CSS selector"]') as HTMLButtonElement).click();
    expect(copy).toHaveBeenLastCalledWith('indice-field', 'Selector');
    expect(element.querySelector('[aria-label="Copy component template"]')).toBeNull();
    expect(element.querySelector('[aria-label="Copy TypeScript imports"]')).toBeNull();
    expect(element.querySelector('[aria-label="Copy form state"]')).toBeNull();
    expect(component.parts().setup).toContain('Validators.required, Validators.email');
    expect(component.parts().componentImports).toBe('imports: [IndiceField, ReactiveFormsModule],');
    const dialog = element.querySelector('dialog')!;
    dialog.showModal = vi.fn();
    component.tab.set('Setup');
    component.open();
    expect(component.tab()).toBe('Code');
    expect(dialog.showModal).toHaveBeenCalledOnce();
  });

  it('seeds JSON from selected inputs and applies validated field configuration', async () => {
    const fixture = TestBed.createComponent(UseIt);
    fixture.componentRef.setInput('component', 'field');
    fixture.componentRef.setInput('markup', '<indice-field label="Selected field" layout="horizontal" [required]="true" [readOnly]="true" [error]="fieldError" />');
    fixture.componentRef.setInput('configuration', { required: true, readOnly: true, initialValue: 'Preset value' });
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    const selected = JSON.parse(component.jsonText());
    expect(selected).toMatchObject({ label: 'Selected field', layout: 'horizontal', required: true, readOnly: true, initialValue: 'Preset value' });
    const editor = element.querySelector('textarea') as HTMLTextAreaElement;
    editor.value = JSON.stringify({ ...selected, label: 'Email "work"', type: 'email', disabled: true, readOnly: false, initialValue: 'demo@example.com', maxLength: 80 });
    editor.dispatchEvent(new Event('input'));
    (element.querySelector('.configuration-actions .text-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(component.jsonError()).toBe('');
    expect(component.example()).toContain('label="Email &quot;work&quot;"');
    expect(component.example()).toContain('type="email"');
    expect(component.example()).toContain('Validators.required, Validators.email');
    expect(component.example()).toContain('value: "demo@example.com", disabled: true');
    expect(component.example()).toContain('[maxLength]="80"');
    expect(component.example()).toContain('[error]="fieldError()"');
    expect(element.querySelector('.standalone-code')?.textContent).toBe(component.example());
    const valid = component.example();
    component.editJson('{');
    component.applyJson();
    await fixture.whenStable();
    expect(component.example()).toBe(valid);
    expect(editor.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('valid JSON');
    component.editJson('{"required":"yes"}');
    component.applyJson();
    expect(component.jsonError()).toContain('required must be a boolean');
    expect(component.example()).toBe(valid);
    (element.querySelector('[aria-label="Reset configuration JSON"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(component.jsonError()).toBe('');
    expect(JSON.parse(component.jsonText())).toEqual(selected);
    expect(component.example()).toContain('label="Selected field"');
    fixture.componentRef.setInput('markup', '<indice-field label="Another field" />');
    await fixture.whenStable();
    expect(JSON.parse(component.jsonText()).label).toBe('Another field');
  });

  it('configures all button families from JSON and escapes literal text', async () => {
    for (const entry of [
      { component: 'button', markup: '<button indiceButton variant="delete-clear">Save &amp; close</button>', change: { label: '<b>{{name}}</b>', variant: 'secondary-filled' }, expected: 'variant="secondary-filled"' },
      { component: 'icon-button', markup: '<button indiceIconButton label="Open" size="large"></button>', change: { variant: 'teal-filled', size: 'xx-large', caption: 'Team' }, expected: 'size="xx-large"' },
      { component: 'social-button', markup: '<button indiceSocialButton provider="google"></button>', change: { provider: 'apple', disabled: true }, expected: 'provider="apple"' },
    ] as const) {
      const fixture = TestBed.createComponent(UseIt);
      fixture.componentRef.setInput('component', entry.component);
      fixture.componentRef.setInput('markup', entry.markup);
      await fixture.whenStable();
      const component = fixture.componentInstance;
      component.editJson(JSON.stringify({ ...JSON.parse(component.jsonText()), ...entry.change }));
      component.applyJson();
      expect(component.jsonError()).toBe('');
      expect(component.example()).toContain(entry.expected);
      if (entry.component === 'button') {
        expect(component.snippet()).toContain('\\u003cb\\u003e');
        expect(component.snippet()).not.toContain('<b>');
      }
      const copy = vi.spyOn(component, 'copy').mockResolvedValue();
      await fixture.whenStable();
      (fixture.nativeElement.querySelector('[aria-label="Copy complete Angular example"]') as HTMLButtonElement).click();
      expect(copy).toHaveBeenLastCalledWith(component.example(), 'Angular example');
      fixture.destroy();
    }
  });

  it('rejects invalid JSON settings rather than emitting unsupported component code', () => {
    for (const source of ['null', '[]', 'true', '{"unknown":true}', '{"__proto__":{}}', '{"required":"true"}', '{"type":"javascript"}', '{"label":""}', '{"maxLength":-1}', '{"maxLength":1.5}']) {
      expect(() => parseUsageSettings('field', source)).toThrow();
    }
    expect(() => parseUsageSettings('button', '{"variant":"missing"}')).toThrow('variant must be one of');
    expect(() => parseUsageSettings('icon-button', '{"size":"huge"}')).toThrow('size must be one of');
    expect(() => parseUsageSettings('social-button', '{"provider":"missing"}')).toThrow('provider must be one of');
    const usage = buildConfiguredUsage('field', parseUsageSettings('field', '{"type":"email","required":true,"readOnly":true,"initialValue":"Example"}'));
    expect(buildUsageExample('field', usage.markup, usage.configuration)).toContain('validators: []');
  });

  it('does not open Use It while disabled', async () => {
    const fixture = TestBed.createComponent(UseIt);
    fixture.componentRef.setInput('component', 'button');
    fixture.componentRef.setInput('markup', '<button indiceButton>Save</button>');
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    fixture.componentInstance.open();
    expect(dialog.showModal).not.toHaveBeenCalled();
    expect((fixture.nativeElement.querySelector('.use-it-trigger') as HTMLButtonElement).disabled).toBe(true);
  });

  it('closes Use It on Escape and restores focus to its trigger', async () => {
    const fixture = TestBed.createComponent(UseIt);
    fixture.componentRef.setInput('component', 'button');
    fixture.componentRef.setInput('markup', '<button indiceButton>Save</button>');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog')!;
    const trigger = element.querySelector('.use-it-trigger') as HTMLButtonElement;
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    trigger.focus = vi.fn();
    dialog.setAttribute('open', '');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(trigger.focus).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});
