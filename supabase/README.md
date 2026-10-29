# Supabase project sharing

The catalogue uses a public Supabase Storage bucket for project images and a
`public.projects` table for project details and token JSON.

## Setup

1. Create a public Storage bucket named `design-system-bucket`.
2. In the Supabase Dashboard, open **SQL Editor**, paste in `setup.sql`, and run it.
   If you already ran an earlier version of this setup, run the updated script
   again to install the public-project editing/deletion policies and Storage
   read policy required for image cleanup.
   The script configures public reads, 1 MB image limits, accepted image types,
   table access policies, and anonymous upload/edit/deletion policies.
3. Start the catalogue with `npm start`. The browser-safe project URL and
   publishable key are configured in
   `projects/catalogue/src/app/supabase.config.ts`.

The publishable key is intentionally used in the browser; it is not a database
password. Do not put a `service_role` or secret key in this application.

Anyone can read, submit, edit, and delete projects without signing in. The UI
shows Edit only in Designer mode, but the role switch is not authentication:
any visitor can switch roles, and the API permits anonymous updates. This is
deliberately permissive for a demo: any visitor can change or permanently delete any
public project and its uploaded images. Anonymous submissions and uploads can
also be abused or spammed. Do not use these open policies for production; add
authentication, authorization, moderation, and rate-limiting first.

Shared edits retain unchanged image URLs, upload replacement images, and remove
superseded images only after the database confirms the update. A failed save keeps
the form open with an error; image-cleanup failures after a successful save are
shown as warnings. Local drafts continue to save only in the current browser.

IAM is initially bundled. Its first successful Save in Designer mode publishes
the current details, tokens, logos and thumbnail to Supabase, including assets
previously saved only in this browser. Later edits update the shared record.
The stable database UUID is mapped to the catalogue's `iam` ID so other visitors
see one IAM project, not a duplicate. Failed publication keeps the local version.
No new SQL migration is required beyond the current setup script.

For cross-browser verification, use the same up-to-date app. GitHub Pages must
be deployed from the Supabase-enabled code; local changes or Azure-only pushes
do not update it. After deployment, project data changes are shared without a
new website build. Refresh an already-open page to load newly shared projects.

See [the functionality spec](../FUNCTIONALITY-SPEC.md) for the agreed behavior and
acceptance checks.
