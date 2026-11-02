// Metas, hábitos, humor, revisão semanal e conquistas (regras puras).
import type { AppState, Habit } from "./types";
import { addDays, fromDateKey, toDateKey, weekStart } from "./dates";
import { monthOf, monthSummary, spendByCategory } from "./finance/logic";

export function isHabitDay(h: Habit, date: string) {
  return h.active && h.weekdays.includes(fromDateKey(date).getDay());
}

export function habitsFor(s: AppState, date = toDateKey()) {
  return s.growth.habits.filter((h) => isHabitDay(h, date));
}

/** Sequência de dias planejados cumpridos (dias fora da agenda do hábito não quebram). */
export function habitStreak(h: Habit, today = toDateKey()) {
  const done = new Set(h.log);
  let n = 0;
  let d = today;
  if (!done.has(today)) d = addDays(today, -1); // hoje ainda pode ser feito
  for (let i = 0; i < 400; i++) {
    if (isHabitDay(h, d) || !h.active) {
      if (!done.has(d)) break;
      n++;
    }
    d = addDays(d, -1);
  }
  return n;
}

export function lastDays(today: string, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

export function toggleHabit(s: AppState, id: string, date = toDateKey()) {
  const h = s.growth.habits.find((x) => x.id === id);
  if (!h) return;
  h.log = h.log.includes(date) ? h.log.filter((x) => x !== date) : [...h.log, date].slice(-800);
}

export function weekStats(s: AppState, today = toDateKey()) {
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d <= today);
  let planned = 0;
  let done = 0;
  for (const d of days)
    for (const h of s.growth.habits)
      if (isHabitDay(h, d)) {
        planned++;
        if (h.log.includes(d)) done++;
      }
  const routineDone = days.reduce((a, d) => a + (s.completions[d]?.length ?? 0), 0);
  const gratitude = s.faith.gratitude.filter((g) => g.date >= start).length;
  const moods = s.growth.moods.filter((m) => m.date >= start);
  const avgMood = moods.length ? moods.reduce((a, m) => a + m.mood, 0) / moods.length : null;
  const spent = s.finance.transactions.filter((t) => t.kind === "expense" && t.date >= start && t.date <= today).reduce((a, t) => a + t.amount, 0);
  const moments = s.moments.filter((m) => m.status === "completed" && (m.occurredAt ?? "") >= start).length;
  return { start, habitsPct: planned ? Math.round((done / planned) * 100) : null, routineDone, gratitude, avgMood, spent, moments };
}

export interface Achievement {
  id: string;
  title: string;
  sub: string;
}

export function achievements(s: AppState, today = toDateKey()): Achievement[] {
  const a: Achievement[] = [];
  const best = Math.max(0, ...s.growth.habits.map((h) => habitStreak(h, today)));
  if (best >= 3) a.push({ id: "h3", title: "Pegando ritmo", sub: "3 dias seguidos num hábito" });
  if (best >= 7) a.push({ id: "h7", title: "Uma semana firme", sub: "7 dias seguidos num hábito" });
  if (best >= 21) a.push({ id: "h21", title: "Hábito formado", sub: "21 dias seguidos" });
  if (s.growth.goals.some((g) => g.status === "done")) a.push({ id: "goal", title: "Meta cumprida", sub: "Você concluiu uma meta" });
  if (s.faith.gratitude.length >= 7) a.push({ id: "grat7", title: "Coração grato", sub: "7 dias de gratidão" });
  if (s.faith.prayers.some((p) => p.answeredAt)) a.push({ id: "pray", title: "Testemunho", sub: "Um pedido respondido" });
  if (s.books.some((b) => b.status === "completed")) a.push({ id: "book", title: "Leitor", sub: "Um livro concluído" });
  if (s.bibleReadings.length >= 7) a.push({ id: "bible7", title: "Na Palavra", sub: "7 capítulos lidos" });
  if (s.growth.reviews.length >= 1) a.push({ id: "review", title: "Olhar para trás", sub: "Primeira revisão semanal" });
  const m = monthOf(today);
  const spend = spendByCategory(s.finance, m);
  const budgets = s.finance.categories.filter((c) => c.budget);
  if (budgets.length && budgets.every((c) => (spend.get(c.id) ?? 0) <= (c.budget ?? 0)) && s.finance.transactions.length > 5)
    a.push({ id: "budget", title: "Dentro do orçamento", sub: "Todas as categorias no limite" });
  if (monthSummary(s.finance, m, today).result > 0 && s.finance.transactions.some((t) => t.kind === "income"))
    a.push({ id: "positive", title: "Mês no azul", sub: "Receitas maiores que despesas" });
  return a;
}

export const MOODS = [
  { v: 1, label: "Muito mal" },
  { v: 2, label: "Mal" },
  { v: 3, label: "Ok" },
  { v: 4, label: "Bem" },
  { v: 5, label: "Muito bem" },
];
