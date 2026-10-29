do $$
begin
  if not exists (select 1 from storage.buckets where id = 'design-system-bucket') then
    raise exception 'Create the design-system-bucket Storage bucket before running this setup.';
  end if;
end
$$;

update storage.buckets
set public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'design-system-bucket';

create or replace function public.project_asset_keys_match_id(project_id uuid, asset_keys text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(asset_key ~* ('^' || project_id::text || '/[a-z0-9-]+-[0-9a-f-]{36}\.(png|jpg|webp)$')), true)
  from unnest(asset_keys) as assets(asset_key)
$$;

create table if not exists public.projects (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  customer text not null default '' check (char_length(customer) <= 100),
  description text not null default '' check (char_length(description) <= 500),
  modes text not null check (modes in ('Light', 'Dark', 'Light & dark')),
  platform text not null check (platform in ('Desktop app', 'Mobile app', 'Desktop & mobile')),
  figma_url text not null default '' check (
    figma_url = '' or figma_url ~* '^https://([a-z0-9-]+\.)*figma\.com(/|$)'
  ),
  logo_dark_key text,
  logo_light_key text,
  thumbnail_key text,
  icon_library_id text not null check (icon_library_id in ('lucide', 'tabler', 'bootstrap')),
  image_keys text[] not null default '{}',
  token_file_name text not null default '' check (char_length(token_file_name) <= 255),
  tokens jsonb not null check (
    jsonb_typeof(tokens) = 'object'
    and octet_length(tokens::text) <= 1048576
  ),
  token_count integer not null check (token_count >= 0),
  created_at timestamptz not null default now(),
  constraint project_asset_keys_match check (
    public.project_asset_keys_match_id(
      id,
      array_remove(array[logo_dark_key, logo_light_key, thumbnail_key] || image_keys, null)
    )
    and cardinality(image_keys) <= 3
  )
);

create unique index if not exists projects_name_case_insensitive_key
on public.projects (lower(name));

alter table public.projects
drop constraint if exists project_token_file_required;
alter table public.projects
add constraint project_token_file_required
check (char_length(btrim(token_file_name)) between 1 and 255) not valid;

alter table public.projects
drop constraint if exists project_token_count_positive;
alter table public.projects
add constraint project_token_count_positive
check (token_count > 0) not valid;

alter table public.projects enable row level security;
grant select, insert on public.projects to anon, authenticated;
grant delete on public.projects to anon, authenticated;
grant update (
  name, customer, description, modes, platform, figma_url,
  logo_dark_key, logo_light_key, thumbnail_key, icon_library_id,
  image_keys, token_file_name, tokens, token_count
) on public.projects to anon, authenticated;

drop policy if exists "Anyone can read public projects" on public.projects;
create policy "Anyone can read public projects"
on public.projects for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can submit public projects" on public.projects;
create policy "Anyone can submit public projects"
on public.projects for insert
to anon, authenticated
with check (true);

drop policy if exists "Anyone can edit public projects" on public.projects;
create policy "Anyone can edit public projects"
on public.projects for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Anyone can delete public projects" on public.projects;
create policy "Anyone can delete public projects"
on public.projects for delete
to anon, authenticated
using (true);

drop policy if exists "Anyone can upload project images" on storage.objects;
create policy "Anyone can upload project images"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'design-system-bucket'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9-]+-[0-9a-f-]{36}\.(png|jpg|webp)$'
);

grant select, delete on storage.objects to anon, authenticated;
drop policy if exists "Anyone can read project image records" on storage.objects;
create policy "Anyone can read project image records"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'design-system-bucket'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9-]+-[0-9a-f-]{36}\.(png|jpg|webp)$'
);

drop policy if exists "Anyone can delete project images" on storage.objects;
create policy "Anyone can delete project images"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'design-system-bucket'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z0-9-]+-[0-9a-f-]{36}\.(png|jpg|webp)$'
);
