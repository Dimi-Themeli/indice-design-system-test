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
- Catalogue colour palettes use a fixed group order across bundled, local and Supabase projects: main global, primary, secondary, neutral, accent, then function success, warning, info, magic and error. Opacity groups follow their parent palette; shades use numeric-aware ordering. Additional colour groups remain visible after the known groups in name order. JSON object-key order does not affect the palette.
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

The welcome modal does not open automatically during development. Its two-step
flow is retained for restoration when the demo is ready. The app opens directly
to the library; use the workspace role switch and project dropdown as usual.

Demo pages have hash URLs, such as `#/manage-projects`, `#/add-project`,
`#/colours` and `#/components/buttons`. Refresh and browser Back/Forward retain
the current page, including on GitHub Pages. Edit pages use `#/projects/:id/edit`;
after refresh, switch to Designer mode to edit. Unsaved form/playground values
are not restored. See the functionality spec for the complete page list.

See [the functionality specification](FUNCTIONALITY-SPEC.md) for the agreed
project actions, demo permissions, upload rules and palette acceptance checks.
Supabase projects can be edited in Designer mode and deleted in either role;
apply [the updated setup script](supabase/setup.sql) to enable public updates.

Each playground icon picker has its own enable checkbox below the icon choices. Unchecking it hides the preview icon and disables the picker without clearing its selection; rechecking restores the selected icon. Other playground checkboxes follow the icon pickers.

The **Source JSON** download is immediately to the right of the project dropdown for both demo roles and continues to download the original IAM primitive-token file. **Icons libraries** at the bottom of the sidebar uses the same heading style as Foundations and Components and opens a searchable library list using the Manage projects layout. Lucide is the first built-in library; Open shows the locally bundled starter collection and a link to the full catalogue. The existing `lucide` dependency supplies the SVGs without runtime requests.

Lucide, Tabler Icons and Bootstrap Icons are available in the project selector. Each library row shows **Used in x projects**, counted from the current project list (including IAM and bundled demo projects); projects without an explicit library count as Lucide. Counts update when projects are added, edited or deleted. Tabler and Bootstrap each include six starter SVGs copied from their npm packages at build time, together with their MIT license files. Their Open pages link to the full catalogues; the full icon sets are not shipped.

Add/Edit project sections are **Project details** (thumbnail background uploader last), **Brand assets** (dark/light logos), **Design resources** (Token JSON and Icon library), then **Design references**. The selected `iconLibraryId` is saved with the project in browser storage and demo exports; older projects without this field use Lucide when edited. Streamline is not bundled: adding it requires appropriately licensed assets or an official integration, not scraping its catalogue URL.

Button and field playgrounds offer searchable, visual icon pickers from the current project's library (six starter icons per library). Buttons have independent left/right pickers; fields have action and information pickers plus an accessible action-label input. **Original** restores the Figma icon; existing visibility toggles hide icons. Library changes reset custom selections to the originals. Custom icons use project colour tokens and are included as self-contained SVG data URLs in copied Angular markup, complete examples and editable Use It JSON. Password visibility, field validation and disabled controls preserve their existing behaviour. If loading an icon fails, the picker reports an error and keeps the previous selection.

The ribbon switches between simulated Designer and Developer roles; this is not authentication or server-side authorization. Designers can open **Add project** as a full page and **Manage projects** through the adjacent folder icon.

Only a project name and a valid token JSON file are required. Customer, description, Figma link and reference images are optional; platform and light/dark support have defaults. JSON files may use nested `$value`/`value` tokens or a plain token object (up to 1 MB). References accept up to three PNG/JPEG/WebP images, each up to 1 MB.

New projects are published to Supabase: details and token JSON go in `public.projects`, and images go in Storage. Shared projects are visible to every visitor. IAM's first successful **Save changes** publishes its current tokens and assets, including previously browser-local edits; later saves update the shared IAM record. Local drafts and the current selection use local storage under `indice-demo-projects-v1`; these remain specific to the browser and site address. A local draft's **Publish** action shares it through Supabase. There is no Export demo data action. The optional bundled `demo-projects.json` is still loaded; browser-local edits/deletions of bundled projects are not overwritten by it, and shared projects take precedence over bundled data.

**IAM**, the original Indice design system (`tokens-IAM-20261022-01.json`), is built in and listed first. Its shared record supports public deletion, but the bundled fallback is still protected and returns if that record is absent; persistent removal of this fallback remains an implementation gap in the functionality spec. Each theme logo accepts one PNG, JPEG or WebP image up to 1 MB; the light logo is used on project cards in welcome step 02 and Manage projects. An optional thumbnail background uses the same limits and displays the dark-theme logo in front (or the light logo if no dark logo exists).

Selecting a project applies its primitive color palette and `Semantic/Default - Light Mode` color roles to component previews, including icons (`colours.icons.*`). Equivalent role names are matched automatically (for example `border.element-primary-default` and `border.element-primary-active`, or `text.error` and `text.element-error-default`). Add/Edit lists missing component colour roles that use IAM defaults. The project's `font.family.body`, `font.family.title` and `font.weight.*` tokens also apply. Only Manrope and Geologica are bundled; other families must be installed on the viewer's device. Foundations pages list the project's `Primitive/Indice` tokens, falling back to bundled primitives when the file has none. Workspace chrome always keeps the IAM palette and Manrope.

Welcome has two steps: choose a role, then a project. Projects can also be switched from the header dropdown. Welcome and Manage projects list the same projects. In Designer mode, every project has a pencil button opening the same fields as Add project. Existing tokens and images are retained unless replaced or removed. Local draft edits save in this browser; IAM and shared edits save publicly in Supabase. Failed saves preserve the form and show an error. Shared deletion is available in both roles; local deletion is Designer-only. Deletion requires confirmation and selects another available project if the active project is removed.

New projects are published as **Public** projects; legacy local projects remain **Drafts** until published. Imported token color values are applied to the shared component previews when their project is selected; package publishing and a dark-mode workspace switch are not implemented. A project contains the customer context and references; its **theme** is the styling configuration, including light/dark modes.

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
