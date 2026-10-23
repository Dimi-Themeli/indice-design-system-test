import { Component, computed, signal } from '@angular/core';
import { IndiceSocialButton, SOCIAL_BUTTON_PROVIDERS, SocialButtonProvider } from 'indice-ui';
import { Icon } from './icon';
import { UseIt } from './use-it';

@Component({
  selector: 'app-social-button-catalogue',
  imports: [IndiceSocialButton, Icon, UseIt],
  templateUrl: './social-buttons.html',
  styleUrls: ['./buttons.css', './social-buttons.css'],
})
export class SocialButtonCatalogue {
  readonly providers = SOCIAL_BUTTON_PROVIDERS;
  readonly states = ['default', 'hover', 'focus'] as const;
  readonly view = signal<'states' | 'playground'>('states');
  readonly query = signal('');
  readonly provider = signal<SocialButtonProvider>('windows');
  readonly hasSelection = signal(false);
  readonly disabled = signal(false);
  readonly activations = signal(0);
  readonly notice = signal('');
  readonly matches = computed(() => this.providers.filter(provider => `${provider.id} ${provider.name} ${provider.label}`.toLowerCase().includes(this.query().trim().toLowerCase())));
  readonly code = computed(() => `<button indiceSocialButton\n  provider="${this.provider()}"${this.disabled() ? '\n  [disabled]="true"' : ''}\n></button>`);

  setProvider(value: string) {
    if (this.providers.some(provider => provider.id === value)) {
      this.provider.set(value as SocialButtonProvider);
      this.hasSelection.set(true);
    }
  }

  onTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const view = event.key === 'Home' ? 'states' : event.key === 'End' ? 'playground' : this.view() === 'states' ? 'playground' : 'states';
    this.view.set(view);
    (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`#social-${view}-tab`)?.focus();
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