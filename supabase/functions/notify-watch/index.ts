// Watchy — "user is watching" Telegram notifier (Supabase Edge Function).
//
// The app calls this whenever a user opens a title. It identifies the user from
// their JWT, then sends you a Telegram photo (the movie backdrop) with a caption.
// The bot token stays server-side here — never in the app bundle.
//
// Env (set with `supabase secrets set ...`):
//   TELEGRAM_BOT_TOKEN  — your BotFather token (already set for the webhook)
//   TELEGRAM_CHAT_ID    — where to send (your @userinfobot id, or group id)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY
//
// Deploy WITHOUT JWT verification (we verify the user ourselves so we can also
// handle the browser CORS preflight):  supabase functions deploy notify-watch --no-verify-jwt

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function tg(method: string, payload: unknown) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: cors });
  }

  // Identify the caller from their JWT (also gates this to logged-in users).
  let email = "A user";
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: req.headers.get("Authorization") ?? "", apikey: ANON },
    });
    if (!r.ok) return new Response("unauthorized", { status: 401, headers: cors });
    const u = await r.json();
    email = u?.email ?? email;
  } catch {
    return new Response("unauthorized", { status: 401, headers: cors });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Derive a friendly display name from the email local-part
  // (e.g. "grey.yey@x.com" → "Grey Yey"). No separate name field exists.
  const name = (email.split("@")[0] || email)
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || email;

  const title = String(body.title ?? "something");
  const year = body.year ? ` <b>·</b> ${body.year}` : "";
  const icon = body.mediaType === "tv" ? "📺" : "🎬";
  const genres = typeof body.genres === "string" && body.genres
    ? `\n🏷️ <i>${esc(body.genres)}</i>` : "";
  const image = typeof body.image === "string" ? body.image : "";

  // Telegram has no real font sizes; we use bold for the name and a subdued
  // italic line for the email so it reads as small/secondary.
  const caption =
    `🍿 <b>Now Watching on Watchy</b>\n\n` +
    `${icon} <b>${esc(title)}</b>${year}${genres}\n\n` +
    `👤 <b>${esc(name)}</b>\n` +
    `<i>${esc(email)}</i>`;

  // Surface config problems in the function logs instead of failing silently.
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("notify-watch: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret");
    return new Response(
      JSON.stringify({ ok: false, error: "missing telegram secrets" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    const resp = image
      ? await tg("sendPhoto", { chat_id: CHAT_ID, photo: image, caption, parse_mode: "HTML" })
      : await tg("sendMessage", { chat_id: CHAT_ID, text: caption, parse_mode: "HTML" });
    const text = await resp.text();
    console.log("notify-watch telegram:", resp.status, text);
  } catch (e) {
    console.error("notify-watch telegram error:", String(e));
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
