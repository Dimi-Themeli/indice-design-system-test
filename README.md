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
- `projects/indice-ui`: reusable Angular text, icon and social-media buttons, and form fields.
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

Components > Social Media adds Microsoft, Google, Facebook and Apple buttons with 12 state previews. Import `IndiceSocialButton` from `indice-ui`. Authentication is deliberately left to the consuming app.

```html
<button indiceSocialButton provider="google" (click)="signInWithGoogle()"></button>
```

## Fields

Components > Fields > Input Field contains the eleven supplied Figma variants and a live form playground. Import `IndiceField` from `indice-ui`; use `ReactiveFormsModule` with `[formControl]`, `FormsModule` with `ngModel`, or a standalone `[(value)]` binding.

```html
<indice-field label="Email" type="email" [formControl]="emailControl" [required]="true" [error]="emailError" />
```

Load Geologica 300 and 400 in the consuming app. See `projects/indice-ui/README.md` for the full API, validation ownership and accessibility behavior.

## Roadmap

- [ ] Designer and engineering approval workflow. Deferred; no approval states or review tooling are implemented yet.
- [ ] Private npm registry publishing and automated releases. Current delivery uses local package archives, not a published registry package.

## Demo Projects

The ribbon switches between simulated Designer and Developer roles; this is not authentication or server-side authorization. Designers can open **Add project** as a full page and **Manage projects** through the adjacent folder icon. **Change project** also links to management; Developers get a read-only view.

Only a project name and a valid token JSON file are required. Customer, description, Figma link and reference images are optional; platform and light/dark support have defaults. JSON files may use nested `$value`/`value` tokens or a plain token object (up to 1 MB). References accept up to three PNG/JPEG/WebP images, each up to 1 MB.

Projects, imported token data, reference images and the current selection are saved to this browser's local storage under `indice-demo-projects-v1`. Storage failures are reported without discarding the existing project list. Deletion requires confirmation, removes the stored project copy, and selects another project or the base library if the active project is deleted. An empty project list remains empty after reload.

New projects are **Drafts**. Token imports are validated and stored, not automatically mapped into component styling or published as packages. Project selection changes catalogue context; the shared component implementation and current base styling remain unchanged. A project contains the customer context and references; its **theme** is the styling configuration, including light/dark modes.

## Developer Handoff

Every implemented component page uses bordered radio cards to select a variant before enabling **Use It**. Selection stays synchronized with the Playground. Use It opens on **Code**, with the complete standalone Angular component first and a copy action. Template, imports and form state remain available as read-only references. The header includes a copyable CSS selector, not unsupported internal class names. **Setup**, **API** and **Accessibility** are secondary views.

For an application that already has the design system installed, copy the standalone example or use its template, imports and form state as references for an existing page. Field presets preserve layout, read-only/disabled state, example values and error presentation. Generated reactive forms include validators and touched-state error messages; values typed into the Playground are intentionally excluded.

**Configuration JSON** is an editable demo configuration for the selected component's inputs. **Apply JSON** validates property names, types and supported options before regenerating the Angular example; errors preserve the last valid example. **Reset** or reopening the modal restores the selected catalogue configuration. JSON edits are local to the modal and are not saved to projects. Explicit `initialValue` entries in JSON are exported. This is not a runtime JSON form renderer, and applications do not need to load this JSON to use the generated Angular code.

`npm start` and `npm run build` package both libraries into `projects/catalogue/public/packages`. The static catalogue includes these archives and a generated manifest with versions and integrity hashes. Downloads are local versioned npm archives; nothing is published to a registry by these commands.

Package installation is a one-time project setup, not a step for each component. For a new consuming application only, download both archives into the project's root and use the command and global style imports in **Setup**. Angular peer versions are shown there. Original icon assets are bundled in the UI package. Social buttons provide presentation only; application actions and authentication remain the consuming application's responsibility.

```sh
npm run build
npm run delivery:check
```

The delivery check installs the actual archives into an isolated generated consumer under `.angular/cache`, using the configured npm registry, then strictly compiles twelve generated Angular examples against those installed packages. It verifies all four component families, including configured, read-only, prefilled and error Field examples, plus JSON-generated examples for every component family. It does not publish packages or change registry credentials.
