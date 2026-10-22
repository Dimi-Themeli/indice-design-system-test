import { booleanAttribute, Component, input } from '@angular/core';

export const ICON_BUTTON_VARIANTS = ['black-filled', 'teal-filled', 'black-outline', 'grey-fill'] as const;
export const ICON_BUTTON_SIZES = ['small', 'medium', 'large', 'xx-large'] as const;
export type IconButtonVariant = typeof ICON_BUTTON_VARIANTS[number];
export type IconButtonSize = typeof ICON_BUTTON_SIZES[number];

@Component({
  selector: 'button[indiceIconButton]',
  styleUrl: './icon-button.css',
  template: `
    <span class="icon-button-glyph" aria-hidden="true"></span>
    @if (size() === 'xx-large') { <span class="icon-button-caption" aria-hidden="true">{{ caption() }}</span> }
  `,
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
    '[disabled]': 'disabled()',
    '[attr.type]': 'type()',
  },
})
export class IndiceIconButton {
  readonly label = input.required<string>();
  readonly variant = input<IconButtonVariant>('black-filled');
  readonly size = input<IconButtonSize>('small');
  readonly caption = input('Admin');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}