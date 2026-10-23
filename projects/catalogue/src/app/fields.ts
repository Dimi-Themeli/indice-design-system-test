import { Component, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldLayout, FieldType, IndiceField } from 'indice-ui';
import { Icon } from './icon';
import { UseIt } from './use-it';

export const FIELD_EXAMPLES = [
  { id: 'empty-idle-vertical', kind: 'empty', state: 'idle', layout: 'vertical', value: '' },
  { id: 'empty-focus-vertical', kind: 'empty', state: 'focus', layout: 'vertical', value: '' },
  { id: 'filled-idle-vertical', kind: 'filled', state: 'idle', layout: 'vertical', value: 'Input field text custom' },
  { id: 'filled-focus-vertical', kind: 'filled', state: 'focus', layout: 'vertical', value: 'Input field text custom' },
  { id: 'filled-disabled-vertical', kind: 'filled', state: 'disabled', layout: 'vertical', value: 'Input field text inactive' },
  { id: 'filled-error-vertical', kind: 'filled', state: 'error', layout: 'vertical', value: 'Input field text error' },
  { id: 'empty-error-vertical', kind: 'empty', state: 'error', layout: 'vertical', value: '' },
  { id: 'view-idle-vertical', kind: 'view', state: 'idle', layout: 'vertical', value: 'Input field text default' },
  { id: 'empty-idle-horizontal', kind: 'empty', state: 'idle', layout: 'horizontal', value: '' },
  { id: 'filled-idle-horizontal', kind: 'filled', state: 'idle', layout: 'horizontal', value: 'Input field text default' },
  { id: 'view-idle-horizontal', kind: 'view', state: 'idle', layout: 'horizontal', value: 'Input field text default' },
] as const;

@Component({
  selector: 'app-field-catalogue',
  imports: [IndiceField, Icon, ReactiveFormsModule, UseIt],
  templateUrl: './fields.html',
  styleUrls: ['./buttons.css', './fields.css'],
})
export class FieldCatalogue {
  readonly examples = FIELD_EXAMPLES;
  readonly view = signal<'states' | 'playground'>('states');
  readonly query = signal('');
  readonly selectedExample = signal('');
  readonly hasSelection = computed(() => !!this.selectedExample());
  readonly initialValue = computed(() => this.examples.find(example => example.id === this.selectedExample())?.value ?? '');
  readonly presetInvalid = signal(false);
  readonly presetError = signal('');
  readonly matches = computed(() => this.examples.filter(example => example.id.replaceAll('-', ' ').includes(this.query().trim().toLowerCase().replaceAll('-', ' '))));
  readonly layout = signal<FieldLayout>('vertical');
  readonly type = signal<FieldType>('text');
  readonly label = signal('Label text');
  readonly placeholder = signal('Input field text default');
  readonly required = signal(true);
  readonly readOnly = signal(false);
  readonly showLabel = signal(true);
  readonly showIcon = signal(true);
  readonly showInfo = signal(true);
  readonly showErrorMessage = signal(true);
  readonly control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly currentValue = toSignal(this.control.valueChanges, { initialValue: this.control.value });
  private readonly formEvents = toSignal(this.control.events, { initialValue: null });
  readonly submitted = signal(false);
  readonly actionCount = signal(0);
  readonly notice = signal('');
  readonly result = signal('');
  readonly error = computed(() => {
    this.formEvents();
    if (this.presetError()) return this.presetError();
    if (!this.submitted() && !this.control.touched) return '';
    if (this.control.hasError('required')) return 'This field is required.';
    if (this.control.hasError('email')) return 'Enter a valid email address.';
    return '';
  });
  readonly code = computed(() => `<indice-field\n  label="${this.escape(this.label() || 'Field preview')}"\n  [formControl]="fieldControl"\n  layout="${this.layout()}"\n  type="${this.type()}"\n  placeholder="${this.escape(this.placeholder())}"\n  [required]="${this.required()}"\n  [readOnly]="${this.readOnly()}"\n  [showLabel]="${this.showLabel()}"\n  [showIcon]="${this.showIcon()}"${this.showInfo() ? '\n  info="Field information"' : ''}${this.presetInvalid() ? '\n  [invalid]="true"' : ''}\n  ${this.presetError() ? `error="${this.escape(this.presetError())}"` : '[error]="fieldError"'}\n  [showErrorMessage]="${this.showErrorMessage()}"\n/>`);

  selectExample(id: string) {
    const example = this.examples.find(example => example.id === id);
    if (!example) return;
    this.selectedExample.set(id);
    this.layout.set(example.layout);
    this.type.set('text');
    this.label.set('Label text');
    this.placeholder.set('Input field text default');
    this.required.set(true);
    this.readOnly.set(example.kind === 'view');
    this.showLabel.set(true);
    this.showIcon.set(true);
    this.showInfo.set(true);
    this.showErrorMessage.set(true);
    this.presetInvalid.set(example.state === 'error');
    this.presetError.set(example.state === 'error' && example.kind === 'filled' ? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit' : '');
    this.submitted.set(false);
    this.result.set('');
    this.control.reset({ value: example.value, disabled: example.state === 'disabled' });
    this.updateValidators();
  }

  setLayout(layout: FieldLayout) { this.layout.set(layout); }

  setType(type: string) {
    if (['text', 'email', 'password', 'tel', 'url', 'search'].includes(type)) {
      this.type.set(type as FieldType);
      this.updateValidators();
    }
  }

  setRequired(required: boolean) { this.required.set(required); this.updateValidators(); }
  setReadOnly(readOnly: boolean) { this.readOnly.set(readOnly); this.updateValidators(); }
  setDisabled(disabled: boolean) { disabled ? this.control.disable() : this.control.enable(); }

  private updateValidators() {
    this.control.setValidators(this.readOnly() ? [] : [ ...(this.required() ? [Validators.required] : []), ...(this.type() === 'email' ? [Validators.email] : []) ]);
    this.control.updateValueAndValidity();
  }

  validate() {
    this.presetInvalid.set(false);
    this.presetError.set('');
    this.submitted.set(true);
    this.control.markAsTouched();
    this.result.set(this.control.disabled ? 'Field is disabled.' : this.control.valid ? 'Value submitted.' : 'Check the field.');
  }

  reset() {
    this.presetInvalid.set(false);
    this.presetError.set('');
    this.submitted.set(false);
    this.result.set('');
    this.control.reset();
  }

  onTabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const view = event.key === 'Home' ? 'states' : event.key === 'End' ? 'playground' : this.view() === 'states' ? 'playground' : 'states';
    this.view.set(view);
    (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`#field-${view}-tab`)?.focus();
  }

  async copyCode() {
    try { await navigator.clipboard.writeText(this.code()); this.notice.set('Angular markup copied'); }
    catch { this.notice.set('Clipboard unavailable'); }
  }

  private escape(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');
  }
}