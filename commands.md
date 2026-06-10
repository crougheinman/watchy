# Watchy — Commands & Setup Reference

Quick reference for building the app and operating its Supabase backend
(auth, screening, version gate, maintenance, Telegram notifications).

> Secrets (bot token, API keys, chat id) are shown as `<PLACEHOLDERS>` — get the
> real values from `.env` and `set-webhook.bat` (both gitignored).

---

## 1. Local development

| Command | Description |
|---|---|
| `npm install` | Install dependencies (first time / after pulling). |
| `npm run dev` | Start the Vite dev server at http://localhost:5173. Restart after editing `.env`. |
| `npm run build` | Type-check (`tsc -b`) + production build into `dist/`. |
| `npm run lint` | Run ESLint over the app source. |
| `npm run preview` | Preview the production build locally. |

### Environment (`.env`)
Copy `env.example` → `.env` and fill in:
```
VITE_TMDB_API_KEY=<tmdb v3 key>          # themoviedb.org → Settings → API
VITE_TMDB_API_BASE=https://api.themoviedb.org/3
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>
```
`.env` is gitignored. `VITE_*` vars are bundled into the client at build time.

---

## 2. Build the Android APK

### Easiest — one click
```bat
build-apk.bat
```
Runs `npm run build` → `cap sync android` → `gradlew assembleDebug`, then copies
the result to **`watchy-debug.apk`** in the project root (ready to share).

### Manual steps
```bash
npm run build                 # bundle the web app
npx cap sync android          # copy web assets + plugins into the Android project
cd android
./gradlew assembleDebug       # → android/app/build/outputs/apk/debug/app-debug.apk
```
Requires a JDK — the script auto-detects Android Studio's bundled `jbr`. To set
manually: `JAVA_HOME = C:\Program Files\Android\Android Studio\jbr`.

### Open in Android Studio instead
```bash
npm run cap:android           # build + sync + open Android Studio
```
Then **Build → Build APK(s)**, or run on a device/emulator.

### Releasing a new version

**`build-apk.bat`** now pulls the version FROM Supabase (`app_config.latest_version`)
and stamps `package.json` automatically (step 1/4), then builds, then uploads to
Google Drive via rclone. So the source of truth for the version is Supabase.

**One-command zero-gap release — `release.bat <version>`** (e.g. `release.bat 1.0.5`):
1. Maintenance ON  →  2. set required version  →  3. build + upload APK  →  4. Maintenance OFF.

Because the maintenance gate outranks the update gate, users see "We'll be right
back" during the release and only get "Update required" once it finishes — by
which time the new APK is already on Drive (no gap). Needs your Supabase
**service_role** key pasted into `release.bat` (gitignored).

Manual path if you prefer: `/setversion 1.0.5` in Telegram (or dashboard) →
run `build-apk.bat`.

---

## 3. Supabase CLI setup

```bash
npm i -g supabase                       # install the CLI
supabase login                          # browser auth
supabase link --project-ref <ref>       # ref is in your project URL
```

---

## 4. Database SQL (run in: Dashboard → SQL Editor)

Run **once**, in this order. Files live in `supabase/`.

| File | What it creates | ⚠️ Notes |
|---|---|---|
| `supabase/profiles.sql` | `profiles` table, RLS, screening trigger (`handle_new_user`), backfill | New users start **disabled / "Screening"**. |
| `supabase/app_config.sql` | `app_config` table (version gate + maintenance), RLS, seed | Singleton row `id = 1`. |
| `supabase/notify_signup.sql` | **Overwrites** `handle_new_user` to also send a Telegram message with Approve/Reject buttons; enables `pg_net` | Fill in `bot_token` + `chat_id` first. **Run this LAST.** |

> 🚨 **Never re-run `profiles.sql` after `notify_signup.sql`** — it replaces the
> notifying trigger with the plain one and signup pings stop. If you must, run
> `notify_signup.sql` again afterward so the notifying version stays live.

Verify the live trigger is the notifying one (should contain `http_post`):
```sql
select prosrc from pg_proc where proname = 'handle_new_user';
```

---

## 5. Operating the app (SQL snippets)

### Users — approve / disable
```sql
-- See everyone awaiting screening
select p.id, u.email, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.disabled is true;

-- Approve (enable) a user
update public.profiles set disabled = false, disabled_reason = null
  where id = '<user-uuid>';

-- Disable / re-lock a user
update public.profiles
  set disabled = true, disabled_reason = 'Violated terms of use'
  where id = '<user-uuid>';
```

### Force update (version gate)
```sql
update public.app_config
  set latest_version = '1.1.0', updated_at = now()
  where id = 1;
```
Anyone on an older APK is signed out and shown “Update required”.

### Maintenance mode
```sql
-- One-time: add columns (safe to re-run)
alter table public.app_config add column if not exists maintenance boolean not null default false;
alter table public.app_config add column if not exists maintenance_reason text;

-- Turn ON  (everyone sees the "We'll be right back" page on next refresh)
update public.app_config
  set maintenance = true, maintenance_reason = 'Upgrading our servers — back shortly'
  where id = 1;

-- Turn OFF
update public.app_config set maintenance = false, maintenance_reason = null where id = 1;
```

---

## 6. Telegram notifications

### Secrets (used by the Edge Functions)
```bash
supabase secrets set TELEGRAM_BOT_TOKEN="<bot token>"      # from @BotFather
supabase secrets set TELEGRAM_WEBHOOK_SECRET="<random>"    # any long random string
supabase secrets set TELEGRAM_CHAT_ID="<chat id>"          # from @userinfobot
supabase secrets list                                      # confirm names exist
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically — do not set them.

### Edge Functions (in `supabase/functions/`)
```bash
# Approve/Reject buttons handler (Telegram has no JWT → disable verification)
supabase functions deploy telegram-webhook --no-verify-jwt

# "Now Watching" notifier (verifies the user itself + handles CORS)
supabase functions deploy notify-watch --no-verify-jwt
```

### Register the bot webhook (for Approve/Reject buttons)
```bat
set-webhook.bat
```
Or manually (one line):
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://<ref>.supabase.co/functions/v1/telegram-webhook" -d "secret_token=<WEBHOOK_SECRET>"
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"   # verify
```

### Admin control commands (in the Telegram chat)
After deploying `telegram-webhook`, message the bot (you must be the admin —
`TELEGRAM_ADMIN_ID`, default = `TELEGRAM_CHAT_ID`):

| Command | Action |
|---|---|
| `/status` | Show maintenance state + required version, with a tap-toggle button |
| `/maintenance_on <reason>` | Turn ON maintenance — asks to **Confirm** first |
| `/maintenance_off` | Turn OFF maintenance |
| `/setversion 1.0.4` | Set required version (forces APK update) — asks to **Confirm** first |
| `/help` | List commands |

Optionally register the command menu so they autocomplete in Telegram:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[
    {"command":"status","description":"Maintenance & version"},
    {"command":"maintenance_on","description":"Turn ON maintenance"},
    {"command":"maintenance_off","description":"Turn OFF maintenance"},
    {"command":"setversion","description":"Set required version"},
    {"command":"help","description":"List commands"}]}'
```
Set the admin id (optional — defaults to TELEGRAM_CHAT_ID):
```bash
supabase secrets set TELEGRAM_ADMIN_ID="<your telegram user id>"
```

### Useful bot API calls
```bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"            # check the bot identity
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"    # needed before getUpdates
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"       # read chat id (webhook off)
curl "https://api.telegram.org/bot<TOKEN>/sendMessage" -d "chat_id=<id>" -d "text=test"
```
> A bot can only message a user **after that user has started it** (sent `/start`).

### Debug the signup ping (pg_net)
```sql
select extname from pg_extension where extname = 'pg_net';   -- is pg_net enabled?

-- Fire a test and read the result
select net.http_post(
  url := 'https://api.telegram.org/bot<TOKEN>/sendMessage',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := jsonb_build_object('chat_id','<id>','text','watchy test'));

select id, status_code, content, error_msg, created
  from net._http_response order by id desc limit 5;        -- 200 = delivered
```

### Edge Function logs
Dashboard → **Edge Functions → (function) → Logs/Invocations** to see runtime
output (e.g. `notify-watch telegram: 200 {...}`).

---

## 7. Auth configuration (Dashboard)

| Task | Where |
|---|---|
| Disable email confirmation | Authentication → Sign In / Providers → Email → **Confirm email** = off |
| Custom SMTP (Brevo/SendGrid) | Authentication → Settings → **SMTP** (raise the email rate limit too) |
| Confirmation email template | Authentication → Email Templates → **Confirm signup** → paste `supabase/email-templates/confirm-signup.html` |

---

## 8. Gate order (how the app decides what to show)

```
maintenance? → outdated version? → signed in? → account disabled? → app
```
All gates fail **open**: if Supabase is unreachable/unconfigured, users aren’t
locked out.
