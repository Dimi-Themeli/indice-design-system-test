import { booleanAttribute, Component, input } from '@angular/core';

export const BUTTON_VARIANTS = [
  { id: 'primary-filled', kind: 'primary', appearance: 'filled' },
  { id: 'secondary-outline', kind: 'secondary', appearance: 'outline' },
  { id: 'primary-clear', kind: 'primary', appearance: 'clear' },
  { id: 'secondary-filled', kind: 'secondary', appearance: 'filled' },
  { id: 'secondary-clear', kind: 'secondary', appearance: 'clear' },
  { id: 'delete-clear', kind: 'delete', appearance: 'clear' },
  { id: 'delete-outline', kind: 'delete', appearance: 'outline' },
] as const;

export type ButtonVariant = typeof BUTTON_VARIANTS[number]['id'];

@Component({
  selector: 'button[indiceButton]',
  styleUrl: './button.css',
  template: `
    @if (showLeftIcon()) { <span class="button-icon leading" aria-hidden="true"></span> }
    <span class="button-label"><ng-content /></span>
    @if (showRightIcon()) { <span class="button-icon trailing" aria-hidden="true"></span> }
  `,
  host: {
    '[attr.data-variant]': 'variant()',
    '[disabled]': 'disabled()',
    '[attr.type]': 'type()',
  },
})
export class IndiceButton {
  readonly variant = input<ButtonVariant>('primary-filled');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly showLeftIcon = input(true, { transform: booleanAttribute });
  readonly showRightIcon = input(true, { transform: booleanAttribute });
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}