// Avisos no celular (Web Push) — inscrição do aparelho e preferências.
// O servidor (função "notify" do Supabase) envia na hora escolhida, mesmo com o app fechado.
import { getSupabase } from "./supabase";
import { PUBLIC_CONFIG } from "./publicConfig";
import { DEFAULT_PREFS, type DayMessage, type ReminderPrefs } from "./reminders";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_CONFIG.supabaseAnonKey;
const PREFS_KEY = "norte:notify";

export type PushStatus = "unsupported" | "needs-install" | "denied" | "off" | "on";

export function loadPrefs(): ReminderPrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: ReminderPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function standalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export async function pushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  if (!("PushManager" in window) || !("Notification" in window)) return isIos() && !standalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function fn(path = "") {
  return `${URL_BASE}/functions/v1/notify${path}`;
}

export async function serverPushKey(): Promise<string | null> {
  const r = await fetch(fn(), { headers: { apikey: KEY, authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return null;
  const j = (await r.json()) as { publicKey?: string | null };
  return j.publicKey ?? null;
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function saveRow(sub: PushSubscription, prefs: ReminderPrefs, messages: DayMessage[]) {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
  if (!sb || !data.user) throw new Error("Entre na sua conta (Mais → Conta e backup) para ativar os avisos.");
  const j = sub.toJSON();
  const { error } = await sb.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    user_id: data.user.id,
    keys: j.keys,
    prefs: { ...prefs, messages },
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Pede permissão, inscreve o aparelho e salva as preferências na nuvem. */
export async function enablePush(prefs: ReminderPrefs, messages: DayMessage[]): Promise<void> {
  const key = await serverPushKey().catch(() => null);
  if (!key) throw new Error("Os avisos ainda não foram ligados no servidor do NORTE.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permissão de notificação negada. Libere nas configurações do celular.");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
  await saveRow(sub, prefs, messages);
  savePrefs(prefs);
}

/** Atualiza horário/opções e as mensagens dos próximos dias (chamado ao abrir o app). */
export async function refreshPush(prefs: ReminderPrefs, messages: DayMessage[]): Promise<boolean> {
  savePrefs(prefs);
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return false;
  await saveRow(sub, prefs, messages);
  return true;
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await getSupabase()?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<void> {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
  if (!data.session) throw new Error("Entre na sua conta para testar.");
  const r = await fetch(fn(), {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${data.session.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ action: "test" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error || `Erro ${r.status}`);
}
