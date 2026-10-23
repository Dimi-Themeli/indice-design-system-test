import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { Icon } from './icon';
import { DELIVERY_PACKAGES } from './packages.generated';
import { USAGE, USAGE_SETTINGS, UsageComponent, UsageConfiguration, UsageSettings, buildConfiguredUsage, buildUsageExample, buildUsageParts, parseUsageSettings } from './usage-data';

@Component({
  selector: 'app-use-it',
  imports: [Icon],
  templateUrl: './use-it.html',
  styleUrl: './use-it.css',
})
export class UseIt {
  readonly component = input.required<UsageComponent>();
  readonly markup = input.required<string>();
  readonly configuration = input<UsageConfiguration>({});
  readonly disabled = input(false);
  readonly definition = computed(() => USAGE[this.component()]);
  readonly packages = DELIVERY_PACKAGES;
  readonly version = DELIVERY_PACKAGES.find(archive => archive.name === 'indice-ui')!.version;
  readonly angular = DELIVERY_PACKAGES.find(archive => archive.name === 'indice-ui')!.peers['@angular/core'];
  readonly tabs = ['Code', 'Setup', 'API', 'Accessibility'] as const;
  readonly tab = signal<typeof this.tabs[number]>('Code');
  readonly notice = signal('');
  readonly install = `npm install ${DELIVERY_PACKAGES.map(archive => './' + archive.filename).join(' ')} @fontsource/geologica`;
  readonly styles = `@import 'indice-tokens/tokens.css';\n@import '@fontsource/geologica/300.css';\n@import '@fontsource/geologica/400.css';`;
  private readonly source = computed(() => JSON.stringify([this.component(), this.markup(), this.configuration()]));
  private readonly applied = signal<{ source: string; settings: UsageSettings } | null>(null);
  private readonly draft = signal<{ source: string; text: string } | null>(null);
  readonly jsonError = signal('');
  readonly selectedSettings = computed(() => {
    const component = this.component();
    const settings = { ...USAGE_SETTINGS[component] };
    const element = new DOMParser().parseFromString(this.markup(), 'text/html').body.firstElementChild;
    for (const [key, fallback] of Object.entries(settings)) {
      const binding = element?.getAttribute(`[${key.toLowerCase()}]`);
      const attribute = element?.getAttribute(key.toLowerCase());
      if (typeof fallback === 'boolean') {
        if (binding === 'true' || binding === 'false') settings[key] = binding === 'true';
        else if (attribute !== null && attribute !== undefined) settings[key] = attribute !== 'false';
      } else if (key === 'maxLength' && binding !== null && binding !== undefined && binding !== 'null') {
        settings[key] = Number(binding);
      } else if (attribute !== null && attribute !== undefined) settings[key] = attribute;
    }
    if (component === 'button') settings['label'] = element?.textContent || 'Button';
    if (component === 'field') {
      for (const [key, value] of Object.entries(this.configuration())) {
        if (Object.hasOwn(settings, key) && value !== undefined) settings[key] = value;
      }
    }
    return settings;
  });
  readonly jsonText = computed(() => this.draft()?.source === this.source() ? this.draft()!.text : JSON.stringify(this.selectedSettings(), null, 2));
  private readonly usage = computed(() => this.applied()?.source === this.source()
    ? buildConfiguredUsage(this.component(), this.applied()!.settings)
    : { markup: this.markup(), configuration: this.configuration() });
  readonly parts = computed(() => buildUsageParts(this.component(), this.usage().markup, this.usage().configuration));
  readonly snippet = computed(() => this.parts().template);
  readonly example = computed(() => buildUsageExample(this.component(), this.usage().markup, this.usage().configuration));
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  open() {
    if (this.disabled()) return;
    this.tab.set('Code');
    this.resetJson();
    this.notice.set('');
    this.dialog().nativeElement.showModal();
  }

  close() {
    this.dialog().nativeElement.close();
    this.trigger().nativeElement.focus();
  }

  onBackdrop(event: MouseEvent) {
    if (event.target !== this.dialog().nativeElement) return;
    const bounds = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.close();
  }

  onTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = this.tabs.indexOf(this.tab());
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? this.tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
    this.tab.set(this.tabs[next]);
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  editJson(text: string) {
    this.draft.set({ source: this.source(), text });
    this.jsonError.set('');
    this.notice.set('');
  }

  applyJson() {
    try {
      const settings = parseUsageSettings(this.component(), this.jsonText());
      this.applied.set({ source: this.source(), settings });
      this.draft.set({ source: this.source(), text: JSON.stringify(settings, null, 2) });
      this.jsonError.set('');
      this.notice.set('Configuration applied');
    } catch (error) {
      this.jsonError.set(error instanceof Error ? error.message : 'Invalid configuration.');
      this.notice.set('');
    }
  }

  resetJson() {
    this.applied.set(null);
    this.draft.set(null);
    this.jsonError.set('');
    this.notice.set('Configuration reset');
  }

  async copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); this.notice.set(`${label} copied`); }
    catch { this.notice.set('Clipboard unavailable'); }
  }
}