-- Watchy — version gate config
-- Run this once in your Supabase project (SQL Editor). The app reads row id=1
-- on startup; if the installed build is older than `latest_version`, the user is
-- signed out and shown the "Update required" page.

create table if not exists public.app_config (
  id             int  primary key default 1,
  latest_version text not null,
  download_url   text,
  updated_at     timestamptz not null default now(),
  constraint app_config_singleton check (id = 1)
);

-- Seed / current required version. Bump latest_version on each release.
insert into public.app_config (id, latest_version, download_url)
values (
  1,
  '1.0.0',
  'https://drive.google.com/drive/folders/1hx-BTBOxJhpiCry5LFwz64VQHFsRjHG2?usp=sharing'
)
on conflict (id) do nothing;

-- Allow the app (anon key, even when logged out) to READ the config only.
alter table public.app_config enable row level security;

drop policy if exists "app_config readable by everyone" on public.app_config;
create policy "app_config readable by everyone"
  on public.app_config
  for select
  using (true);

-- NOTE: no insert/update policy — change latest_version from the Supabase
-- dashboard (Table editor / SQL) so clients can never tamper with it.
--
-- To force everyone onto a new build later:
--   update public.app_config set latest_version = '1.1.0', updated_at = now() where id = 1;
