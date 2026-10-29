# Catalogue functionality specification

This is the agreed behavior for the public demo. Update this document and the
related regression tests when changing these rules.

## Project actions and permissions

**Universal project-action requirement:** Edit and Delete must be supported for
every existing project and every project added in the future, including IAM,
Novio, Evpulse, bundled projects, local drafts and shared Supabase projects.
There are no project-name, built-in-status or storage-source exemptions.
New projects must receive these actions automatically, without per-project code.
The role permissions below still determine who can use each action.

| Action | Built-in IAM | Local draft | Shared Supabase project |
|---|---|---|---|
| View/select | Both roles | Both roles, same browser | Both roles, all visitors |
| Edit | Designer, saves publicly | Designer, browser-local changes | Designer, saves publicly |
| Publish | First Save publishes; later saves update | Both roles | Already public; not offered |
| Delete | Both roles once shared; Designer for bundled fallback | Designer, with confirmation | Both roles, with confirmation |

Both roles can create and publish a new project.

Designer and Developer are simulated UI roles, not authentication. Any visitor
can switch to Designer. Supabase allows anonymous creation, updates and deletion.
These permissions are intentionally unsuitable for production.

### Editing acceptance checks

- Every project row has Edit in Designer mode, including Evpulse and other
  shared projects. Developer mode has no Edit action and cannot submit edits.
- The same checks apply to every existing project and a newly added project;
  no project-specific implementation is required.
- Edit pre-fills project details, token filename/data, icon library and images.
- IAM's first successful Save publishes its existing local details, tokens and
  images to Supabase. Subsequent saves update that public record. Existing local
  assets are kept until publication succeeds; no automatic upload occurs on load.
- Shared IAM replaces the bundled IAM in the project list, preserving the
  catalogue identity `iam` and selection without duplicate rows. Supabase uses a
  stable UUID internally. Bundled demo data must not override shared assets.
- A fresh browser with the current app loads the shared IAM record and images.
- Existing tokens can be retained; selecting a valid replacement updates the
  filename, token count, palette and component theme after saving.
- Shared updates retain the project ID and creation timestamp, and are visible
  to other visitors and after reload. They are not stored as local drafts.
- Unchanged shared images retain their URLs. Replacements upload as new assets;
  removed/replaced assets are cleaned up only after the database confirms saving.
- Save is disabled while reading files or saving. Failed database saves keep the
  form open, preserve entered values and show an error without claiming success.
- A successful save with failed image cleanup shows a warning that distinguishes
  the saved project from leftover images.
- Cancel without saving leaves the project unchanged. Concurrent edits use the
  last successful save; there is no version history or conflict resolution.

## Required data and uploads

- A unique, nonempty project name (maximum 80 characters) and a valid token JSON
  containing at least one token value are required for creating or saving.
- Token files must have a `.json` extension and be at most 1 MB.
- Invalid replacement tokens block saving; the previous saved project is unchanged.
- Customer, description, logos, thumbnail, Figma link and reference images are
  optional. Platform and theme support have defaults.
- Figma links, when supplied, must use HTTPS on figma.com or its subdomains.
- Images are PNG, JPEG or WebP, up to 1 MB each, with at most three references.
- Token JSON is stored with project data in the database, not as a Storage file.
  Storage holds uploaded images.

## Palette and preview behavior

- The Colours page displays primitive colors under `Primitive/Indice`, not every
  color-valued semantic token. Metadata and placeholder `-` branches are excluded.
- Group order for all existing and future projects is main global, primary,
  secondary, neutral, accent; then function
  success, warning, info, magic, error. Opacity follows its parent palette.
- Shades use numeric-aware ordering. Additional color groups remain visible in
  name order after known groups. JSON key ordering does not affect display.
- Token values are preserved; sorting does not add, remove or recolor tokens.
- The three supplied IAM, Novio and Evpulse exports each have 138 primitive
  colors in 13 groups. Total document token counts may differ independently.
- Search can reduce visible colors and groups and remains active on project
  switches. Compare full palettes with an empty search.
- Selected-project semantic roles theme component previews; missing roles produce
  upload warnings and use IAM defaults. The workspace chrome always uses IAM.
- Files with no usable primitive token list currently fall back to bundled
  primitives; accepting a JSON file does not imply support for every token schema.

## Deletion and demo delivery

- Delete requires confirmation for every project, including IAM.
- Every project row offers Delete under the role permissions above, including
  projects added later. Built-in status must not disable deletion.
- Browser-local removal of a bundled project, including IAM, must survive reload
  rather than silently restoring the project.
- Shared deletion removes the public record for everyone and attempts image
  cleanup. Failures are shown; cleanup warnings do not claim the record remains.
- Local deletion affects this browser only. Deleting the selected project selects
  another available project. If none remain, show an empty-project state with an
  Add project action rather than restoring a deleted project.
- There is no Export demo data action.
- Local code changes require separate commits and pushes to reach remote
  repositories; a commit alone does not publish to GitHub or Azure DevOps.

## Verification

Remaining deletion gap: the app still protects the unpublished bundled IAM from
deletion and restores that fallback if the shared IAM record is absent. Shared
IAM itself has the usual public Delete action. Fully persistent removal of the
bundled fallback is not implemented; the universal requirement still applies.

Automated catalogue tests cover role/action visibility, edit/save routing,
validation, persistence boundaries and deterministic palette ordering. Supabase
service tests cover update requests, asset retention/replacement and failures.

Run `npx ng test catalogue --watch=false` and `npx ng build catalogue`.
After applying [Supabase setup](supabase/setup.sql), manually verify a disposable
public project's edit, reload, token replacement and deletion across browsers.
Do not use the real project for destructive acceptance checks.

The GitHub Pages website must be redeployed with the current Supabase-enabled
code before it can load shared projects. Editing data in Supabase does not update
an older website build. The deployment workflow runs on pushes to GitHub `main`;
a local commit or a push only to Azure DevOps does not deploy GitHub Pages.
