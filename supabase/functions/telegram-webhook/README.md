# Telegram approve-from-chat — setup

Approve or reject new sign-ups straight from Telegram. New users are created
**disabled** (reason "Screening"); the bot DMs you a message with **✅ Approve /
🚫 Reject** buttons that update `public.profiles` via this Edge Function.

```
Sign-up ─▶ handle_new_user() trigger ─▶ Telegram message + buttons
                                              │ (you tap)
                                              ▼
                                   telegram-webhook Edge Function
                                              │ (service role)
                                              ▼
                                   profiles.disabled = false  ✅
```

## Prerequisites
- A Telegram bot token (BotFather) and your chat id — see `supabase/profiles.sql`
  / `supabase/notify_signup.sql`.
- The [Supabase CLI](https://supabase.com/docs/guides/cli): `npm i -g supabase`.

## 1. Link the project
```bash
supabase login
supabase link --project-ref <your-project-ref>   # ref is in your project URL
```

## 2. Set the function secrets
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — you
only set these two:
```bash
supabase secrets set TELEGRAM_BOT_TOKEN="123456:AAbb...your token..."
supabase secrets set TELEGRAM_WEBHOOK_SECRET="any-long-random-string"
```

## 3. Deploy the function
Telegram doesn't send a Supabase JWT, so disable JWT verification (we verify the
secret-token header instead):
```bash
supabase functions deploy telegram-webhook --no-verify-jwt
```
Your function URL will be:
```
https://<project-ref>.supabase.co/functions/v1/telegram-webhook
```

## 4. Point your bot's webhook at it
Pass the SAME secret you set above so the function can trust the requests:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=any-long-random-string"
```
Verify: `curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"`

## 5. Apply the SQL
Run `supabase/profiles.sql` then `supabase/notify_signup.sql` in the SQL Editor
(the latter now sends the Approve/Reject buttons). Make sure the bot token + chat
id in `notify_signup.sql` are filled in.

## Done
Register a test account → you get a Telegram message with buttons → tap
**✅ Approve** → the message updates to "Approved by …" and that user can log in.

### Notes
- The function rejects any request without the correct secret-token header (401),
  so the approve endpoint can't be triggered by outsiders.
- The service-role key lives only in the Edge Function — never in the app.
- To change the webhook later, re-run `setWebhook`; to remove it,
  `…/deleteWebhook`.
