// NORTE — avisos no celular (Web Push).
// GET                       → { publicKey } para o app se inscrever.
// POST { action: "test" }   → envia um aviso de teste aos aparelhos do usuário logado (JWT).
// POST {} (agendamento)     → para cada aparelho cuja hora local do aviso chegou e que ainda não recebeu hoje,
//                             monta os avisos (contas, leitura, dia) e envia. Repetir a chamada não duplica (last_sent).
// Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem nas funções.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { buildNotifications, DEFAULT_PREFS, localNow, type DayMessage, type PushMessage, type ReminderPrefs, type ReminderState } from "./reminders.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const APP = "https://appnorte.github.io/Norte";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

const PUB = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const PRIV = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const configured = Boolean(PUB && PRIV);
if (configured) webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || `${APP}/`, PUB, PRIV);

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

interface SubRow {
  endpoint: string;
  user_id: string;
  keys: { p256dh: string; auth: string };
  prefs: Partial<ReminderPrefs> & { messages?: DayMessage[] };
  tz: string;
  last_sent: string | null;
}

/** Envia; devolve false se o aparelho não existe mais (inscrição removida). */
async function send(sub: SubRow, msg: PushMessage): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({ ...msg, url: `${APP}${msg.url}` }),
      { TTL: 60 * 60 * 6, urgency: "normal" },
    );
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      return false;
    }
    console.error("push falhou", code, String(e).slice(0, 200));
    return true;
  }
}

async function runSchedule() {
  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) throw error;
  const states = new Map<string, ReminderState | null>();
  let sent = 0;
  for (const sub of (subs ?? []) as SubRow[]) {
    const prefs: ReminderPrefs = { ...DEFAULT_PREFS, ...sub.prefs };
    const { date, hour } = localNow(sub.tz || "America/Sao_Paulo");
    if (hour !== prefs.hour || sub.last_sent === date) continue;
    if (!states.has(sub.user_id)) {
      const { data } = await admin.from("app_state").select("data").eq("user_id", sub.user_id).maybeSingle();
      states.set(sub.user_id, (data?.data as ReminderState) ?? null);
    }
    const state = states.get(sub.user_id);
    await admin.from("push_subscriptions").update({ last_sent: date }).eq("endpoint", sub.endpoint);
    if (!state) continue;
    for (const msg of buildNotifications(state, date, prefs, sub.prefs.messages ?? [])) {
      if (!(await send(sub, msg))) break;
      sent++;
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") return json({ configured, publicKey: PUB || null });
  if (!configured) return json({ error: "Avisos ainda não configurados no servidor." }, 501);

  const body = await req.json().catch(() => ({}));
  if (body?.action === "test") {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Entre na sua conta para testar." }, 401);
    const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", u.user.id);
    if (!subs?.length) return json({ error: "Nenhum aparelho inscrito." }, 404);
    let ok = 0;
    for (const sub of subs as SubRow[]) if (await send(sub, { title: "NORTE", body: "Tudo certo! Os avisos vão chegar por aqui. 🧭", url: "/hoje/", tag: "teste" })) ok++;
    return json({ sent: ok });
  }

  try {
    return json({ sent: await runSchedule() });
  } catch (e) {
    console.error(e);
    return json({ error: "falha ao enviar" }, 500);
  }
});
