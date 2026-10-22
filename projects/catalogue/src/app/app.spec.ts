import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';
import { SocialButtonCatalogue } from './social-buttons';
import { FieldCatalogue } from './fields';
import { UseIt } from './use-it';
import { buildUsageExample, USAGE } from './usage-data';

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
