export type UsageComponent = 'button' | 'icon-button' | 'social-button' | 'field';
export interface UsageConfiguration { required?: boolean; readOnly?: boolean; disabled?: boolean; type?: string; }
export interface ApiEntry { name: string; type: string; default: string; description: string; }
interface UsageDefinition { title: string; symbol: string; selector: string; inputs: ApiEntry[]; outputs: ApiEntry[]; accessibility: string[]; notes: string[]; }

export const USAGE: Record<UsageComponent, UsageDefinition> = {
  button: {
    title: 'Text Button', symbol: 'IndiceButton', selector: 'button[indiceButton]',
    inputs: [
      { name: 'variant', type: 'ButtonVariant', default: 'primary-filled', description: 'primary-filled, secondary-outline, primary-clear, secondary-filled, secondary-clear, delete-clear, delete-outline.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Native disabled behavior.' },
      { name: 'showLeftIcon', type: 'boolean', default: 'true', description: 'Show the original leading circle-plus icon.' },
      { name: 'showRightIcon', type: 'boolean', default: 'true', description: 'Show the original trailing circle-plus icon.' },
      { name: 'type', type: "'button' | 'submit' | 'reset'", default: 'button', description: 'Native button type; set submit explicitly in a form.' },
    ],
    outputs: [{ name: '(click)', type: 'MouseEvent', default: 'Native event', description: 'Bind an application action with (click). Not a custom Angular output.' }],
    accessibility: ['Use a meaningful visible action label. An icon must not be the only way to identify the action.', 'Native Tab, Enter and Space behavior is preserved. Disabled buttons do not activate.', 'Keyboard focus is visible. Do not remove the focus indicator in the consuming application.'],
    notes: ['Button text uses Angular content projection. Both optional icons are the supplied circle-plus assets.', 'The black outline is named secondary-outline in Figma; teal is used for secondary-filled and secondary-clear.'],
  },
  'icon-button': {
    title: 'Icon Button', symbol: 'IndiceIconButton', selector: 'button[indiceIconButton]',
    inputs: [
      { name: 'label', type: 'string', default: 'Required', description: 'Accessible action name and native tooltip, for example Add item.' },
      { name: 'variant', type: 'IconButtonVariant', default: 'black-filled', description: 'black-filled, teal-filled, black-outline or grey-fill.' },
      { name: 'size', type: 'IconButtonSize', default: 'small', description: 'small (32px), medium (40px), large (48px), xx-large (104px).' },
      { name: 'caption', type: 'string', default: 'Admin', description: 'Visible only on xx-large. Longer captions are capped at two lines.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Native disabled behavior.' },
      { name: 'type', type: "'button' | 'submit' | 'reset'", default: 'button', description: 'Native button type.' },
    ],
    outputs: [{ name: '(click)', type: 'MouseEvent', default: 'Native event', description: 'Bind an application action with (click).' }],
    accessibility: ['The label input is required even when the xx-large caption is visible. Describe the action, not the icon shape.', 'Native keyboard activation and focus are preserved; disabled buttons cannot activate.', 'Choose a size appropriate to the touch target needed by the application. The small design is 32px, not a 44px target.'],
    notes: ['This component currently contains only the original circle-plus icon. Arbitrary icon substitution is not an implemented input.', 'The full accessible label remains available when the visible caption is truncated.'],
  },
  'social-button': {
    title: 'Social Media Button', symbol: 'IndiceSocialButton', selector: 'button[indiceSocialButton]',
    inputs: [
      { name: 'provider', type: 'SocialButtonProvider', default: 'windows', description: 'windows (Microsoft), google, facebook or apple.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Native disabled behavior. No disabled visual variant was supplied.' },
      { name: 'type', type: "'button' | 'submit' | 'reset'", default: 'button', description: 'Native button type.' },
    ],
    outputs: [{ name: '(click)', type: 'MouseEvent', default: 'Native event', description: 'Connect your own authentication flow. No sign-in request is made by the library.' }],
    accessibility: ['Provider text supplies the accessible name. Logos are decorative and are not announced twice.', 'Keyboard focus uses the original strong border and takes priority over hover.', 'Set disabled while the application is starting a sign-in request to prevent repeated actions.'],
    notes: ['These are presentation components. OAuth, redirects, permissions and provider policy compliance remain application responsibilities.', 'Segoe UI Regular is the supplied font. It is normally available on Windows; other platforms use the sans-serif fallback. The font is not redistributed.'],
  },
  field: {
    title: 'Input Field', symbol: 'IndiceField', selector: 'indice-field',
    inputs: [
      { name: 'label', type: 'string', default: 'Required', description: 'Visible label and accessible name when showLabel is false.' },
      { name: 'value', type: 'string model', default: "''", description: 'Use [(value)] for standalone state, or a forms directive instead.' },
      { name: 'inputId', type: 'string', default: 'Generated unique ID', description: 'Connects the native input, label and description IDs.' },
      { name: 'layout', type: "'vertical' | 'horizontal'", default: 'vertical', description: 'Editable horizontal fields stack in narrow component containers.' },
      { name: 'type', type: 'FieldType', default: 'text', description: 'text, email, password, tel, url or search.' },
      { name: 'placeholder', type: 'string', default: 'Input field text default', description: 'An input hint, not a replacement for the label.' },
      { name: 'required', type: 'boolean', default: 'false', description: 'Native required attribute and visual star. Add Validators.required to a reactive FormControl.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Native disabled state. Reactive forms should use control.disable() or the initial control state.' },
      { name: 'readOnly', type: 'boolean', default: 'false', description: 'View styling with a focusable, copyable native input.' },
      { name: 'showLabel', type: 'boolean', default: 'true', description: 'Hide the visual label while retaining an accessible name.' },
      { name: 'showIcon', type: 'boolean', default: 'true', description: 'Trailing eye action; omitted in horizontal view mode.' },
      { name: 'info', type: 'string', default: "''", description: 'Information icon, tooltip and associated input description.' },
      { name: 'invalid', type: 'boolean', default: 'false', description: 'Error border and aria-invalid, without a required message.' },
      { name: 'error', type: 'string', default: "''", description: 'Error styling, message and linked accessible description.' },
      { name: 'showErrorMessage', type: 'boolean', default: 'true', description: 'Visibility of the error message.' },
      { name: 'actionLabel', type: 'string', default: 'View value', description: 'Accessible label for non-password eye actions.' },
      { name: 'name', type: 'string | null', default: 'null', description: 'Native input name.' },
      { name: 'autocomplete', type: 'string', default: 'off', description: 'Set a meaningful browser autocomplete token in the consuming application.' },
      { name: 'maxLength', type: 'number | null', default: 'null', description: 'Native character limit.' },
    ],
    outputs: [
      { name: 'valueChange', type: 'string', default: 'Model output', description: 'String changes from the value model. Do not combine value bindings and formControl/ngModel.' },
      { name: 'iconClick', type: 'void', default: 'Angular output', description: 'Trailing action activated. Password fields also toggle visibility.' },
    ],
    accessibility: ['Supply a meaningful label even if showLabel is false. Labels and error descriptions are linked to the real input.', 'Use required, disabled and readOnly for their actual semantics. A read-only value is copyable; a disabled value is not editable or focusable.', 'Validation rules and when to display errors belong to the consuming form. The complete example includes touched-state validation.', 'Set autocomplete for the real field purpose. Handle iconClick for non-password actions and provide a meaningful actionLabel.'],
    notes: ['ReactiveFormsModule, FormsModule/ngModel and standalone [(value)] are supported. Use one binding approach per field.', 'The complete example below uses a reactive FormControl. Its initial disabled state and validators follow the selected playground options.', 'Typed playground values are not copied into the generated example, so password or personal data is not embedded in source code.'],
  },
};

export function usageMarkup(component: UsageComponent, markup: string): string {
  return component === 'field' ? markup.replace('[error]="fieldError"', '[error]="fieldError()"') : markup;
}

export function buildUsageExample(component: UsageComponent, markup: string, configuration: UsageConfiguration = {}): string {
  const definition = USAGE[component];
  const template = usageMarkup(component, markup).replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
  const validators = configuration.readOnly ? [] : [...(configuration.required ? ['Validators.required'] : []), ...(configuration.type === 'email' ? ['Validators.email'] : [])];
  const formImports = component === 'field' ? `\nimport { toSignal } from '@angular/core/rxjs-interop';\nimport { FormControl, ReactiveFormsModule${validators.length ? ', Validators' : ''} } from '@angular/forms';` : '';
  const formBody = component === 'field' ? `\n  readonly fieldControl = new FormControl(\n    { value: '', disabled: ${!!configuration.disabled} },\n    { nonNullable: true, validators: [${validators.join(', ')}] },\n  );\n  private readonly fieldEvents = toSignal(this.fieldControl.events, { initialValue: null });\n  readonly fieldError = computed(() => {\n    this.fieldEvents();\n    if (!this.fieldControl.touched) return '';\n    if (this.fieldControl.hasError('required')) return 'This field is required.';\n    if (this.fieldControl.hasError('email')) return 'Enter a valid email address.';\n    return '';\n  });\n` : '';
  return `import { Component${component === 'field' ? ', computed' : ''} } from '@angular/core';${formImports}\nimport { ${definition.symbol} } from 'indice-ui';\n\n@Component({\n  selector: 'app-component-example',\n  standalone: true,\n  imports: [${definition.symbol}${component === 'field' ? ', ReactiveFormsModule' : ''}],\n  template: \`\n${template.split('\n').map(line => '    ' + line).join('\n')}\n  \`,\n})\nexport class ComponentExample {${formBody}}\n`;
}