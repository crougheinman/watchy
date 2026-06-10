// Watchy — Telegram control webhook (Supabase Edge Function).
//
// Handles, from your Telegram bot:
//   • sign-up Approve / Reject buttons        → public.profiles
//   • admin commands to run the backend       → public.app_config
//       /status                  show maintenance + required version (+ buttons)
//       /maintenance_on <reason> turn ON maintenance (asks to confirm)
//       /maintenance_off         turn OFF maintenance
//       /setversion <x.y.z>      set required version (asks to confirm)
//       /help                    list commands
//
// Security:
//   • secret-token header (set via setWebhook) — only Telegram can call this.
//   • sender id must equal the admin id — only you can act.
//
// Env (supabase secrets set ...):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
//   TELEGRAM_ADMIN_ID   (optional; defaults to TELEGRAM_CHAT_ID)
// Injected by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_ID = Deno.env.get("TELEGRAM_ADMIN_ID") ?? Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

// ---- Telegram helpers -------------------------------------------------------
function tg(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const btn = (text: string, data: string) => ({ text, callback_data: data });
const kb = (rows: Array<Array<{ text: string; callback_data: string }>>) =>
  ({ inline_keyboard: rows });

function send(chatId: number | string, text: string, reply_markup?: unknown) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup });
}
function edit(chatId: number | string, messageId: number, text: string, reply_markup?: unknown) {
  return tg("editMessageText", {
    chat_id: chatId, message_id: messageId, text, parse_mode: "HTML",
    reply_markup: reply_markup ?? { inline_keyboard: [] },
  });
}

// ---- Supabase (service role) helpers ----------------------------------------
const sbHeaders = {
  "Content-Type": "application/json",
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
};

async function getConfig(): Promise<{ maintenance: boolean; maintenance_reason: string | null; latest_version: string | null } | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_config?id=eq.1&select=maintenance,maintenance_reason,latest_version`,
    { headers: sbHeaders },
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] ?? null;
}
function patch(table: string, query: string, body: unknown) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isAdmin = (id: unknown) => ADMIN_ID !== "" && String(id) === ADMIN_ID;

// ---- Command handling -------------------------------------------------------
async function statusText(): Promise<{ text: string; markup: unknown }> {
  const c = await getConfig();
  if (!c) return { text: "⚠️ Could not read app_config.", markup: kb([]) };
  const on = c.maintenance;
  const text =
    `📊 <b>Watchy status</b>\n\n` +
    `🛠️ Maintenance: <b>${on ? "ON" : "OFF"}</b>` +
    (on && c.maintenance_reason ? `\nReason: ${esc(c.maintenance_reason)}` : "") +
    `\n📦 Required version: <b>${esc(c.latest_version ?? "—")}</b>`;
  const markup = on
    ? kb([[btn("✅ Turn OFF maintenance", "m_off")]])
    : kb([[btn("🛠️ Turn ON maintenance", "m_on_ask")]]);
  return { text, markup };
}

const HELP =
  `🤖 <b>Watchy admin</b>\n\n` +
  `/status — show maintenance &amp; version\n` +
  `/maintenance_on &lt;reason&gt; — turn ON (confirm)\n` +
  `/maintenance_off — turn OFF\n` +
  `/setversion &lt;x.y.z&gt; — set required version (confirm)\n` +
  `/help — this message`;

async function handleCommand(msg: any) {
  const chatId = msg.chat?.id;
  if (!isAdmin(msg.from?.id)) {
    await send(chatId, "🚫 Not authorized.");
    return;
  }
  const text = String(msg.text ?? "").trim();
  const [cmdRaw, ...rest] = text.split(/\s+/);
  const cmd = cmdRaw.split("@")[0].toLowerCase(); // strip @BotName in groups
  const arg = rest.join(" ").trim();

  if (cmd === "/status") {
    const { text: t, markup } = await statusText();
    await send(chatId, t, markup);
  } else if (cmd === "/maintenance_on") {
    const reason = arg || "Scheduled maintenance";
    await send(
      chatId,
      `⚠️ Turn <b>ON</b> maintenance? Everyone will be blocked from the app.\nReason: ${esc(reason)}`,
      kb([[btn("⚠️ Confirm ON", "m_on"), btn("Cancel", "x")]]),
    );
  } else if (cmd === "/maintenance_off") {
    const ok = (await patch("app_config", "id=eq.1", { maintenance: false, maintenance_reason: null })).ok;
    await send(chatId, ok ? "✅ Maintenance <b>OFF</b> — app is live." : "⚠️ Update failed.");
  } else if (cmd === "/setversion") {
    if (!/^\d+(\.\d+){0,3}$/.test(arg)) {
      await send(chatId, "Usage: <code>/setversion 1.0.4</code>");
      return;
    }
    await send(
      chatId,
      `⚠️ Set required version to <b>${esc(arg)}</b>?\nOlder app installs will be forced to update. Make sure the new APK is uploaded.`,
      kb([[btn(`⚠️ Confirm ${arg}`, `sv:${arg}`), btn("Cancel", "x")]]),
    );
  } else if (cmd === "/help" || cmd === "/start") {
    await send(chatId, HELP);
  }
}

// ---- Callback (button) handling ---------------------------------------------
async function handleCallback(cq: any) {
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const msgText = cq.message?.text ?? "";
  const who = cq.from?.username ? "@" + cq.from.username : (cq.from?.first_name ?? "admin");

  if (!isAdmin(cq.from?.id)) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Not authorized" });
    return;
  }

  const data = String(cq.data ?? "");
  const ack = (text: string) => tg("answerCallbackQuery", { callback_query_id: cq.id, text });

  // --- user approval (sign-up message buttons) ---
  if (data.startsWith("approve:") || data.startsWith("reject:")) {
    const [action, userId] = data.split(":");
    const body = action === "approve"
      ? { disabled: false, disabled_reason: null }
      : { disabled: true, disabled_reason: "Rejected after screening" };
    const ok = (await patch("profiles", `id=eq.${encodeURIComponent(userId)}`, body)).ok;
    await ack(ok ? "Done" : "Error");
    await edit(chatId, messageId, `${msgText}\n\n${ok ? (action === "approve" ? `✅ Approved by ${who}` : `🚫 Rejected by ${who}`) : "⚠️ Update failed"}`);
    return;
  }

  // --- maintenance toggle ---
  if (data === "m_on_ask") {
    await ack("");
    await edit(chatId, messageId,
      `⚠️ Turn <b>ON</b> maintenance? Everyone will be blocked.\nReason: Scheduled maintenance`,
      kb([[btn("⚠️ Confirm ON", "m_on"), btn("Cancel", "x")]]));
    return;
  }
  if (data === "m_on") {
    const m = msgText.match(/Reason:\s*(.+)$/m);
    const reason = m ? m[1].trim() : "Under maintenance";
    const ok = (await patch("app_config", "id=eq.1", { maintenance: true, maintenance_reason: reason })).ok;
    await ack(ok ? "Maintenance ON" : "Error");
    await edit(chatId, messageId, ok ? `✅ Maintenance <b>ON</b> by ${who}\nReason: ${esc(reason)}` : "⚠️ Update failed");
    return;
  }
  if (data === "m_off") {
    const ok = (await patch("app_config", "id=eq.1", { maintenance: false, maintenance_reason: null })).ok;
    await ack(ok ? "Maintenance OFF" : "Error");
    await edit(chatId, messageId, ok ? `✅ Maintenance <b>OFF</b> by ${who}` : "⚠️ Update failed");
    return;
  }

  // --- set version ---
  if (data.startsWith("sv:")) {
    const v = data.slice(3);
    const ok = (await patch("app_config", "id=eq.1", { latest_version: v, updated_at: new Date().toISOString() })).ok;
    await ack(ok ? "Version set" : "Error");
    await edit(chatId, messageId, ok ? `✅ Required version set to <b>${esc(v)}</b> by ${who}` : "⚠️ Update failed");
    return;
  }

  // --- cancel ---
  if (data === "x") {
    await ack("Cancelled");
    await edit(chatId, messageId, "❌ Cancelled.");
    return;
  }

  await ack("Unknown action");
}

// ---- Entry ------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }
  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message?.text) await handleCommand(update.message);
  } catch (e) {
    console.error("telegram-webhook error:", String(e));
  }
  return new Response("ok");
});
