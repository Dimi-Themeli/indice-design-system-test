import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';
import { SocialButtonCatalogue } from './social-buttons';
import { FieldCatalogue } from './fields';
import { UseIt } from './use-it';
import { buildConfiguredUsage, buildUsageExample, parseUsageSettings, USAGE } from './usage-data';

describe('App', () => {
  beforeEach(async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
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

  it('places demo roles in the ribbon and enables the draft project workflow only for Designer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.demo-ribbon .role-options input').length).toBe(2);
    expect(element.querySelectorAll('.demo-ribbon .role-choice app-icon').length).toBe(0);
    expect(element.querySelector('.topbar .role-switcher')).toBeNull();
    const trigger = element.querySelector('.topbar .add-project') as HTMLButtonElement;
    const dialog = element.querySelector('.project-dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    expect(trigger.disabled).toBe(true);
    fixture.componentInstance.openProjectWizard(dialog);
    expect(dialog.showModal).not.toHaveBeenCalled();
    (element.querySelector('.demo-ribbon input[value="designer"]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(trigger.disabled).toBe(false);
    trigger.click();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.querySelectorAll('.project-steps li').length).toBe(6);
    expect(dialog.textContent).toContain('Token mapping');
    expect(dialog.textContent).toContain('Project creation is not connected yet.');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.close).toHaveBeenCalledOnce();
    const focus = vi.spyOn(trigger, 'focus');
    dialog.dispatchEvent(new Event('close'));
    expect(focus).toHaveBeenCalledOnce();
  });

  it('replaces the breadcrumb with design system and theme context and opens the current theme chooser', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.breadcrumb')).toBeNull();
    expect(element.querySelector('.sidebar-label')).toBeNull();
    expect(element.querySelector('.system-name')?.textContent).toBe('Design System 0.0');
    expect(element.querySelector('.theme-context')?.textContent).toContain('Themed for Company A');
    const dialog = element.querySelector('dialog[aria-labelledby="theme-chooser-title"]') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    fixture.componentInstance.menuOpen.set(true);
    (element.querySelector('.theme-change') as HTMLButtonElement).click();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
    const choices = dialog.querySelectorAll<HTMLInputElement>('input[name="project-theme"]');
    expect(choices.length).toBe(4);
    expect(choices[0].value).toBe('company-a');
    expect(choices[0].checked).toBe(true);
    expect(dialog.querySelectorAll('img.theme-preview').length).toBe(4);
    choices[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.previewThemeId()).toBe('company-b');
    expect(dialog.querySelector('.theme-dialog-actions')?.textContent).toContain('Sample preview');
    expect(element.querySelector('.theme-context')?.textContent).toContain('Themed for Company A');
    expect(dialog.querySelectorAll('.is-selected').length).toBe(1);
    (dialog.querySelector('.theme-dialog-actions button') as HTMLButtonElement).click();
    expect(dialog.close).toHaveBeenCalledOnce();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.close).toHaveBeenCalledTimes(2);
    const trigger = element.querySelector('.theme-change') as HTMLButtonElement;
    const focus = vi.spyOn(trigger, 'focus');
    dialog.dispatchEvent(new Event('close'));
    expect(focus).toHaveBeenCalledOnce();
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
