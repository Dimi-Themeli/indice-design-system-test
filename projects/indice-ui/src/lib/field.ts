import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, computed, forwardRef, input, model, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FieldLayout = 'vertical' | 'horizontal';
export type FieldType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
let nextFieldId = 0;

@Component({
  selector: 'indice-field',
  imports: [NgTemplateOutlet],
  templateUrl: './field.html',
  styleUrl: './field.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => IndiceField), multi: true }],
})
export class IndiceField implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly inputId = input(`indice-field-${nextFieldId++}`);
  readonly value = model('');
  readonly layout = input<FieldLayout>('vertical');
  readonly type = input<FieldType>('text');
  readonly placeholder = input('Input field text default');
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly showLabel = input(true, { transform: booleanAttribute });
  readonly showIcon = input(true, { transform: booleanAttribute });
  readonly info = input('');
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly error = input('');
  readonly showErrorMessage = input(true, { transform: booleanAttribute });
  readonly actionLabel = input('View value');
  readonly name = input<string | null>(null);
  readonly autocomplete = input('off');
  readonly maxLength = input<number | null>(null);
  readonly iconClick = output<void>();
  readonly revealed = signal(false);
  private readonly formDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  readonly hasError = computed(() => this.invalid() || !!this.error());
  readonly errorVisible = computed(() => !!this.error() && this.showErrorMessage());
  readonly effectiveType = computed(() => this.type() === 'password' && this.revealed() ? 'text' : this.type());
  readonly iconLabel = computed(() => this.type() === 'password' ? this.revealed() ? 'Hide password' : 'Show password' : this.actionLabel());
  readonly descriptionIds = computed(() => [this.info() ? `${this.inputId()}-info` : '', this.errorVisible() ? `${this.inputId()}-error` : ''].filter(Boolean).join(' ') || null);
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void { this.value.set(value == null ? '' : String(value)); }
  registerOnChange(callback: (value: string) => void): void { this.onChange = callback; }
  registerOnTouched(callback: () => void): void { this.onTouched = callback; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  onBlur(): void { this.onTouched(); }

  onIconClick(): void {
    if (this.isDisabled()) return;
    if (this.type() === 'password') this.revealed.update(revealed => !revealed);
    this.iconClick.emit();
  }
}