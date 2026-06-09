# notify-watch — "user is watching" Telegram ping

When a signed-in user opens a title, the app calls this function, which sends
you a Telegram photo (the movie backdrop) captioned with their email + the title.

## Deploy (one time)
```bash
# Where to send the notifications (your @userinfobot id, or a group id):
supabase secrets set TELEGRAM_CHAT_ID="123456789"
# (TELEGRAM_BOT_TOKEN is already set from the webhook setup.)

# Verify ourselves in-function + handle CORS, so deploy without JWT gate:
supabase functions deploy notify-watch --no-verify-jwt
```

That's it — the app calls it automatically (no webhook/URL registration needed).

## Test
Open any movie in the app → you get a Telegram photo "🎬 you@email is watching <Title>".

## How it's secured
- The function reads the caller's JWT and verifies it against Supabase
  (`/auth/v1/user`); a request without a valid user token gets 401.
- The bot token + chat id live only in the function's secrets, never in the app.
