// NORTE — avisos do dia: contas a vencer, leitura, prioridades e rotina.
// Sem dependências de propósito: o mesmo arquivo roda no app (prévia) e na função "notify" do Supabase,
// que o recebe como cópia na hora do deploy (scripts/deploy-notify.mjs).

type Tx = {
  kind: string;
  amount: number;
  date: string;
  description: string;
  cardId: string | null;
  paid: boolean;
  isAdjust?: boolean;
  recurringId: string | null;
  invoiceMonth?: string | null;
};
type Rec = { id: string; kind: string; amount: number; description: string; cardId: string | null; day: number; startMonth: string; active: boolean };
type Card = { id: string; name: string; dueDay: number; archived: boolean };

export interface ReminderState {
  profile?: { displayName?: string };
  finance?: { transactions?: Tx[]; recurring?: Rec[]; cards?: Card[]; hideValues?: boolean };
  bible?: { book?: string; currentUnit?: number; totalUnits?: number } | null;
  books?: { title: string; status: string }[];
  routine?: { active: boolean; kind?: string }[];
  priorities?: { date: string; status: string }[];
}

export interface ReminderPrefs {
  hour: number; // hora local do aviso da manhã (0–23)
  agenda?: boolean; // compromissos do dia (Google Agenda) — padrão: sim
  bills: boolean; // contas a pagar e receber
  daysBefore: number; // avisar com quantos dias de antecedência (0 = só no dia)
  daily: boolean; // resumo do dia: leitura, prioridades, rotina e mensagem
}

export const DEFAULT_PREFS: ReminderPrefs = { hour: 8, bills: true, daysBefore: 1, daily: true, agenda: true };

/** Compromisso do dia (vindo do Google Agenda). */
export interface DayEvent {
  title: string;
  time: string | null; // null = dia inteiro
}

export interface DayMessage {
  date: string;
  text: string;
}

export interface Bill {
  date: string;
  description: string;
  amount: number | null; // centavos (null = valor da fatura não calculado aqui)
  kind: "expense" | "income" | "invoice";
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function dateInMonth(month: string, day: number): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${pad(Math.min(Math.max(1, day), last))}`;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmt(cents: number | null, hide: boolean): string {
  if (cents == null || hide) return "";
  return ` ${BRL.format(cents / 100)}`;
}

/** Data local (YYYY-MM-DD) e hora local num fuso horário. */
export function localNow(tz: string, now = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

/** Contas que vencem de hoje até hoje+daysBefore (inclui fixas ainda não lançadas e faturas de cartão). */
export function upcomingBills(s: ReminderState, today: string, daysBefore: number): Bill[] {
  const f = s.finance ?? {};
  const txs = f.transactions ?? [];
  const end = addDays(today, Math.max(0, daysBefore));
  const inRange = (d: string) => d >= today && d <= end;
  const out: Bill[] = [];

  for (const t of txs) {
    if (t.paid || t.cardId || t.isAdjust) continue;
    if (t.kind !== "expense" && t.kind !== "income") continue;
    if (inRange(t.date)) out.push({ date: t.date, description: t.description || "Lançamento", amount: t.amount, kind: t.kind });
  }

  // Lançamentos fixos ("todo dia 10") cujo mês ainda não foi gerado no app.
  const months = new Set([today.slice(0, 7), end.slice(0, 7)]);
  for (const r of f.recurring ?? []) {
    if (!r.active || r.cardId) continue;
    for (const m of months) {
      if (r.startMonth > m) continue;
      const date = dateInMonth(m, r.day);
      if (!inRange(date)) continue;
      if (txs.some((t) => t.recurringId === r.id && t.date.slice(0, 7) === m)) continue;
      out.push({ date, description: r.description || "Conta fixa", amount: r.amount, kind: r.kind === "income" ? "income" : "expense" });
    }
  }

  for (const c of f.cards ?? []) {
    if (c.archived) continue;
    for (const m of months) {
      const date = dateInMonth(m, c.dueDay);
      if (!inRange(date)) continue;
      // Valor em aberto da fatura que vence neste mês (compras − pagamentos).
      const ofInvoice = txs.filter((t) => t.cardId === c.id && t.invoiceMonth === m);
      const total = ofInvoice.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount, 0);
      const paid = ofInvoice.filter((t) => t.kind === "card_payment" && t.paid).reduce((a, t) => a + t.amount, 0);
      const remaining = total - paid;
      if (remaining > 0) out.push({ date, description: `Fatura ${c.name}`, amount: remaining, kind: "invoice" });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
}

function whenLabel(date: string, today: string): string {
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  return `Dia ${Number(date.slice(8, 10))}`;
}

/** Monta as notificações da manhã. Lista vazia = nada a avisar. */
export function buildNotifications(s: ReminderState, today: string, prefs: ReminderPrefs, messages: DayMessage[] = [], events: DayEvent[] = []): PushMessage[] {
  const out: PushMessage[] = [];
  const hide = Boolean(s.finance?.hideValues);

  if (prefs.bills) {
    const bills = upcomingBills(s, today, prefs.daysBefore);
    if (bills.length) {
      const pay = bills.filter((b) => b.kind !== "income");
      const lines = bills.slice(0, 5).map((b) => `${whenLabel(b.date, today)}: ${b.kind === "income" ? "receber " : ""}${b.description}${fmt(b.amount, hide)}`);
      if (bills.length > 5) lines.push(`+ ${bills.length - 5} outras`);
      const todayCount = bills.filter((b) => b.date === today).length;
      out.push({
        title: todayCount ? `${todayCount === 1 ? "1 conta vence" : `${todayCount} contas vencem`} hoje` : pay.length ? "Contas chegando" : "Valores a receber",
        body: lines.join("\n"),
        url: "/financas/transacoes/?tipo=pendentes",
        tag: `contas-${today}`,
      });
    }
  }

  const showAgenda = prefs.agenda !== false;
  if (prefs.daily || (showAgenda && events.length)) {
    const lines: string[] = [];
    if (showAgenda) {
      if (events.length) {
        const list = events.slice(0, 4).map((e) => (e.time ? `${e.time} ${e.title}` : e.title));
        lines.push(`Hoje: ${list.join(" · ")}${events.length > 4 ? ` · +${events.length - 4}` : ""}`);
      } else if (prefs.daily) lines.push("Agenda livre hoje.");
    }
    const msg = prefs.daily ? messages.find((m) => m.date === today)?.text : undefined;
    if (msg) lines.push(msg);
    const name = s.profile?.displayName?.trim();
    if (lines.length) out.push({ title: name ? `Bom dia, ${name}!` : "Bom dia!", body: lines.join("\n"), url: events.length ? "/agenda/" : "/hoje/", tag: `dia-${today}` });
  }

  return out;
}
