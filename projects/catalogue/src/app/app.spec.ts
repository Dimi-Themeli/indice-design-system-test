import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';
import { ButtonCatalogue } from './buttons';
import { IconButtonCatalogue } from './icon-buttons';

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
});
