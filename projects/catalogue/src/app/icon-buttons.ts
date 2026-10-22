import { Component, computed, signal } from '@angular/core';
import { ICON_BUTTON_SIZES, ICON_BUTTON_VARIANTS, IconButtonSize, IconButtonVariant, IndiceIconButton } from 'indice-ui';
import { Icon } from './icon';

@Component({
  selector: 'app-icon-button-catalogue',
  imports: [IndiceIconButton, Icon],
  templateUrl: './icon-buttons.html',
  styleUrls: ['./buttons.css', './icon-buttons.css'],
})
export class IconButtonCatalogue {
  readonly variants = ICON_BUTTON_VARIANTS;
  readonly sizes = ICON_BUTTON_SIZES;
  readonly states = ['default', 'hover', 'pressed', 'inactive'] as const;
  readonly view = signal<'states' | 'playground'>('states');
  readonly query = signal('');
  readonly variant = signal<IconButtonVariant>('black-filled');
  readonly size = signal<IconButtonSize>('small');
  readonly label = signal('Open administration');
  readonly caption = signal('Admin');
  readonly disabled = signal(false);
  readonly activations = signal(0);
  readonly notice = signal('');
  readonly matches = computed(() => this.variants.filter(variant => variant.replaceAll('-', ' ').includes(this.query().trim().toLowerCase().replaceAll('-', ' '))));
  readonly code = computed(() => {
    const options = [
      `label="${this.escape(this.label())}"`,
      `variant="${this.variant()}"`,
      `size="${this.size()}"`,
      ...(this.size() === 'xx-large' ? [`caption="${this.escape(this.caption())}"`] : []),
      ...(this.disabled() ? ['[disabled]="true"'] : []),
    ];
    return `<button indiceIconButton\n  ${options.join('\n  ')}\n></button>`;
  });

  setVariant(value: string) {
    if (this.variants.some(variant => variant === value)) this.variant.set(value as IconButtonVariant);
  }

  setSize(value: string) {
    if (this.sizes.some(size => size === value)) this.size.set(value as IconButtonSize);
  }

  onTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const view = event.key === 'Home' ? 'states' : event.key === 'End' ? 'playground' : this.view() === 'states' ? 'playground' : 'states';
    this.view.set(view);
    (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`#icon-${view}-tab`)?.focus();
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code());
      this.notice.set('Angular markup copied');
    } catch {
      this.notice.set('Clipboard unavailable');
    }
  }

  private escape(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');
  }
}