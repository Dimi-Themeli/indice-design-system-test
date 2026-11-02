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
  templates jsonb not null default '[]'::jsonb check (
    jsonb_typeof(templates) = 'array' and octet_length(templates::text) <= 65536
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

alter table public.projects add column if not exists templates jsonb not null default '[]'::jsonb
check (jsonb_typeof(templates) = 'array' and octet_length(templates::text) <= 65536);

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
  name, customer, description, modes, platform, figma_url, templates,
  logo_dark_key, logo_light_key, thumbnail_key, icon_library_id,
  image_keys, token_file_name, tokens, token_count
) on public.projects to anon, authenticated;

create table if not exists public.token_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$' and char_length(version) <= 40),
  status text not null default 'Draft' check (status in ('Draft', 'In review', 'Ready', 'Deprecated')),
  change_note text not null default '' check (char_length(change_note) <= 1000),
  token_file_name text not null check (char_length(btrim(token_file_name)) between 1 and 255),
  tokens jsonb not null check (jsonb_typeof(tokens) = 'object' and octet_length(tokens::text) <= 1048576),
  token_count integer not null check (token_count > 0),
  created_at timestamptz not null default now(),
  unique(project_id, version),
  unique(project_id, id)
);

alter table public.projects add column if not exists token_revision_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_current_revision_fk'
    and conrelid = 'public.projects'::regclass) then
    alter table public.projects add constraint projects_current_revision_fk
      foreign key (id, token_revision_id) references public.token_revisions(project_id, id)
      deferrable initially deferred;
  end if;
end
$$;

-- Seed only the saved file; previously overwritten uploads cannot be recovered.
insert into public.token_revisions(project_id, version, status, change_note, token_file_name, tokens, token_count)
select id, '1.0.0', 'Ready', 'Initial saved token file', token_file_name, tokens, token_count
from public.projects where token_count > 0 and btrim(token_file_name) <> ''
on conflict (project_id, version) do nothing;
update public.projects p set token_revision_id = r.id
from public.token_revisions r
where r.project_id = p.id and r.version = '1.0.0' and p.token_revision_id is null;

create or replace function public.initialize_token_revision()
returns trigger language plpgsql security definer set search_path = public
as $$
declare revision_id uuid;
begin
  insert into public.token_revisions(project_id, version, status, change_note, token_file_name, tokens, token_count)
  values (new.id, '1.0.0', 'Ready', 'Initial saved token file', new.token_file_name, new.tokens, new.token_count)
  returning id into revision_id;
  update public.projects set token_revision_id = revision_id where id = new.id;
  return new;
end
$$;
drop trigger if exists initialize_token_revision on public.projects;
create trigger initialize_token_revision after insert on public.projects
for each row execute function public.initialize_token_revision();

create or replace function public.guard_current_token_revision()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.token_revision_id is not null and not exists (
    select 1 from public.token_revisions r where r.project_id = new.id and r.id = new.token_revision_id
      and r.tokens = new.tokens and r.token_file_name = new.token_file_name and r.token_count = new.token_count
  ) then
    raise exception 'Manage token changes from the Tokens page by selecting a saved revision.';
  end if;
  if old.token_revision_id is not null and new.token_revision_id is null then
    raise exception 'The current token revision cannot be cleared.';
  end if;
  return new;
end
$$;
drop trigger if exists guard_current_token_revision on public.projects;
create trigger guard_current_token_revision before update on public.projects
for each row execute function public.guard_current_token_revision();

create or replace function public.activate_uploaded_token_revision()
returns trigger language plpgsql set search_path = public
as $$
begin
  update public.projects set token_revision_id = new.id,
    tokens = new.tokens, token_file_name = new.token_file_name, token_count = new.token_count
  where id = new.project_id;
  if not found then
    raise exception 'The project could not be updated; the new revision was not saved.';
  end if;
  return new;
end
$$;
drop trigger if exists activate_uploaded_token_revision on public.token_revisions;
create trigger activate_uploaded_token_revision after insert on public.token_revisions
for each row execute function public.activate_uploaded_token_revision();

alter table public.token_revisions enable row level security;
grant select, insert on public.token_revisions to anon, authenticated;
grant update (status) on public.token_revisions to anon, authenticated;
grant update (token_revision_id) on public.projects to anon, authenticated;
drop policy if exists "Anyone can read token revisions" on public.token_revisions;
create policy "Anyone can read token revisions" on public.token_revisions for select to anon, authenticated using (true);
drop policy if exists "Anyone can submit token revisions" on public.token_revisions;
create policy "Anyone can submit token revisions" on public.token_revisions for insert to anon, authenticated with check (true);
drop policy if exists "Anyone can set revision status" on public.token_revisions;
create policy "Anyone can set revision status" on public.token_revisions for update to anon, authenticated using (true) with check (true);

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

notify pgrst, 'reload schema';
