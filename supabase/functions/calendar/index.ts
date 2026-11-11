// NORTE — lê o Google Agenda do usuário pelo endereço secreto iCal e devolve os compromissos do período.
// POST { url, from: "YYYY-MM-DD", days, tz } → { items: AgendaItem[] }
import ICAL from "npm:ical.js@2.1.0";
import { expandAgenda, validIcsUrl } from "./agenda.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") return json({ ok: true });
  const body = (await req.json().catch(() => ({}))) as { url?: string; from?: string; days?: number; tz?: string };
  const url = validIcsUrl(body.url ?? "");
  if (!url) return json({ error: "Endereço inválido. Use o “Endereço secreto no formato iCal” do Google Agenda." }, 400);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(body.from ?? "") ? body.from! : new Date().toISOString().slice(0, 10);
  const days = Math.max(1, Math.min(62, Number(body.days) || 14));
  const tz = body.tz || "America/Sao_Paulo";
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { accept: "text/calendar" } });
    if (r.status === 404) return json({ error: "O Google não encontrou essa agenda. O endereço pode ter sido redefinido — copie o novo." }, 404);
    if (!r.ok) return json({ error: `O Google respondeu ${r.status}.` }, 502);
    const text = await r.text();
    if (text.length > 8_000_000) return json({ error: "Agenda grande demais." }, 413);
    if (!text.includes("BEGIN:VCALENDAR")) return json({ error: "Esse endereço não devolveu uma agenda." }, 400);
    return json({ items: expandAgenda(ICAL, text, from, days, tz) });
  } catch (e) {
    console.error(String(e).slice(0, 200));
    return json({ error: "Não consegui ler a agenda agora. Tente de novo." }, 502);
  }
});
