// Lembretes no Google Agenda sem login: abre o Google Agenda com o evento já preenchido
// (o usuário só toca em "Salvar"). Contas fixas viram evento mensal no mesmo dia.
import type { Recurring, Transaction } from "./types";
import { money } from "./finance/logic";

const compact = (date: string) => date.replaceAll("-", "");

function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/** Regra mensal que respeita meses curtos: "dia 31" cai no último dia de fevereiro, abril etc. */
export function monthlyRule(day: number): string {
  if (day <= 28) return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
  const days = Array.from({ length: day - 27 }, (_, i) => 28 + i).join(",");
  return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${days};BYSETPOS=-1`;
}

export function gcalUrl({ title, date, details, monthlyDay }: { title: string; date: string; details?: string; monthlyDay?: number | null }): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${compact(date)}/${compact(nextDay(date))}` });
  if (details) p.set("details", details);
  if (monthlyDay) p.set("recur", monthlyRule(monthlyDay));
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function title(kind: string, description: string, amount: number) {
  const verb = kind === "income" ? "Receber" : "Pagar";
  return `${verb}: ${description || "conta"} (${money(amount)})`;
}

const DETAILS = "Lembrete criado pelo NORTE. Marque como paga em Finanças.";

export function gcalForTransaction(t: Transaction, rec?: Recurring | null): string {
  return gcalUrl({ title: title(t.kind, t.description, t.amount), date: t.date, details: DETAILS, monthlyDay: rec?.active ? rec.day : null });
}

export function gcalForRecurring(r: Recurring, firstDate: string): string {
  return gcalUrl({ title: title(r.kind, r.description, r.amount), date: firstDate, details: DETAILS, monthlyDay: r.day });
}
