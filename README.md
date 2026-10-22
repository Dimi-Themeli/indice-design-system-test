# Indice Design System

Angular 22 workspace with a reusable token library and a searchable Foundations catalogue.
Requires Node.js 24.15 or later in the Node 24 release line and npm.

## Run

```sh
npm ci
npm start
```

Open http://127.0.0.1:4200. If occupied, use `npm start -- --port 4201`.

## Projects

- `projects/indice-tokens`: typed token data and generated CSS custom properties.
- `projects/indice-ui`: reusable native Angular text and icon buttons.
- `projects/catalogue`: colour, typography, spacing, border and container previews; global search, copy modes and source download.
- `tokens/primitive.json`: canonical workspace copy of the Figma export.
- `tools/generate-tokens.mjs`: deterministic generation and import.

## Update Tokens

Edit the canonical JSON, or import a fresh export:

```sh
node tools/generate-tokens.mjs "--import=C:\path\to\figma-export.json"
npm test
npm run build
```

Import removes only `Primitive/Indice.colours.main.-`; the supplied export is never modified.
After editing JSON while the server is running, run `npm run tokens:generate` to update previews.
Do not manually edit generated CSS or TypeScript files. `npm run tokens:check` detects stale output.

## Mapping Contract

- Paths become `--indice-` custom properties, with dots replaced by hyphens.
- Hex colours, including alpha, are preserved exactly.
- Number primitives represent dimensions in this export and become pixels.
- Font families are quoted; Light through ExtraBold map to weights 300 through 800.
- `border.radius.full` preserves the Figma value of 10000000000px.
- Figma publishing flags are metadata, not filters: hidden primitives remain available to code.
- Container values are widths, not inferred responsive breakpoints; their previews are proportional.
- Font sizes, line heights, semantic roles and components are intentionally not invented.

## Verify And Build

```sh
npm test
npm run build
```

Build output: `dist/indice-tokens` and `dist/indice-ui` (packages), and `dist/catalogue/browser` (static app).
The catalogue shell is provisional, not an approved component design.

The initial Angular 22.2.3 toolchain reports two development-only audit findings through Vite (one low, one high); production dependencies audit clean. The suggested npm fix downgrades Angular build tooling and is not applied. Keep the development server local and recheck when Angular publishes a patched toolchain.

## Consume The Library

Install the built package in an Angular project, then import `indice-tokens/tokens.css` into global styles.

```ts
import { TOKENS, type DesignToken } from 'indice-tokens';
```

```css
.example { gap: var(--indice-space-8); }
```

## Buttons

Open Components > Buttons for 28 Figma state previews and an interactive Angular playground.
Import `IndiceButton` from `indice-ui` in a standalone Angular component's `imports` array.

```html
<button indiceButton variant="primary-filled" (click)="save()">Save</button>
```

Load Geologica Regular in the consuming app and the token stylesheet for shared primitives.
See `projects/indice-ui/README.md` for the supported variants, source design and API.

Components > Icon Buttons adds four variants, four sizes and 64 state previews. Import `IndiceIconButton` from `indice-ui`; every instance requires a `label` for its accessible name and tooltip.

```html
<button indiceIconButton label="Add item" variant="black-filled" size="small" (click)="add()"></button>
```
