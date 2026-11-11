"use client";
// Compromissos do Google Agenda (via função "calendar" do Supabase, que lê o endereço secreto iCal).
// Guarda a última leitura neste aparelho para abrir rápido e funcionar sem internet.
import { useCallback, useEffect, useState } from "react";
import { PUBLIC_CONFIG } from "./publicConfig";
import { toDateKey } from "./dates";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_CONFIG.supabaseAnonKey;
const CACHE = "norte:agenda-cache";
const FRESH_MS = 15 * 60 * 1000;

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  end: string | null;
  location: string | null;
}

/** Mesmo filtro do servidor: só o endereço iCal do Google Agenda. */
export function validIcsUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim().replace(/^webcal:/i, "https:"));
    if (u.protocol !== "https:" || (u.hostname !== "calendar.google.com" && u.hostname !== "www.google.com")) return null;
    if (!/\/calendar\/ical\/.+\.ics$/.test(u.pathname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function fetchAgenda(url: string, from: string, days = 14): Promise<AgendaEvent[]> {
  const r = await fetch(`${URL_BASE}/functions/v1/calendar`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ url, from, days, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo" }),
    signal: AbortSignal.timeout(25_000),
  });
  const j = (await r.json().catch(() => ({}))) as { items?: AgendaEvent[]; error?: string };
  if (!r.ok || !j.items) throw new Error(j.error || "Não consegui ler a agenda.");
  return j.items;
}

interface Cached {
  url: string;
  from: string;
  at: number;
  items: AgendaEvent[];
}

function readCache(): Cached | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || "null");
  } catch {
    return null;
  }
}

export function clearAgendaCache() {
  try {
    localStorage.removeItem(CACHE);
  } catch {}
}

/** Compromissos de hoje até hoje+days. `url` nulo = agenda não conectada. */
export function useAgenda(url: string | null, days = 14) {
  const today = toDateKey();
  const [items, setItems] = useState<AgendaEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!url) return;
    setStatus("loading");
    setError(null);
    try {
      const list = await fetchAgenda(url, today, days);
      setItems(list);
      setAt(Date.now());
      setStatus("ok");
      try {
        localStorage.setItem(CACHE, JSON.stringify({ url, from: today, at: Date.now(), items: list } satisfies Cached));
      } catch {}
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [url, today, days]);

  useEffect(() => {
    if (!url) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setItems([]);
      setStatus("idle");
      return;
    }
    const c = readCache();
    if (c && c.url === url) {
      setItems(c.items.filter((e) => e.date >= today));
      setAt(c.at);
      setStatus("ok");
      /* eslint-enable react-hooks/set-state-in-effect */
      if (c.from === today && Date.now() - c.at < FRESH_MS) return;
    }
    void refresh();
  }, [url, today, refresh]);

  return { items, status, error, at, refresh };
}

export function newEventUrl(date?: string) {
  if (!date) return "https://calendar.google.com/calendar/r/eventedit";
  const d = date.replaceAll("-", "");
  return `https://calendar.google.com/calendar/r/eventedit?dates=${d}/${d}`;
}
