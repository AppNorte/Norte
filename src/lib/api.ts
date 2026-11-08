// Chamadas às funções de servidor (IA, Sefaz).
// - Vercel/Next com servidor: rotas /api/* do próprio app.
// - GitHub Pages (site estático): Edge Functions do Supabase (/functions/v1/*).
// Sem nenhum dos dois, lança erro e quem chamou usa o modo local.

const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
import { PUBLIC_CONFIG } from "./publicConfig";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_CONFIG.supabaseAnonKey;

export type ApiName = "assistant" | "daily" | "nfce" | "receipt";

export function serverAvailable() {
  return !STATIC || Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function endpoint(name: ApiName) {
  if (!STATIC) return `/api/${name}`;
  if (SUPABASE_URL && SUPABASE_KEY) return `${SUPABASE_URL}/functions/v1/${name}`;
  return null;
}

export async function callApi(name: ApiName, body?: unknown, timeoutMs = 30_000): Promise<Response> {
  const url = endpoint(name);
  if (!url) throw new Error("sem servidor");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (STATIC && SUPABASE_KEY) {
    headers.apikey = SUPABASE_KEY;
    headers.authorization = `Bearer ${SUPABASE_KEY}`;
  }
  return fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}
