export type UsageComponent = 'button' | 'icon-button' | 'social-button' | 'field';
export interface UsageConfiguration { required?: boolean; readOnly?: boolean; disabled?: boolean; type?: string; initialValue?: string; }
export type UsageSettings = Record<string, string | boolean | number | null>;
export const USAGE_SETTINGS: Record<UsageComponent, UsageSettings> = {
  button: { label: 'Button', variant: 'primary-filled', type: 'button', showLeftIcon: true, showRightIcon: true, leftIcon: '', rightIcon: '', disabled: false },
  'icon-button': { label: 'Open administration', variant: 'black-filled', size: 'small', caption: 'Admin', type: 'button', disabled: false },
  'social-button': { provider: 'windows', type: 'button', disabled: false },
  field: { label: 'Label text', layout: 'vertical', type: 'text', placeholder: 'Input field text default', initialValue: '', required: false, readOnly: false, disabled: false, showLabel: true, showIcon: true, actionIcon: '', infoIcon: '', info: '', invalid: false, error: '', showErrorMessage: true, actionLabel: 'View value', name: null, autocomplete: 'off', maxLength: null },
};
const SETTING_CHOICES: Partial<Record<UsageComponent, Record<string, string[]>>> = {
  button: { variant: ['primary-filled', 'secondary-outline', 'primary-clear', 'secondary-filled', 'secondary-clear', 'delete-clear', 'delete-outline'] },
  'icon-button': { variant: ['black-filled', 'teal-filled', 'black-outline', 'grey-fill'], size: ['small', 'medium', 'large', 'xx-large'] },
  'social-button': { provider: ['windows', 'google', 'facebook', 'apple'] },
  field: { layout: ['vertical', 'horizontal'], type: ['text', 'email', 'password', 'tel', 'url', 'search'] },
};
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
      { name: 'leftIcon', type: 'string', default: "''", description: 'Leading SVG URL or self-contained data URL. Empty uses the original icon.' },
      { name: 'rightIcon', type: 'string', default: "''", description: 'Trailing SVG URL or self-contained data URL. Empty uses the original icon.' },
      { name: 'type', type: "'button' | 'submit' | 'reset'", default: 'button', description: 'Native button type; set submit explicitly in a form.' },
    ],
    outputs: [{ name: '(click)', type: 'MouseEvent', default: 'Native event', description: 'Bind an application action with (click). Not a custom Angular output.' }],
    accessibility: ['Use a meaningful visible action label. An icon must not be the only way to identify the action.', 'Native Tab, Enter and Space behavior is preserved. Disabled buttons do not activate.', 'Keyboard focus is visible. Do not remove the focus indicator in the consuming application.'],
    notes: ['Button text uses Angular content projection. Icons default to circle-plus; custom SVG masks inherit project icon colours in every state.', 'Primary / Outline retains the secondary-outline API identifier for compatibility.'],
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
      { name: 'actionIcon', type: 'string', default: "''", description: 'Action SVG URL or self-contained data URL. Empty uses the original eye icon. Password visibility behaviour is preserved.' },
      { name: 'infoIcon', type: 'string', default: "''", description: 'Information SVG URL or self-contained data URL. Empty uses the original information icon.' },
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

export function buildUsageParts(component: UsageComponent, markup: string, configuration: UsageConfiguration = {}) {
  const definition = USAGE[component];
  const template = usageMarkup(component, markup);
  const validators = configuration.readOnly ? [] : [...(configuration.required ? ['Validators.required'] : []), ...(configuration.type === 'email' ? ['Validators.email'] : [])];
  const formImports = component === 'field' ? `\nimport { toSignal } from '@angular/core/rxjs-interop';\nimport { FormControl, ReactiveFormsModule${validators.length ? ', Validators' : ''} } from '@angular/forms';` : '';
  const formBody = component === 'field' ? `\n  readonly fieldControl = new FormControl(\n    { value: ${JSON.stringify(configuration.initialValue ?? '')}, disabled: ${!!configuration.disabled} },\n    { nonNullable: true, validators: [${validators.join(', ')}] },\n  );\n  private readonly fieldEvents = toSignal(this.fieldControl.events, { initialValue: null });\n  readonly fieldError = computed(() => {\n    this.fieldEvents();\n    if (!this.fieldControl.touched) return '';\n    if (this.fieldControl.hasError('required')) return 'This field is required.';\n    if (this.fieldControl.hasError('email')) return 'Enter a valid email address.';\n    return '';\n  });\n` : '';
  return {
    template,
    imports: `import { Component${component === 'field' ? ', computed' : ''} } from '@angular/core';${formImports}\nimport { ${definition.symbol} } from 'indice-ui';`,
    componentImports: `imports: [${definition.symbol}${component === 'field' ? ', ReactiveFormsModule' : ''}],`,
    setup: formBody.replace(/^  /gm, '').trim(),
  };
}

export function buildUsageExample(component: UsageComponent, markup: string, configuration: UsageConfiguration = {}): string {
  const parts = buildUsageParts(component, markup, configuration);
  const template = parts.template.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
  const body = parts.setup ? '\n' + parts.setup.split('\n').map(line => '  ' + line).join('\n') + '\n' : '';
  return `${parts.imports}\n\n@Component({\n  selector: 'app-component-example',\n  standalone: true,\n  ${parts.componentImports}\n  template: \`\n${template.split('\n').map(line => '    ' + line).join('\n')}\n  \`,\n})\nexport class ComponentExample {${body}}\n`;
}

export function parseUsageSettings(component: UsageComponent, source: string): UsageSettings {
  let parsed: unknown;
  try { parsed = JSON.parse(source); }
  catch { throw new Error('Enter valid JSON with double-quoted property names and no trailing commas.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Configuration must be a JSON object.');
  const defaults = USAGE_SETTINGS[component];
  for (const [key, value] of Object.entries(parsed)) {
    if (!Object.hasOwn(defaults, key)) throw new Error(`Unsupported property: ${key}.`);
    if (key === 'maxLength') {
      if (value !== null && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)) throw new Error('maxLength must be a non-negative whole number or null.');
    } else if (key === 'name') {
      if (value !== null && typeof value !== 'string') throw new Error('name must be a string or null.');
    } else if (typeof value !== typeof defaults[key]) {
      throw new Error(`${key} must be a ${typeof defaults[key]}.`);
    }
    if (typeof value === 'string' && value.length > 10000) throw new Error(`${key} must be 10,000 characters or fewer.`);
    const choices = key === 'type' && component !== 'field' ? ['button', 'submit', 'reset'] : SETTING_CHOICES[component]?.[key];
    if (choices && !choices.includes(value as string)) throw new Error(`${key} must be one of: ${choices.join(', ')}.`);
  }
  const settings: UsageSettings = { ...defaults, ...parsed };
  if ('label' in settings && !String(settings['label']).trim()) throw new Error('label must not be empty.');
  return settings;
}

export function buildConfiguredUsage(component: UsageComponent, options: UsageSettings) {
  const settings = parseUsageSettings(component, JSON.stringify(options));
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('{', '&#123;').replaceAll('}', '&#125;');
  const attributes: string[] = [];
  for (const [key, value] of Object.entries(settings)) {
    if (value === null || key === 'initialValue' || (key === 'label' && component === 'button') || (key === 'disabled' && component === 'field')) continue;
    if (key === 'error' && value === '') { attributes.push('[error]="fieldError"'); continue; }
    attributes.push(typeof value === 'string'
      ? value.includes('{{') ? `[${key}]="${escape(JSON.stringify(value))}"` : `${key}="${escape(value)}"`
      : `[${key}]="${value}"`);
  }
  const directive = component === 'button' ? 'indiceButton' : component === 'icon-button' ? 'indiceIconButton' : 'indiceSocialButton';
  const label = String(settings['label'] ?? '');
  const content = /[{}@]/.test(label)
    ? `{{ ${JSON.stringify(label).replaceAll('&', '\\u0026').replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')} }}`
    : escape(label);
  const markup = component === 'field'
    ? `<indice-field\n  [formControl]="fieldControl"\n  ${attributes.join('\n  ')}\n/>`
    : `<button ${directive}\n  ${attributes.join('\n  ')}\n>${component === 'button' ? content : ''}</button>`;
  const configuration: UsageConfiguration = component === 'field' ? {
    required: settings['required'] === true, readOnly: settings['readOnly'] === true, disabled: settings['disabled'] === true,
    type: String(settings['type']), initialValue: String(settings['initialValue']),
  } : {};
  return { markup, configuration };
}