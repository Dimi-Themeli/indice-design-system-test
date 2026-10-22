import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { Icon } from './icon';
import { DELIVERY_PACKAGES } from './packages.generated';
import { USAGE, UsageComponent, UsageConfiguration, buildUsageExample, usageMarkup } from './usage-data';

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
  readonly definition = computed(() => USAGE[this.component()]);
  readonly packages = DELIVERY_PACKAGES;
  readonly version = DELIVERY_PACKAGES.find(archive => archive.name === 'indice-ui')!.version;
  readonly angular = DELIVERY_PACKAGES.find(archive => archive.name === 'indice-ui')!.peers['@angular/core'];
  readonly tabs = ['Install', 'Example', 'API', 'Accessibility'] as const;
  readonly tab = signal<typeof this.tabs[number]>('Install');
  readonly notice = signal('');
  readonly install = `npm install ${DELIVERY_PACKAGES.map(archive => './' + archive.filename).join(' ')} @fontsource/geologica`;
  readonly styles = `@import 'indice-tokens/tokens.css';\n@import '@fontsource/geologica/300.css';\n@import '@fontsource/geologica/400.css';`;
  readonly snippet = computed(() => usageMarkup(this.component(), this.markup()));
  readonly example = computed(() => buildUsageExample(this.component(), this.markup(), this.configuration()));
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  open() {
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

  async copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); this.notice.set(`${label} copied`); }
    catch { this.notice.set('Clipboard unavailable'); }
  }
}