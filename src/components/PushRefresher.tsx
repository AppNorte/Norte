"use client";

import { useEffect } from "react";
import { addDays, toDateKey } from "@/lib/dates";
import { pickLocalMessage } from "@/lib/faith/messages";
import { loadPrefs, refreshPush } from "@/lib/push";
import { upcomingBills, type DayMessage } from "@/lib/reminders";
import type { AppState } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";
import { useSync } from "@/store/SyncProvider";

/** Mensagens dos próximos 7 dias (cache do app ou coleção local) para o aviso da manhã. */
export function upcomingMessages(s: AppState): DayMessage[] {
  const today = toDateKey();
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    // Dia com conta vencendo: mensagem sobre mordomia; senão, a mensagem do dia.
    const hasBill = upcomingBills(s, date, 0).some((b) => b.kind !== "income");
    const cached = s.faith.daily.find((d) => d.date === date);
    const m = hasBill ? pickLocalMessage(s.me, date, 0, "financas") : (cached ?? pickLocalMessage(s.me, date));
    return { date, text: m.text.slice(0, 220) };
  });
}

const MARK = "norte:notify-refresh";

/** Ao abrir o app (1x por dia), atualiza no servidor o fuso e as mensagens dos próximos dias. */
export function PushRefresher() {
  const { s } = useAppState();
  const sync = useSync();
  const userId = sync.user?.id;
  useEffect(() => {
    if (!userId) return;
    const today = toDateKey();
    try {
      if (localStorage.getItem(MARK) === today) return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      refreshPush(loadPrefs(), upcomingMessages(s))
        .then((ok) => {
          if (ok) localStorage.setItem(MARK, today);
        })
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
    // Só ao entrar/abrir: não reenviar a cada alteração do estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  return null;
}
