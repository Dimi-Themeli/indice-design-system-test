import { booleanAttribute, Component, computed, input } from '@angular/core';

export const SOCIAL_BUTTON_PROVIDERS = [
  { id: 'windows', name: 'Microsoft', label: 'Sign in with Microsoft' },
  { id: 'google', name: 'Google', label: 'Sign in with Google' },
  { id: 'facebook', name: 'Facebook', label: 'Login with Facebook' },
  { id: 'apple', name: 'Apple', label: 'Sign in with Apple' },
] as const;
export type SocialButtonProvider = typeof SOCIAL_BUTTON_PROVIDERS[number]['id'];

@Component({
  selector: 'button[indiceSocialButton]',
  styleUrl: './social-button.css',
  template: '<span class="social-provider-logo" aria-hidden="true"></span><span class="social-provider-label">{{ label() }}</span>',
  host: {
    '[attr.data-provider]': 'provider()',
    '[disabled]': 'disabled()',
    '[attr.type]': 'type()',
  },
})
export class IndiceSocialButton {
  readonly provider = input<SocialButtonProvider>('windows');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly label = computed(() => SOCIAL_BUTTON_PROVIDERS.find(provider => provider.id === this.provider())!.label);
}