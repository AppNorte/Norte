"use client";

import { Annoyed, Frown, Laugh, Meh, Smile } from "lucide-react";
import { MOODS } from "@/lib/growth";
import { toDateKey } from "@/lib/dates";
import { useAppState } from "@/store/StoreProvider";

const ICONS = [Frown, Annoyed, Meh, Smile, Laugh];

/** Check-in rápido de humor e energia do dia. */
export function MoodCheck({ compact = false }: { compact?: boolean }) {
  const { s, mutate } = useAppState();
  const today = toDateKey();
  const entry = s.growth.moods.find((m) => m.date === today);

  const set = (patch: { mood?: number; energy?: number; note?: string }) =>
    mutate((d) => {
      const ex = d.growth.moods.find((m) => m.date === today);
      if (ex) Object.assign(ex, patch);
      else d.growth.moods.push({ date: today, mood: patch.mood ?? 3, energy: patch.energy ?? 3, note: patch.note ?? "" });
      d.growth.moods = d.growth.moods.slice(-400);
    });

  return (
    <div>
      <div className="moods" role="radiogroup" aria-label="Como você está hoje?">
        {MOODS.map((m, i) => {
          const I = ICONS[i];
          return (
            <button key={m.v} type="button" role="radio" aria-checked={entry?.mood === m.v} aria-label={m.label} className={`mood mood-${m.v}`} onClick={() => set({ mood: m.v })}>
              <I size={compact ? 26 : 30} strokeWidth={1.7} />
              {!compact && <small>{m.label}</small>}
            </button>
          );
        })}
      </div>
      {!compact && entry && (
        <>
          <div className="energy" role="radiogroup" aria-label="Energia">
            <span>Energia</span>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" role="radio" aria-checked={entry.energy === v} aria-label={`Energia ${v}`} className="energy-dot" data-on={entry.energy >= v} onClick={() => set({ energy: v })} />
            ))}
          </div>
          <input className="input" style={{ marginTop: 10 }} defaultValue={entry.note} placeholder="Quer anotar algo sobre hoje?" aria-label="Anotação do dia" onBlur={(e) => set({ note: e.target.value })} />
        </>
      )}
    </div>
  );
}
