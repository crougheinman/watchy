-- Watchy — feature tables: My List, cloud Continue Watching, announcement
-- Run once in your Supabase project (SQL Editor).

-- ── My List (per-user saved titles) ─────────────────────────────────────────
create table if not exists public.user_library (
  user_id    uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id    int  not null,
  movie      jsonb not null check (pg_column_size(movie) < 16384),
  added_at   timestamptz not null default now(),
  primary key (user_id, media_type, tmdb_id)
);

alter table public.user_library enable row level security;
drop policy if exists "own library" on public.user_library;
create policy "own library" on public.user_library
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Continue Watching (per-user playback progress) ──────────────────────────
create table if not exists public.watch_progress (
  user_id         uuid not null references auth.users(id) on delete cascade,
  media_type      text not null check (media_type in ('movie', 'tv')),
  tmdb_id         int  not null,
  movie           jsonb not null check (pg_column_size(movie) < 16384),
  progress        numeric not null default 0 check (progress >= 0 and progress <= 100),
  current_seconds numeric not null default 0 check (current_seconds >= 0),
  updated_at      timestamptz not null default now(),
  primary key (user_id, media_type, tmdb_id)
);

alter table public.watch_progress enable row level security;
drop policy if exists "own progress" on public.watch_progress;
create policy "own progress" on public.watch_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Announcement banner (app-wide) ──────────────────────────────────────────
-- Stored on the existing app_config singleton (id = 1).
alter table public.app_config add column if not exists announcement text;

-- Set / clear the banner:
--   update public.app_config set announcement = 'New movies added this week!' where id = 1;
--   update public.app_config set announcement = null where id = 1;
-- (or use /announce <text> and /announce_off in the Telegram bot)
