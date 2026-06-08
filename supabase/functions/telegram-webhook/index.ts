// Watchy — Telegram approval webhook (Supabase Edge Function).
//
// Receives inline-button taps from the sign-up notification and enables/locks
// the user in public.profiles. Authenticated by a shared secret that Telegram
// echoes back in the X-Telegram-Bot-Api-Secret-Token header (set via setWebhook).
//
// Env (set with `supabase secrets set ...`):
//   TELEGRAM_BOT_TOKEN        — your BotFather token
//   TELEGRAM_WEBHOOK_SECRET   — any random string; also passed to setWebhook
// Provided automatically by Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function tg(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  // Only Telegram knows the secret — reject anything else.
  if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const cq = update.callback_query;
  if (!cq) return new Response("ok"); // ignore non-button updates

  const [action, userId] = String(cq.data ?? "").split(":");
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const who = cq.from?.username
    ? "@" + cq.from.username
    : (cq.from?.first_name ?? "admin");

  if ((action !== "approve" && action !== "reject") || !userId) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Unknown action" });
    return new Response("ok");
  }

  const patch = action === "approve"
    ? { disabled: false, disabled_reason: null }
    : { disabled: true, disabled_reason: "Rejected after screening" };

  // Update the profile with the service role (bypasses RLS).
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    },
  );

  const verdict = !res.ok
    ? `⚠️ Update failed (${res.status})`
    : action === "approve"
    ? `✅ Approved by ${who}`
    : `🚫 Rejected by ${who}`;

  await tg("answerCallbackQuery", {
    callback_query_id: cq.id,
    text: res.ok ? "Done" : "Error",
  });

  // Append the verdict to the original message and drop the buttons.
  if (chatId && messageId) {
    await tg("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `${cq.message?.text ?? "New sign-up"}\n\n${verdict}`,
      reply_markup: { inline_keyboard: [] },
    });
  }

  return new Response("ok");
});
