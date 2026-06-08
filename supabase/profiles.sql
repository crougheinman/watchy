-- Watchy — per-user account status (enable / disable users)
-- Run once in your Supabase project (SQL Editor).
--
-- Each auth user gets a profiles row (auto-created on sign-up). NEW sign-ups are
-- created DISABLED with reason "Screening" — they must be approved (enabled) by
-- an admin before they can use the app. Until then they see the "Account
-- disabled" page. Flip `disabled` back to true any time to re-lock a user.

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    disabled boolean not null default false,
    disabled_reason text,
    created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user signs up — DISABLED by default
-- and flagged for screening, so every new account must be approved manually.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, disabled, disabled_reason)
  values (new.id, true, 'Screening')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill rows for users who already exist (kept ENABLED — screening only
-- applies to new sign-ups going forward).
insert into
    public.profiles (id)
select id
from auth.users on conflict (id) do nothing;

-- RLS: a user may READ only their own profile. No client write policy — only
-- you (via the dashboard / service role) can disable accounts.
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;

create policy "read own profile" on public.profiles for
select using (auth.uid () = id);

-- ── Approve / disable a user ─────────────────────────────────────────────────
-- New sign-ups start disabled (reason "Screening"). Find the user id under
-- Authentication → Users, then APPROVE them:
--   update public.profiles set disabled = false, disabled_reason = null
--     where id = '<user-uuid>';
-- Disable / re-lock a user:
--   update public.profiles
--     set disabled = true, disabled_reason = 'Violated terms of use'
--     where id = '<user-uuid>';
--
-- See everyone awaiting screening:
--   select p.id, u.email, p.created_at
--     from public.profiles p join auth.users u on u.id = p.id
--     where p.disabled is true;