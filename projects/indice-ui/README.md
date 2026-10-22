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
| `type` | `button` | `button`, `submit`, `reset` |

`BUTTON_VARIANTS` and the `ButtonVariant` type are exported. Labels use Angular content projection. Use native `(click)`, `aria-label` and form behavior as usual.

## Source And Fidelity

[Figma Fill Button, node 2038:786](https://www.figma.com/design/9kubN4VqWMZ6nLyb1RMhWM/INDICE-IAM-%7C-Design-System?node-id=2038-786)

- Scope: Black / Light mode, seven variants and four states each. No other sizes or themes are inferred.
- Figma names are preserved: `secondary-outline` is black, while `secondary-filled` and `secondary-clear` are teal.
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

## Verify

From the workspace root:

```sh
npx ng test indice-ui --watch=false
npm run build
```

The package is generated in `dist/indice-ui`. Components > Buttons contains the state board, variant search, keyboard-operable views, live playground and copyable Angular markup.
