import { Component, computed, signal } from '@angular/core';
import { BUTTON_VARIANTS, ButtonVariant, IndiceButton } from 'indice-ui';
import { Icon } from './icon';
import { UseIt } from './use-it';

@Component({
  selector: 'app-button-catalogue',
  imports: [IndiceButton, Icon, UseIt],
  templateUrl: './buttons.html',
  styleUrl: './buttons.css',
})
export class ButtonCatalogue {
  readonly variants = BUTTON_VARIANTS;
  readonly states = ['active', 'hover', 'pressed', 'inactive'] as const;
  readonly view = signal<'states' | 'playground'>('states');
  readonly query = signal('');
  readonly variant = signal<ButtonVariant>('primary-filled');
  readonly label = signal('Button');
  readonly leftIcon = signal(true);
  readonly rightIcon = signal(true);
  readonly disabled = signal(false);
  readonly activations = signal(0);
  readonly notice = signal('');
  readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.variants.filter(variant => `${variant.kind} ${variant.appearance}`.includes(query));
  });
  readonly code = computed(() => {
    const label = this.label().replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');
    const options = [
      `variant="${this.variant()}"`,
      ...(!this.leftIcon() ? ['[showLeftIcon]="false"'] : []),
      ...(!this.rightIcon() ? ['[showRightIcon]="false"'] : []),
      ...(this.disabled() ? ['[disabled]="true"'] : []),
    ];
    return `<button indiceButton\n  ${options.join('\n  ')}\n>${label}</button>`;
  });

  setVariant(value: string) {
    if (this.variants.some(variant => variant.id === value)) this.variant.set(value as ButtonVariant);
  }

  onTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const view = event.key === 'Home' ? 'states' : event.key === 'End' ? 'playground' : this.view() === 'states' ? 'playground' : 'states';
    this.view.set(view);
    (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`#${view}-tab`)?.focus();
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code());
      this.notice.set('Angular markup copied');
    } catch {
      this.notice.set('Clipboard unavailable');
    }
  }
}