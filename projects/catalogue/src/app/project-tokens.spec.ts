import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectTokens } from './project-tokens';
import { BASE_PROJECTS, Project } from './project-data';
import { RevisionState, TokenRevision, TokenRevisions } from './token-revisions';

const current: TokenRevision = {
  id: 'initial', version: '1.0.0', status: 'Ready', changeNote: 'Initial file', fileName: 'initial.json',
  tokens: { 'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#123456' } } } } } },
  tokenCount: 1, createdAt: '2026-10-29T10:00:00Z',
};
const draft: TokenRevision = {
  ...current, id: 'draft', version: '1.1.0', status: 'Draft', fileName: 'new.json',
  changeNote: 'New primary', tokens: { 'Primitive/Indice': { colours: { main: { primary: { '600': { $value: '#0089e8' } } } } } },
};
const project: Project = {
  ...structuredClone(BASE_PROJECTS[0]), id: 'shared', name: 'Shared', source: 'shared', status: 'Draft',
  tokens: current.tokens, tokenFileName: current.fileName, tokenCount: current.tokenCount,
};

describe('Project token revisions', () => {
  let state: RevisionState;
  let service: {
    load: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    activate: ReturnType<typeof vi.fn>;
  };
  beforeEach(async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
    state = structuredClone({ currentId: current.id, revisions: [draft, current] });
    service = {
      load: vi.fn(async () => structuredClone(state)),
      add: vi.fn(async () => { state.currentId = draft.id; return structuredClone(draft); }),
      setStatus: vi.fn().mockResolvedValue(undefined),
      activate: vi.fn().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({ imports: [ProjectTokens], providers: [{ provide: TokenRevisions, useValue: service }] }).compileComponents();
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup(edit = true, selected: Project = project) {
    const fixture = TestBed.createComponent(ProjectTokens);
    fixture.componentRef.setInput('project', selected);
    fixture.componentRef.setInput('canEdit', edit);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows current metadata and history and keeps viewing separate from the active theme', async () => {
    const fixture = await setup(false);
    const component = fixture.componentInstance;
    const changed = vi.fn();
    component.changed.subscribe(changed);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.projects-heading')?.textContent?.trim()).toBe('Tokens');
    expect(element.querySelector('.projects-heading p')).toBeNull();
    expect(element.querySelector('.token-status')?.textContent).toBe('Ready');
    expect(element.querySelector('.token-status')?.getAttribute('data-status')).toBe('Ready');
    expect(element.textContent).toContain('Current token version');
    expect(element.textContent).toContain('Initial file');
    expect(element.textContent).toContain('Version history');
    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).not.toContain('Make v1.1.0 current');
    (element.querySelector('.revision-row .secondary-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('pre')?.textContent).toContain('#0089e8');
    expect(component.current()?.tokens).toEqual(current.tokens);
    expect(changed).not.toHaveBeenCalled();
    await component.makeCurrent(draft);
    await component.changeStatus(draft, 'Ready');
    expect(service.activate).not.toHaveBeenCalled();
    expect(service.setStatus).not.toHaveBeenCalled();
  });

  it('uploads a revision as current regardless of readiness and retains the old revision', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const saved = { ...draft, id: 'uploaded', version: '1.2.0' };
    service.add.mockImplementation(async () => { state.currentId = saved.id; state.revisions.unshift(saved); return saved; });
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.version.set('1.2.0');
    component.note.set('Changed colors');
    await component.readFile({ name: 'new.json', size: 100, text: async () => JSON.stringify(draft.tokens) } as File);
    await component.upload();
    expect(service.add).toHaveBeenCalledWith(project.id, '1.2.0', 'Draft', 'Changed colors', 'new.json', draft.tokens);
    expect(service.activate).not.toHaveBeenCalled();
    expect(component.current()?.id).toBe(saved.id);
    expect(component.history().map(item => item.id)).toContain(current.id);
    expect(component.notice()).toContain('made current');
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ id: project.id, tokens: saved.tokens, tokenFileName: saved.fileName }));
  });

  it('explicitly activates a history revision and emits the updated project theme', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const changed = vi.fn();
    component.changed.subscribe(changed);
    service.activate.mockImplementation(async () => { state.currentId = draft.id; });
    await component.makeCurrent(draft);
    expect(service.activate).toHaveBeenCalledWith(project, draft);
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({
      id: project.id, tokens: draft.tokens, tokenFileName: draft.fileName, tokenCount: draft.tokenCount,
    }));
    expect(component.current()?.id).toBe(draft.id);
    expect(component.history().map(item => item.id)).toEqual([current.id]);
  });

  it('updates readiness status without activating or overwriting tokens', async () => {
    const fixture = await setup();
    const statusChanged = vi.fn();
    fixture.componentInstance.currentStatusChanged.subscribe(statusChanged);
    expect((fixture.nativeElement.querySelector('.revision-actions select') as HTMLSelectElement).value).toBe('Ready');
    service.setStatus.mockImplementation(async () => { state.revisions[0].status = 'Ready'; });
    await fixture.componentInstance.changeStatus(draft, 'Ready');
    expect(service.setStatus).toHaveBeenCalledWith(project.id, draft.id, 'Ready');
    expect(service.activate).not.toHaveBeenCalled();
    expect(fixture.componentInstance.history()[0].status).toBe('Ready');
    service.setStatus.mockImplementation(async () => { state.revisions[1].status = 'In review'; });
    await fixture.componentInstance.changeStatus(current, 'In review');
    await fixture.whenStable();
    expect(statusChanged).toHaveBeenLastCalledWith({ projectId: project.id, status: 'In review' });
    expect(fixture.nativeElement.querySelector('.token-status')?.textContent).toBe('In review');
  });

  it('shows migration/load failures and allows retry without fabricating history', async () => {
    service.load.mockRejectedValueOnce(new Error('Run updated setup'));
    const fixture = await setup();
    expect(fixture.componentInstance.error()).toContain('Run updated setup');
    expect(fixture.componentInstance.current()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Retry loading history');
    await fixture.componentInstance.load();
    expect(fixture.componentInstance.current()?.id).toBe(current.id);
  });

  it('keeps the saved status selected when a readiness update fails', async () => {
    const fixture = await setup();
    const select = fixture.nativeElement.querySelector('.revision-actions select') as HTMLSelectElement;
    service.setStatus.mockRejectedValueOnce(new Error('Status permission denied'));
    select.value = 'Draft';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(select.value).toBe('Ready');
    expect(fixture.componentInstance.error()).toBe('Status permission denied');
    expect(fixture.componentInstance.current()?.status).toBe('Ready');
  });

  it('reports upload and activation errors while preserving saved/current data', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    await component.readFile({ name: 'broken.json', size: 2, text: async () => '{' } as File);
    await component.upload();
    expect(service.add).not.toHaveBeenCalled();
    await component.readFile({ name: 'new.json', size: 100, text: async () => JSON.stringify(draft.tokens) } as File);
    service.add.mockRejectedValueOnce(new Error('Version already exists'));
    await component.upload();
    expect(component.error()).toBe('Version already exists');
    expect(component.document()?.tokens).toEqual(draft.tokens);
    service.activate.mockRejectedValueOnce(new Error('Permission denied'));
    await component.makeCurrent(draft);
    expect(component.error()).toBe('Permission denied');
    expect(component.current()?.id).toBe(current.id);
  });

  it('does not show stale history or file reads after switching projects', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    let finish!: (value: string) => void;
    const reading = component.readFile({ name: 'slow.json', size: 10, text: () => new Promise(resolve => { finish = resolve; }) } as File);
    fixture.componentRef.setInput('project', { ...project, id: 'other', name: 'Other' });
    await fixture.whenStable();
    finish(JSON.stringify(draft.tokens));
    await reading;
    expect(component.document()).toBeNull();
    expect(service.load).toHaveBeenLastCalledWith('other');
    expect(component.selected()).toBeNull();
  });

  it('offers explicit shared initialization for IAM and local drafts', async () => {
    for (const local of [structuredClone(BASE_PROJECTS[0]), { ...project, source: undefined }]) {
      const fixture = await setup(true, local);
      expect(service.load).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Initialize shared history');
      expect(fixture.nativeElement.textContent).toContain('No saved revisions yet');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      fixture.destroy();
    }
  });

  it('downloads the selected revision JSON rather than bundled IAM tokens', async () => {
    const fixture = await setup(false);
    const create = vi.fn().mockReturnValue('blob:tokens');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('new.json');
      expect(this.href).toBe('blob:tokens');
    });
    fixture.componentInstance.download(draft.tokens, draft.fileName);
    expect(create).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(JSON.parse(await blob.text())).toEqual(draft.tokens);
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
});
