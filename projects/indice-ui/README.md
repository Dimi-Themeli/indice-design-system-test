# Indice UI

Reusable standalone Angular components: native `button[indiceButton]` and `button[indiceIconButton]`.

## Usage

```ts
import { IndiceButton } from 'indice-ui';
```

Add `IndiceButton` to your standalone component's `imports`, then:

```html
<button indiceButton variant="primary-filled" (click)="save()">Save</button>
<button indiceButton variant="delete-outline" [disabled]="busy()">Delete</button>
<button indiceButton variant="primary-clear" [showLeftIcon]="false" [showRightIcon]="false">Cancel</button>
```

Load Geologica Regular in your global stylesheet (for example, `@fontsource/geologica/400.css`) and optionally `indice-tokens/tokens.css` for shared primitives. The library styles include the source design's fallback values and embed the unchanged original SVGs; no runtime Figma requests or additional asset-copy step is needed.

## Inputs

| Input | Default | Values |
| --- | --- | --- |
| `variant` | `primary-filled` | `primary-filled`, `secondary-outline`, `primary-clear`, `secondary-filled`, `secondary-clear`, `delete-clear`, `delete-outline` |
| `disabled` | `false` | Boolean; sets native disabled behavior |
| `showLeftIcon` | `true` | Boolean; original circle-plus icon |
| `showRightIcon` | `true` | Boolean; original circle-plus icon |
| `leftIcon` | `''` | Custom leading SVG URL or data URL; empty keeps the original. Uses project icon colours. |
| `rightIcon` | `''` | Custom trailing SVG URL or data URL; empty keeps the original. Uses project icon colours. |
| `type` | `button` | `button`, `submit`, `reset` |

`BUTTON_VARIANTS` and the `ButtonVariant` type are exported. Labels use Angular content projection. Use native `(click)`, `aria-label` and form behavior as usual.

The catalogue's icon pickers embed selected SVGs as data URLs in copied code, so no additional icon files or packages are needed in the consuming app. Custom icons are CSS masks; their original fill/stroke colours do not override the project's icon colours.

`IndiceField` also accepts `actionIcon` and `infoIcon` SVG URLs/data URLs, defaulting to `''` for the original eye and information assets. `showIcon` and `info` still control visibility. Set a meaningful `actionLabel` for custom non-password actions and handle `iconClick` in your app. Password fields retain their Show/Hide password labels and visibility toggle, even with a custom action icon. Custom field masks use the project's default icon colour and disabled colour.

## Source And Fidelity

[Figma Fill Button, node 2038:786](https://www.figma.com/design/9kubN4VqWMZ6nLyb1RMhWM/INDICE-IAM-%7C-Design-System?node-id=2038-786)

- Scope: Black / Light mode, seven variants and four states each. No other sizes or themes are inferred.
- The outlined primary button is labelled **Primary / Outline** in the catalogue and playground. Its existing `secondary-outline` API identifier is retained for compatibility; it uses primary colour roles. `secondary-filled` and `secondary-clear` use secondary colour roles.
- Geologica Regular, 16px text, 24px line height, 8px/16px padding, 8px gap, 12px radius and 18px icons.
- Height is 40px for a single line. Width remains content-sized; browser font metrics can differ fractionally from Figma's 138px example.
- Figma active maps to default; inactive maps to native disabled. Hover and pressed use CSS pseudo-classes.
- A keyboard-only focus ring is an accessibility addition, pending design approval; no focus state was supplied in Figma.
- Exact Figma semantic CSS names override matching primitive fallbacks. This does not create or modify the canonical primitive-token export.
- Twenty-four SVGs were downloaded unchanged through Figma MCP. They include separate left/right assets and the intentionally darker default delete icon colour.
- `data-preview-state` is an internal catalogue hook for deterministic state inspection, not an application input.

## Icon Buttons

[Figma Icon Button, node 2307:507](https://www.figma.com/design/9kubN4VqWMZ6nLyb1RMhWM/INDICE-IAM-%7C-Design-System?node-id=2307-507)

Import `IndiceIconButton` from `indice-ui` and add it to the consuming component's `imports` array.

```html
<button indiceIconButton label="Add item" variant="black-filled" size="small" (click)="add()"></button>
<button indiceIconButton label="Open administration" variant="teal-filled" size="xx-large" caption="Admin"></button>
```

| Input | Default | Values |
| --- | --- | --- |
| `label` | Required | Accessible action name and native tooltip |
| `variant` | `black-filled` | `black-filled`, `teal-filled`, `black-outline`, `grey-fill` |
| `size` | `small` | `small`, `medium`, `large`, `xx-large` |
| `caption` | `Admin` | Visible only on `xx-large`; capped visually at two lines |
| `disabled` | `false` | Native disabled behavior |
| `type` | `button` | `button`, `submit`, `reset` |

`ICON_BUTTON_VARIANTS`, `ICON_BUTTON_SIZES`, `IconButtonVariant` and `IconButtonSize` are exported.
The provided circle-plus icon is fixed to the exact Figma asset; no other glyphs are inferred.

| Size | Button | Icon | Radius |
| --- | --- | --- | --- |
| small | 32px | 14px | 8px |
| medium | 40px | 16px | 12px |
| large | 48px | 20px | 12px |
| xx-large | 104px | 32px | 12px |

- Scope: four variants, four sizes and default/hover/pressed/inactive states (64 combinations), in Black / Light mode.
- Captions use Geologica Light, weight 300, 16px/24px. Load `@fontsource/geologica/300.css` or an equivalent font in the consuming app.
- Filled xx-large variants use a 2px caption gap; enabled outline and grey-fill variants use 8px. Disabled variants use 2px.
- Disabled outline buttons intentionally become filled grey with no outline, unlike the existing text buttons.
- The xx-large pressed black outline intentionally retains the default border colour while its icon/text use the pressed colour.
- Twenty-four original SVGs are bundled unchanged; they preserve their 14/16/20/32px root geometry.
- Accessible action labels and native tooltips are mandatory through the required `label` input. The keyboard-only focus ring follows the existing button addition, pending design approval.
- Long captions are truncated at two lines to preserve the designed square geometry; supply the full action in `label`.
- Components > Icon Buttons has the searchable 64-state board and a live Angular playground.

## Social Media Buttons

[Figma Social Media Button, node 2284:102](https://www.figma.com/design/9kubN4VqWMZ6nLyb1RMhWM/INDICE-IAM-%7C-Design-System?node-id=2284-102)

Import `IndiceSocialButton` from `indice-ui` and add it to your component's `imports` array.

```html
<button indiceSocialButton provider="google" (click)="signInWithGoogle()"></button>
```

| Input | Default | Values |
| --- | --- | --- |
| `provider` | `windows` | `windows`, `google`, `facebook`, `apple` |
| `disabled` | `false` | Native disabled behavior; no new disabled visual state is inferred |
| `type` | `button` | `button`, `submit`, `reset` |

`SOCIAL_BUTTON_PROVIDERS` and `SocialButtonProvider` are exported. `windows` preserves Figma's identifier for Microsoft. Labels are the original design strings: Sign in with Microsoft, Sign in with Google, Login with Facebook, Sign in with Apple.

- Four providers, each with Default, Hover and Focus previews (12 combinations).
- Width 254px, height 40px, radius 4px, gap 10px and 12px horizontal padding. Width may shrink to fit smaller containers.
- Typography intentionally uses Segoe UI Regular, 15px/16px, as supplied in Figma. On platforms without Segoe UI, the browser uses its sans-serif fallback; the font is not redistributed.
- Four original SVG logos are embedded unchanged: Microsoft 21px; Google, Facebook and Apple approximately 20px.
- Keyboard focus uses the supplied strong border and title colour, overriding hover. Windows high-contrast mode adds an explicit system-colour outline.
- Native disabled behavior is available, but Figma supplies no disabled appearance, so the component retains its default appearance.
- These are presentation components only. Authentication, OAuth configuration, redirects, permissions and provider-policy compliance belong to the consuming application.
- Components > Social Media contains provider search, state previews, keyboard tabs, a live playground and Angular markup.

## Input Field

[Figma Input Field, node 2029:31](https://www.figma.com/design/9kubN4VqWMZ6nLyb1RMhWM/INDICE-IAM-%7C-Design-System?node-id=2029-31)

Import `IndiceField` from `indice-ui`. The package requires matching Angular Forms peer dependencies. Import `ReactiveFormsModule` for reactive forms or `FormsModule` for `ngModel`. Load Geologica Regular and Light (400 and 300) in the consuming app.

```ts
import { IndiceField } from 'indice-ui';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

// In your standalone component: imports: [IndiceField, ReactiveFormsModule]
email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
```

```html
<indice-field label="Email" type="email" [formControl]="email" [required]="true" autocomplete="email" [error]="email.touched && email.invalid ? 'Enter a valid email address.' : ''" />
```

For simple state, use `[(value)]="value"` instead of a forms directive. Do not combine `value` bindings and `formControl`/`ngModel` on the same instance. Validators and when to show errors belong to the consuming form.

| Input | Default | Meaning |
| --- | --- | --- |
| `label` | Required | Visible label and accessible fallback when hidden |
| `value` | Empty string | Two-way string model; CVA handles form bindings |
| `inputId` | Unique generated ID | ID of the native input and its associated label |
| `layout` | `vertical` | `vertical` or `horizontal` |
| `type` | `text` | `text`, `email`, `password`, `tel`, `url`, `search` |
| `placeholder` | `Input field text default` | Placeholder text |
| `required` | `false` | Native required attribute and visual star; suppressed in read-only mode |
| `disabled` | `false` | Native disabled state; form disable also works |
| `readOnly` | `false` | Copyable native read-only control with view styling |
| `showLabel` / `showIcon` | `true` | Label and trailing action visibility |
| `info` | Empty string | Information icon, native tooltip and accessible description |
| `invalid` | `false` | Error border and `aria-invalid`, without requiring a message |
| `error` | Empty string | Error border, message and associated description |
| `showErrorMessage` | `true` | Toggle visible error feedback |
| `actionLabel` | `View value` | Accessible label for the trailing action on non-password fields |
| `name` / `maxLength` | `null` | Native input attributes |
| `autocomplete` | `off` | Native autocomplete hint; configure for actual field purpose |

`iconClick` emits when the trailing action is activated. Password fields toggle visibility and expose `aria-pressed`; other types emit the event for the consuming app to handle. Read-only horizontal fields omit the eye action, as designed. `FieldLayout` and `FieldType` are exported.

- Eleven supplied examples: eight vertical (including the view and two error variants), two editable horizontal, one horizontal view. The catalogue does not invent additional Figma variants.
- Desktop width 553px; controls are 48px high. Vertical label/control examples total 76px, with error text 102px. Horizontal view is 44px high.
- Label: Geologica Regular 14px/20px; input: Light 16px/24px; error helper: Regular 12px/18px.
- Padding 12px/16px, radius 8px, normal border 1px, focus border 2px. Inset borders prevent layout shifts.
- Read-only vertical has a top rule; horizontal view has a bottom rule and right-aligned value.
- Horizontal editable layouts stack below a 480px component container width. Read-only horizontal remains a two-column value row.
- Original 16px information and two 20px eye SVGs are bundled unchanged. Visibility changes retain the supplied eye glyph.
- Labels, required semantics, disabled and read-only attributes, error IDs and accessible descriptions are linked to the real input. Keyboard-only focus for the read-only horizontal value and icon controls is an accessibility addition where no Figma focus state was supplied.
- Supply meaningful `info` and action labels. The catalogue's `Field information` string is placeholder content, not a final tooltip specification.
- Components > Fields > Input Field includes a searchable state board and a reactive-forms playground with validation and reset.

## Verify

From the workspace root:

```sh
npx ng test indice-ui --watch=false
npm run build
```

The package is generated in `dist/indice-ui`. Components > Buttons contains the state board, variant search, keyboard-operable views, live playground and copyable Angular markup.
