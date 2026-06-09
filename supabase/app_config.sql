-- Watchy — global app config (version gate + maintenance gate)
-- Run this once in your Supabase project (SQL Editor). The app reads row id=1
-- on startup:
--   • if the build is older than `latest_version` → "Update required" page
--   • if `maintenance` is true → "We'll be right back" page (blocks everyone)

create table if not exists public.app_config (
  id                 int  primary key default 1,
  latest_version     text not null,
  download_url       text,
  maintenance        boolean not null default false,
  maintenance_reason text,
  updated_at         timestamptz not null default now(),
  constraint app_config_singleton check (id = 1)
);

-- Add the maintenance columns if the table already existed from an earlier run.
alter table public.app_config add column if not exists maintenance        boolean not null default false;
alter table public.app_config add column if not exists maintenance_reason text;

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

-- NOTE: no insert/update policy — change these from the Supabase dashboard
-- (Table editor / SQL) so clients can never tamper with them.
--
-- Force everyone onto a new build:
--   update public.app_config set latest_version = '1.1.0', updated_at = now() where id = 1;
--
-- Turn ON maintenance (everyone sees the "We'll be right back" page):
--   update public.app_config
--     set maintenance = true, maintenance_reason = 'Upgrading our servers — back by 5pm'
--     where id = 1;
-- Turn OFF maintenance:
--   update public.app_config set maintenance = false, maintenance_reason = null where id = 1;
