// Regras financeiras puras. Valores SEMPRE em centavos (inteiros).
import type { AppState, CreditCard, FinAccount, FinanceState, Recurring, Transaction, TxKind } from "@/lib/types";
import { uid } from "@/lib/id";
import { pad, toDateKey } from "@/lib/dates";

// ---------- Dinheiro ----------

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function money(cents: number, hide = false): string {
  if (hide) return "R$ •••••";
  return BRL.format((cents || 0) / 100);
}

/** Aceita "1.234,56", "1234,5", "1234.56", "R$ 10" e devolve centavos. */
export function parseMoney(input: string): number | null {
  let t = input.replace(/[^\d,.-]/g, "").trim();
  if (!t) return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) t = t.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma >= 0) t = t.replace(/,/g, "");
  else if (lastDot >= 0 && t.length - lastDot - 1 === 3 && !t.includes(",")) t = t.replace(/\./g, ""); // "1.234"
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.abs(n) * 100);
}

/** Centavos para texto editável "1234,56". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

// ---------- Meses ----------

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function currentMonth(): string {
  return monthOf(toDateKey());
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function dateInMonth(month: string, day: number): string {
  return `${month}-${pad(Math.min(Math.max(1, day), daysInMonth(month)))}`;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function shortMonth(month: string): string {
  const [, m] = month.split("-").map(Number);
  return MONTHS_SHORT[m - 1];
}

export function dayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${pad(d)} ${MONTHS_SHORT[m - 1]}`;
}

// ---------- Cartão de crédito ----------

/** Mês (de vencimento) da fatura em que cai uma compra feita em `date`. */
export function invoiceMonthFor(card: CreditCard, date: string): string {
  const day = Number(date.slice(8, 10));
  const closeMonth = day <= card.closingDay ? monthOf(date) : addMonths(monthOf(date), 1);
  return card.dueDay > card.closingDay ? closeMonth : addMonths(closeMonth, 1);
}

export function invoiceDates(card: CreditCard, month: string) {
  const due = dateInMonth(month, card.dueDay);
  const closeMonth = card.dueDay > card.closingDay ? month : addMonths(month, -1);
  const closing = dateInMonth(closeMonth, card.closingDay);
  return { due, closing };
}

export type InvoiceStatus = "open" | "closed" | "paid" | "empty";

export function invoice(f: FinanceState, card: CreditCard, month: string, today = toDateKey()) {
  const items = f.transactions
    .filter((t) => t.cardId === card.id && t.kind === "expense" && t.invoiceMonth === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((s, t) => s + t.amount, 0);
  const paid = f.transactions
    .filter((t) => t.cardId === card.id && t.kind === "card_payment" && t.invoiceMonth === month && t.paid)
    .reduce((s, t) => s + t.amount, 0);
  const { due, closing } = invoiceDates(card, month);
  let status: InvoiceStatus = "open";
  if (total === 0) status = paid > 0 ? "paid" : "empty";
  else if (paid >= total) status = "paid";
  else if (today > closing) status = "closed";
  return { items, total, paid, remaining: Math.max(0, total - paid), due, closing, status, overdue: status === "closed" && today > due };
}

/** Limite usado = compras ainda não pagas (todas as faturas). */
export function cardUsed(f: FinanceState, card: CreditCard): number {
  const spent = f.transactions.filter((t) => t.cardId === card.id && t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const paid = f.transactions.filter((t) => t.cardId === card.id && t.kind === "card_payment" && t.paid).reduce((s, t) => s + t.amount, 0);
  return Math.max(0, spent - paid);
}

/** Fatura "atual" a mostrar: a primeira não paga a partir do mês corrente. */
export function currentInvoiceMonth(f: FinanceState, card: CreditCard, today = toDateKey()): string {
  const base = invoiceMonthFor(card, today);
  const prev = addMonths(base, -1);
  const inv = invoice(f, card, prev, today);
  return inv.status === "closed" ? prev : base;
}

// ---------- Saldos ----------

export function accountBalance(f: FinanceState, acc: FinAccount, upTo?: string): number {
  let b = acc.initialBalance;
  for (const t of f.transactions) {
    if (!t.paid) continue;
    if (upTo && t.date > upTo) continue;
    if (t.kind === "income" && t.accountId === acc.id) b += t.amount;
    else if (t.kind === "expense" && !t.cardId && t.accountId === acc.id) b -= t.amount;
    else if (t.kind === "card_payment" && t.accountId === acc.id) b -= t.amount;
    else if (t.kind === "transfer") {
      if (t.accountId === acc.id) b -= t.amount;
      if (t.toAccountId === acc.id) b += t.amount;
    }
  }
  return b;
}

export function totalBalance(f: FinanceState): number {
  return f.accounts.filter((a) => !a.archived).reduce((s, a) => s + accountBalance(f, a), 0);
}

export function monthTransactions(f: FinanceState, month: string): Transaction[] {
  return f.transactions.filter((t) => monthOf(t.date) === month).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function monthSummary(f: FinanceState, month: string, today = toDateKey()) {
  const txs = monthTransactions(f, month);
  const income = txs.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const incomePending = txs.filter((t) => t.kind === "income" && !t.paid).reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const expensePending = txs.filter((t) => t.kind === "expense" && !t.cardId && !t.paid).reduce((s, t) => s + t.amount, 0);
  const invoicesDue = f.cards
    .filter((c) => !c.archived)
    .reduce((s, c) => s + invoice(f, c, month, today).remaining, 0);
  const balance = totalBalance(f);
  const isCurrentOrFuture = month >= monthOf(today);
  const forecast = isCurrentOrFuture ? balance + incomePending - expensePending - invoicesDue : balance;
  return { income, incomePending, expense, expensePending, invoicesDue, result: income - expense, balance, forecast };
}

export function spendByCategory(f: FinanceState, month: string) {
  const map = new Map<string | null, number>();
  for (const t of monthTransactions(f, month)) {
    if (t.kind !== "expense") continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return map;
}

/** Contas a pagar/receber pendentes até `days` dias à frente (inclui atrasadas). */
export function upcomingBills(f: FinanceState, today = toDateKey(), days = 7) {
  const limit = new Date(`${today}T00:00:00`);
  limit.setDate(limit.getDate() + days);
  const lim = toDateKey(limit);
  const bills: { id: string; label: string; date: string; amount: number; kind: "tx" | "invoice"; overdue: boolean; income: boolean; cardId?: string; month?: string }[] = [];
  for (const t of f.transactions) {
    if (t.paid || t.cardId || (t.kind !== "expense" && t.kind !== "income")) continue;
    if (t.date <= lim) bills.push({ id: t.id, label: t.description || "Lançamento", date: t.date, amount: t.amount, kind: "tx", overdue: t.date < today, income: t.kind === "income" });
  }
  for (const c of f.cards.filter((x) => !x.archived)) {
    for (const m of [addMonths(monthOf(today), -1), monthOf(today), addMonths(monthOf(today), 1)]) {
      const inv = invoice(f, c, m, today);
      if (inv.remaining > 0 && inv.due <= lim && (inv.status === "closed" || inv.due >= today))
        bills.push({ id: `${c.id}:${m}`, label: `Fatura ${c.name}`, date: inv.due, amount: inv.remaining, kind: "invoice", overdue: inv.due < today, income: false, cardId: c.id, month: m });
    }
  }
  return bills.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Mutações ----------

export interface TxInput {
  kind: TxKind;
  amount: number;
  date: string;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  toAccountId?: string | null;
  cardId: string | null;
  paid: boolean;
  installments?: number; // 1 = à vista
  repeatMonthly?: boolean;
  notes?: string;
  attachmentId?: string | null;
  nfce?: { chave: string; url: string } | null;
}

function baseTx(i: TxInput): Transaction {
  return {
    id: uid(),
    kind: i.kind,
    amount: i.amount,
    date: i.date,
    description: i.description.trim(),
    categoryId: i.kind === "transfer" ? null : i.categoryId,
    accountId: i.cardId && i.kind === "expense" ? null : i.accountId,
    toAccountId: i.kind === "transfer" ? (i.toAccountId ?? null) : null,
    cardId: i.kind === "expense" ? i.cardId : null,
    invoiceMonth: null,
    paid: i.paid,
    installment: null,
    recurringId: null,
    notes: i.notes?.trim() ?? "",
    createdAt: new Date().toISOString(),
    attachmentId: i.attachmentId ?? null,
    nfce: i.nfce ?? null,
  };
}

function shiftDate(date: string, months: number): string {
  const m = addMonths(monthOf(date), months);
  return dateInMonth(m, Number(date.slice(8, 10)));
}

export function addTransaction(s: AppState, i: TxInput) {
  const f = s.finance;
  const card = i.cardId ? f.cards.find((c) => c.id === i.cardId) : undefined;
  const n = Math.max(1, Math.min(48, Math.floor(i.installments ?? 1)));

  if (i.repeatMonthly && n === 1 && (i.kind === "expense" || i.kind === "income")) {
    const rec: Recurring = {
      id: uid(),
      kind: i.kind,
      amount: i.amount,
      description: i.description.trim(),
      categoryId: i.categoryId,
      accountId: card ? null : i.accountId,
      cardId: card?.id ?? null,
      day: Number(i.date.slice(8, 10)),
      startMonth: monthOf(i.date),
      active: true,
    };
    f.recurring.push(rec);
    const t = baseTx(i);
    t.recurringId = rec.id;
    if (card) {
      t.invoiceMonth = invoiceMonthFor(card, t.date);
      t.paid = true;
    }
    f.transactions.push(t);
    return;
  }

  if (n === 1) {
    const t = baseTx(i);
    if (card) {
      t.invoiceMonth = invoiceMonthFor(card, t.date);
      t.paid = true; // compra no cartão: quem é paga é a fatura
    }
    f.transactions.push(t);
    return;
  }

  // Parcelado: divide em centavos, sobra vai para a 1ª parcela
  const groupId = uid();
  const part = Math.floor(i.amount / n);
  const rest = i.amount - part * n;
  const firstInvoice = card ? invoiceMonthFor(card, i.date) : null;
  for (let k = 0; k < n; k++) {
    const t = baseTx({ ...i, amount: part + (k === 0 ? rest : 0) });
    t.installment = { groupId, n: k + 1, total: n };
    if (card) {
      // Cada parcela conta no seu mês (como nos apps de finanças) e cai na fatura seguinte.
      t.date = shiftDate(i.date, k);
      t.invoiceMonth = addMonths(firstInvoice!, k);
      t.paid = true;
    } else {
      t.date = shiftDate(i.date, k);
      t.paid = k === 0 ? i.paid : false;
    }
    f.transactions.push(t);
  }
}

export function updateTransaction(s: AppState, id: string, patch: Partial<Transaction>) {
  const t = s.finance.transactions.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  if (t.cardId && t.kind === "expense") {
    const card = s.finance.cards.find((c) => c.id === t.cardId);
    if (card && !t.installment) t.invoiceMonth = invoiceMonthFor(card, t.date);
  }
}

export function deleteTransaction(s: AppState, id: string, scope: "one" | "next" | "all" = "one") {
  const f = s.finance;
  const t = f.transactions.find((x) => x.id === id);
  if (!t) return;
  if (t.installment && scope !== "one") {
    const g = t.installment.groupId;
    f.transactions = f.transactions.filter((x) => !(x.installment?.groupId === g && (scope === "all" || x.installment.n >= t.installment!.n)));
    return;
  }
  if (t.recurringId && scope !== "one") {
    // Encerra o lançamento fixo: some este e as próximas ocorrências ainda não pagas.
    const r = f.recurring.find((x) => x.id === t.recurringId);
    if (r) r.active = false;
    f.transactions = f.transactions.filter((x) => x.id !== t.id && !(x.recurringId === t.recurringId && x.date >= t.date && (!x.paid || x.cardId)));
    return;
  }
  f.transactions = f.transactions.filter((x) => x.id !== id);
}

export function togglePaid(s: AppState, id: string) {
  const t = s.finance.transactions.find((x) => x.id === id);
  if (t && !t.cardId) t.paid = !t.paid;
}

/** Cria os lançamentos fixos do mês (pendentes) que ainda não existem. Retorna true se criou algo. */
export function materializeRecurring(s: AppState, month: string): boolean {
  const f = s.finance;
  let created = false;
  for (const r of f.recurring) {
    if (!r.active || r.startMonth > month) continue;
    if (f.transactions.some((t) => t.recurringId === r.id && monthOf(t.date) === month)) continue;
    const date = dateInMonth(month, r.day);
    const card = r.cardId ? f.cards.find((c) => c.id === r.cardId) : undefined;
    f.transactions.push({
      id: uid(),
      kind: r.kind,
      amount: r.amount,
      date,
      description: r.description,
      categoryId: r.categoryId,
      accountId: card ? null : r.accountId,
      toAccountId: null,
      cardId: card?.id ?? null,
      invoiceMonth: card ? invoiceMonthFor(card, date) : null,
      paid: Boolean(card),
      installment: null,
      recurringId: r.id,
      notes: "",
      createdAt: new Date().toISOString(),
    });
    created = true;
  }
  return created;
}

export function needsMaterialize(f: FinanceState, month: string): boolean {
  return f.recurring.some((r) => r.active && r.startMonth <= month && !f.transactions.some((t) => t.recurringId === r.id && monthOf(t.date) === month));
}

export function payInvoice(s: AppState, cardId: string, month: string, accountId: string, amount: number, date = toDateKey()) {
  s.finance.transactions.push({
    id: uid(),
    kind: "card_payment",
    amount,
    date,
    description: "Pagamento de fatura",
    categoryId: null,
    accountId,
    toAccountId: null,
    cardId,
    invoiceMonth: month,
    paid: true,
    installment: null,
    recurringId: null,
    notes: "",
    createdAt: new Date().toISOString(),
  });
}

export function saveAccount(s: AppState, a: Partial<FinAccount> & { name: string }) {
  const f = s.finance;
  if (a.id) {
    const ex = f.accounts.find((x) => x.id === a.id);
    if (ex) Object.assign(ex, a);
    return;
  }
  f.accounts.push({ id: uid(), name: a.name, type: a.type ?? "checking", initialBalance: a.initialBalance ?? 0, color: a.color ?? "#2e6b57", archived: false });
}

export function saveCard(s: AppState, c: Partial<CreditCard> & { name: string }) {
  const f = s.finance;
  if (c.id) {
    const ex = f.cards.find((x) => x.id === c.id);
    if (ex) Object.assign(ex, c);
    return;
  }
  f.cards.push({ id: uid(), name: c.name, limit: c.limit ?? 0, closingDay: c.closingDay ?? 1, dueDay: c.dueDay ?? 10, color: c.color ?? "#173a5b", archived: false });
}

/** Pode excluir de vez? Só se não houver lançamentos ligados; senão arquiva. */
export function removeAccount(s: AppState, id: string) {
  const f = s.finance;
  const used = f.transactions.some((t) => t.accountId === id || t.toAccountId === id);
  if (used) {
    const a = f.accounts.find((x) => x.id === id);
    if (a) a.archived = true;
  } else f.accounts = f.accounts.filter((x) => x.id !== id);
}

export function removeCard(s: AppState, id: string) {
  const f = s.finance;
  const used = f.transactions.some((t) => t.cardId === id);
  if (used) {
    const c = f.cards.find((x) => x.id === id);
    if (c) c.archived = true;
  } else f.cards = f.cards.filter((x) => x.id !== id);
}
