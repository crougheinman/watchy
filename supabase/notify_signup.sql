-- Watchy — notify on new sign-up (Telegram / Discord)
-- Run AFTER profiles.sql. This re-defines handle_new_user() so that, in addition
-- to creating the screening-disabled profile, it pings you whenever someone
-- registers. Uses Supabase's pg_net extension for async (non-blocking) HTTP.
--
-- The notification is wrapped in its own exception block, so if the messaging
-- platform is down it will NEVER break account registration.

-- 1) Enable async HTTP from Postgres.
create extension if not exists pg_net;

-- 2) ─── TELEGRAM SETUP (one time) ─────────────────────────────────────────────
--   a. In Telegram, open @BotFather → /newbot → copy the bot token
--      (looks like  123456789:AAbbCc...).
--   b. Send your new bot any message (e.g. /start). To get your chat id, open:
--        https://api.telegram.org/bot<TOKEN>/getUpdates
--      and copy "chat":{"id": ...}.  (For a group, add the bot and use the
--      group's negative id. For your DM, @userinfobot also gives your id.)
--   c. Paste both below.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bot_token text := '88833202445:AAEvWPcQobZx-DZMLWxCwTpcZTktkeJEbgo';   -- <-- edit
  chat_id   text := '8623747823';      -- <-- edit
  msg       text;
begin
  -- New accounts start disabled, pending screening.
  insert into public.profiles (id, disabled, disabled_reason)
  values (new.id, true, 'Screening')
  on conflict (id) do nothing;

  msg :=
    E'\xF0\x9F\x86\x95 New Watchy sign-up (awaiting screening)' || E'\n' ||
    'Email: ' || coalesce(new.email, '(unknown)') || E'\n' ||
    'User ID: ' || new.id::text;

  -- Fire-and-forget Telegram ping with Approve / Reject buttons. The buttons
  -- carry the user id and are handled by the telegram-webhook Edge Function.
  -- Failures must not block sign-up.
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

-- ─── DISCORD ALTERNATIVE (even simpler — no bot/token) ────────────────────────
-- A Discord channel webhook accepts a plain {"content": "..."} POST.
-- In Discord: Channel → Edit → Integrations → Webhooks → New Webhook → Copy URL.
-- Then replace the `net.http_post(...)` block above with:
--
--   perform net.http_post(
--     url     := 'PASTE_DISCORD_WEBHOOK_URL',
--     headers := jsonb_build_object('Content-Type', 'application/json'),
--     body    := jsonb_build_object('content', msg)
--   );
--
-- (Slack is identical: use an Incoming Webhook URL and {"text": msg}.)