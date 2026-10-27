import { Component, computed, effect, input, model, signal, untracked } from '@angular/core';
import { Check, Search, Plus, ArrowLeft, Heart, Star, createElement } from 'lucide';
import { DEFAULT_ICON_LIBRARY, ICON_LIBRARIES, STARTER_ICON_NAMES } from './icon-library-data';

const LUCIDE_ICONS = { search: Search, check: Check, plus: Plus, 'arrow-left': ArrowLeft, heart: Heart, star: Star };
const svgUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16)}`)}`;
const loadedIcons = new Map<string, string>();

@Component({
  selector: 'app-icon-picker',
  template: `
    <fieldset>
      <legend>{{ label() }}</legend>
      <fieldset class="picker-options" [disabled]="!enabled()">
      <p>{{ libraryName() }} · starter collection</p>
      <label>Search icons<input type="search" [attr.aria-label]="'Search ' + label().toLowerCase()" [value]="query()" (input)="query.set($any($event.target).value)" /></label>
      <div class="choices" [attr.aria-label]="label()">
        <button type="button" [attr.aria-pressed]="!value()" (click)="selectDefault()">Original</button>
        @for (name of matches(); track name) {
          <button type="button" [attr.aria-label]="label() + ': ' + name" [attr.aria-pressed]="isSelected(name)" [disabled]="loading()" (click)="choose(name)">
            <img [src]="preview(name)" width="20" height="20" alt="" /><span>{{ name }}</span>
          </button>
        } @empty { <span role="status">No matching icons.</span> }
      </div>
      @if (loading()) { <p role="status">Loading icon...</p> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      </fieldset>
      <label class="enable-icon"><input type="checkbox" [checked]="enabled()" (change)="enabled.set($any($event.target).checked)" />{{ label() }}</label>
    </fieldset>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    fieldset { margin: 0; padding: 14px; border: 1px solid var(--line); border-radius: 6px; min-width: 0; }
    legend { font-weight: 600; font-size: 13px; }
    .picker-options { padding: 0; border: 0; }
    .picker-options:disabled { opacity: .5; }
    .enable-icon { display: flex; align-items: center; gap: 8px; margin-top: 14px; color: var(--ink); }
    .enable-icon input { width: auto; margin: 0; }
    p, label { font-size: 12px; color: var(--muted); }
    p { margin: 0 0 10px; }
    label { display: grid; gap: 6px; }
    input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--ink); font: inherit; }
    .choices { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    button { display: inline-flex; align-items: center; gap: 6px; padding: 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--ink); font: inherit; font-size: 12px; cursor: pointer; }
    button[aria-pressed='true'] { background: var(--surface-muted); border-color: var(--ink); }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  `,
})
export class IconPicker {
  readonly label = input.required<string>();
  readonly library = input(DEFAULT_ICON_LIBRARY);
  readonly value = model('');
  readonly enabled = model(true);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly libraryName = computed(() => ICON_LIBRARIES.find(library => library.id === this.library())?.name ?? this.library());
  readonly matches = computed(() => STARTER_ICON_NAMES.filter(name => name.includes(this.query().trim().toLowerCase())));
  private version = 0;
  private previousLibrary: string | undefined;
  private readonly lucideUrls = new Map(STARTER_ICON_NAMES.map(name => [
    name, svgUrl(createElement(LUCIDE_ICONS[name]).outerHTML),
  ]));

  constructor() {
    effect(() => {
      const library = this.library();
      if (this.previousLibrary !== undefined && this.previousLibrary !== library) untracked(() => this.selectDefault());
      this.previousLibrary = library;
    });
  }

  preview(name: typeof STARTER_ICON_NAMES[number]): string {
    return this.library() === 'lucide' ? this.lucideUrls.get(name)! : `icons/${this.library()}/${name}.svg`;
  }

  isSelected(name: typeof STARTER_ICON_NAMES[number]): boolean {
    const url = this.library() === 'lucide' ? this.preview(name) : loadedIcons.get(`${this.library()}/${name}`);
    return !!this.value() && this.value() === url;
  }

  selectDefault() {
    this.version++;
    this.value.set('');
    this.error.set('');
    this.loading.set(false);
  }

  ngOnDestroy() { this.version++; }

  async choose(name: typeof STARTER_ICON_NAMES[number]) {
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    try {
      const source = this.preview(name);
      let url = source;
      if (!source.startsWith('data:')) {
        const response = await fetch(source);
        if (!response.ok) throw new Error(`Icon could not be loaded (HTTP ${response.status}).`);
        const svg = await response.text();
        if (!new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement.matches('svg')) throw new Error('The icon asset is not a valid SVG.');
        url = svgUrl(svg);
      }
      if (version !== this.version || !this.enabled()) return;
      loadedIcons.set(`${this.library()}/${name}`, url);
      this.value.set(url);
    } catch (error) {
      if (version === this.version) this.error.set(error instanceof Error ? error.message : 'Icon could not be loaded. Try again.');
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
}
