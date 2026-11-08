"use client";

import { useEffect, useRef } from "react";
import { pickLocalMessage } from "./messages";
import { toDateKey } from "@/lib/dates";
import type { AppState, DailyMessage } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";
import { callApi } from "@/lib/api";

function signals(s: AppState, date: string) {
  const mood = s.growth.moods.find((m) => m.date === date);
  const dow = new Date(`${date}T12:00:00`).getDay();
  const habits = s.growth.habits.filter((h) => h.active && h.weekdays.includes(dow));
  return {
    mood: mood?.mood ?? null,
    energy: mood?.energy ?? null,
    goals: s.growth.goals.filter((g) => g.status === "active").map((g) => g.title).slice(0, 3),
    habitsDone: habits.filter((h) => h.log.includes(date)).length,
    habitsTotal: habits.length,
  };
}

/** Mensagem do dia: usa o cache; se não houver, gera (IA com consentimento, senão coleção local). */
export function useDailyMessage(): DailyMessage {
  const { s, mutate } = useAppState();
  const today = toDateKey();
  const cached = s.faith.daily.find((d) => d.date === today);
  const asked = useRef<string | null>(null);

  useEffect(() => {
    if (cached || asked.current === today) return;
    asked.current = today;
    const local = pickLocalMessage(s.me, today);
    const save = (m: DailyMessage) =>
      mutate((d) => {
        d.faith.daily = [...d.faith.daily.filter((x) => x.date !== today), m].slice(-14);
      });
    if (!s.me.aiConsent) {
      save(local);
      return;
    }
    callApi("daily", { date: today, name: s.profile.displayName, me: s.me, signals: signals(s, today) }, 30_000)
      .then((r) => (r.ok ? (r.json() as Promise<DailyMessage>) : Promise.reject(new Error(String(r.status)))))
      .then((m) => save({ date: today, text: m.text, verse: m.verse ?? null, source: m.source === "ai" ? "ai" : "local" }))
      .catch(() => save(local));
  }, [cached, today, s, mutate]);

  return cached ?? pickLocalMessage(s.me, today);
}
