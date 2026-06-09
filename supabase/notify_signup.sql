-- Enable async HTTP from Postgres
create extension if not exists pg_net;

-- Install the NOTIFYING version of the signup trigger (overwrites the plain one)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bot_token text := 'PASTE_TELEGRAM_BOT_TOKEN';   -- <-- edit
  chat_id   text := 'PASTE_TELEGRAM_CHAT_ID';      -- <-- edit
  msg       text;
begin
  -- New accounts start disabled, pending screening.
  insert into public.profiles (id, disabled, disabled_reason)
  values (new.id, true, 'Screening')
  on conflict (id) do nothing;

  msg := '🆕 New Watchy sign-up (awaiting screening)' || E'\n' ||
         'Email: ' || coalesce(new.email, '(unknown)') || E'\n' ||
         'User ID: ' || new.id::text;

  -- Telegram ping with Approve / Reject buttons; never block sign-up.
  begin
    perform net.http_post(
      url     := format('https://api.telegram.org/bot%s/sendMessage', bot_token),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'chat_id', chat_id,
        'text',    msg,
        'reply_markup', jsonb_build_object(
          'inline_keyboard', jsonb_build_array(
            jsonb_build_array(
              jsonb_build_object('text', '✅ Approve', 'callback_data', 'approve:' || new.id::text),
              jsonb_build_object('text', '🚫 Reject',  'callback_data', 'reject:'  || new.id::text)
            )
          )
        )
      )
    );
  exception when others then
    raise warning 'signup notify failed: %', sqlerrm;
  end;

  return new;
end;
$$;

-- Make sure the trigger is attached
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();