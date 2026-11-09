// Regras financeiras puras. Valores SEMPRE em centavos (inteiros).
import type { AppState, CreditCard, FinAccount, FinanceState, Recurring, Transaction, TxIgnore, TxKind, TxSplit } from "@/lib/types";
import { uid } from "@/lib/id";
import { addDays, pad, toDateKey } from "@/lib/dates";

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
  const spent = f.transactions.filter((t) => t.cardId === card.id && t.kind === "expense" && !t.ignore?.limit).reduce((s, t) => s + t.amount, 0);
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

// ---------- Onde cada lançamento conta ----------

export type Purpose = "stats" | "budget" | "savings" | "totals";

/** Ajustes de saldo nunca contam; o usuário pode tirar um lançamento de cada cálculo ("Ignorar em…"). */
export function counts(t: Transaction, purpose: Purpose): boolean {
  return !t.isAdjust && !t.ignore?.[purpose];
}

/** Valor por categoria (respeita multicategorias). */
export function categoryParts(t: Transaction): { categoryId: string | null; amount: number }[] {
  return t.splits?.length ? t.splits : [{ categoryId: t.categoryId, amount: t.amount }];
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

export function includedAccounts(f: FinanceState) {
  return f.accounts.filter((a) => !a.archived && a.includeInTotal !== false);
}

export function totalBalance(f: FinanceState, upTo?: string): number {
  return includedAccounts(f).reduce((s, a) => s + accountBalance(f, a, upTo), 0);
}

export function monthTransactions(f: FinanceState, month: string): Transaction[] {
  return f.transactions
    .filter((t) => monthOf(t.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "") || b.createdAt.localeCompare(a.createdAt));
}

export function monthSummary(f: FinanceState, month: string, today = toDateKey()) {
  const txs = monthTransactions(f, month).filter((t) => !t.isAdjust);
  const income = txs.filter((t) => t.kind === "income" && counts(t, "totals")).reduce((s, t) => s + t.amount, 0);
  const incomePending = txs.filter((t) => t.kind === "income" && !t.paid).reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.kind === "expense" && counts(t, "totals")).reduce((s, t) => s + t.amount, 0);
  const expensePending = txs.filter((t) => t.kind === "expense" && !t.cardId && !t.paid).reduce((s, t) => s + t.amount, 0);
  const invoicesDue = f.cards
    .filter((c) => !c.archived)
    .reduce((s, c) => s + invoice(f, c, month, today).remaining, 0);
  const balance = totalBalance(f);
  const isCurrentOrFuture = month >= monthOf(today);
  const forecast = isCurrentOrFuture ? balance + incomePending - expensePending - invoicesDue : balance;
  return { income, incomePending, expense, expensePending, invoicesDue, result: income - expense, balance, forecast };
}

export function spendByCategory(f: FinanceState, month: string, purpose: Purpose = "stats") {
  const map = new Map<string | null, number>();
  for (const t of monthTransactions(f, month)) {
    if (t.kind !== "expense" || !counts(t, purpose)) continue;
    for (const p of categoryParts(t)) map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + p.amount);
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
  // Parcelar ou repetir
  startInstallment?: number; // começar na parcela N (compra já em andamento)
  frequency?: Frequency;
  perInstallment?: boolean; // true = o valor informado é de cada parcela (repetir); false = valor total (dividir)
  invoiceMonth?: string | null; // fatura escolhida (compras no cartão)
  time?: string | null;
  subcategory?: string | null;
  splits?: TxSplit[] | null;
  tags?: string[];
  extra?: Transaction["extra"];
  ignore?: TxIgnore;
}

export type Frequency = "monthly" | "weekly" | "biweekly" | "yearly";

export const FREQUENCY_LABEL: Record<Frequency, string> = { monthly: "Mensal", weekly: "Semanal", biweekly: "Quinzenal", yearly: "Anual" };

/** Data da k-ésima ocorrência a partir de `date`. */
export function occurrenceDate(date: string, k: number, freq: Frequency = "monthly"): string {
  if (freq === "weekly") return addDays(date, 7 * k);
  if (freq === "biweekly") return addDays(date, 14 * k);
  return shiftDate(date, freq === "yearly" ? 12 * k : k);
}

function scaleSplits(splits: TxSplit[] | null | undefined, total: number, amount: number): TxSplit[] | null {
  if (!splits?.length) return null;
  if (total === amount) return splits.map((x) => ({ ...x }));
  let used = 0;
  return splits.map((x, i) => {
    const v = i === splits.length - 1 ? amount - used : Math.round((x.amount * amount) / total);
    used += v;
    return { categoryId: x.categoryId, amount: v };
  });
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
    time: i.time ?? null,
    subcategory: i.subcategory?.trim() || null,
    splits: i.kind === "transfer" ? null : (i.splits?.length ? i.splits.map((x) => ({ ...x })) : null),
    tags: i.tags?.length ? [...new Set(i.tags)] : undefined,
    extra: i.extra ?? null,
    ignore: i.ignore && Object.values(i.ignore).some(Boolean) ? { ...i.ignore } : undefined,
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
      t.invoiceMonth = i.invoiceMonth || invoiceMonthFor(card, t.date);
      t.paid = true; // compra no cartão: quem é paga é a fatura
    }
    f.transactions.push(t);
    return;
  }

  // Parcelado/repetido. Valor total: divide em centavos (sobra na 1ª parcela). Valor da parcela: repete o valor.
  const freq = i.frequency ?? "monthly";
  const start = Math.max(1, Math.min(n, Math.floor(i.startInstallment ?? 1)));
  const groupId = uid();
  const part = i.perInstallment ? i.amount : Math.floor(i.amount / n);
  const rest = i.perInstallment ? 0 : i.amount - part * n;
  const firstInvoice = card ? i.invoiceMonth || invoiceMonthFor(card, i.date) : null;
  const totalForSplits = i.splits?.reduce((a, x) => a + x.amount, 0) ?? 0;
  for (let p = start; p <= n; p++) {
    const k = p - start; // ocorrência a partir da data informada
    const amount = part + (p === 1 ? rest : 0);
    const t = baseTx({ ...i, amount });
    t.splits = scaleSplits(i.splits, totalForSplits, amount);
    t.installment = { groupId, n: p, total: n };
    t.date = occurrenceDate(i.date, k, freq);
    if (card) {
      // Cada parcela conta no seu mês e cai na fatura seguinte.
      t.invoiceMonth = freq === "monthly" ? addMonths(firstInvoice!, k) : k === 0 ? firstInvoice : invoiceMonthFor(card, t.date);
      t.paid = true;
    } else {
      t.paid = k === 0 ? i.paid : false;
    }
    f.transactions.push(t);
  }
}

export function updateTransaction(s: AppState, id: string, patch: Partial<Transaction>) {
  const t = s.finance.transactions.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  if (t.cardId && t.kind === "expense" && !patch.invoiceMonth) {
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
  f.accounts.push({
    id: uid(),
    name: a.name,
    type: a.type ?? "checking",
    initialBalance: a.initialBalance ?? 0,
    color: a.color ?? "#2e6b57",
    archived: false,
    bank: a.bank ?? null,
    includeInTotal: a.includeInTotal ?? true,
  });
}

export function saveCard(s: AppState, c: Partial<CreditCard> & { name: string }) {
  const f = s.finance;
  if (c.id) {
    const ex = f.cards.find((x) => x.id === c.id);
    if (ex) Object.assign(ex, c);
    return;
  }
  f.cards.push({
    id: uid(),
    name: c.name,
    limit: c.limit ?? 0,
    closingDay: c.closingDay ?? 1,
    dueDay: c.dueDay ?? 10,
    color: c.color ?? "#173a5b",
    archived: false,
    bank: c.bank ?? null,
    brand: c.brand ?? null,
    payAccountId: c.payAccountId ?? null,
  });
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

// ---------- Resumo avançado ----------

/** Saldo de uma conta previsto até uma data (inclui pendentes até lá). */
export function accountForecast(f: FinanceState, acc: FinAccount, upTo: string): number {
  let b = accountBalance(f, acc);
  for (const t of f.transactions) {
    if (t.paid || t.date > upTo) continue;
    if (t.kind === "income" && t.accountId === acc.id) b += t.amount;
    else if (t.kind === "expense" && !t.cardId && t.accountId === acc.id) b -= t.amount;
    else if (t.kind === "transfer") {
      if (t.accountId === acc.id) b -= t.amount;
      if (t.toAccountId === acc.id) b += t.amount;
    }
  }
  return b;
}

/** Saldo no início do mês (fim do mês anterior). */
export function startBalance(f: FinanceState, month: string): number {
  return totalBalance(f, `${addMonths(month, -1)}-31`);
}

/** Saldo dia a dia do mês: realizado até hoje e previsto depois. */
export function dailyBalances(f: FinanceState, month: string, today = toDateKey()) {
  const days = daysInMonth(month);
  const out: { date: string; value: number; projected: boolean }[] = [];
  const pendingInvoices = f.cards
    .filter((c) => !c.archived)
    .map((c) => {
      const inv = invoice(f, c, month, today);
      return { due: inv.due, amount: inv.remaining };
    })
    .filter((x) => x.amount > 0);
  for (let d = 1; d <= days; d++) {
    const date = dateInMonth(month, d);
    if (date <= today) out.push({ date, value: totalBalance(f, date), projected: false });
    else {
      let v = includedAccounts(f).reduce((s, a) => s + accountForecast(f, a, date), 0);
      v -= pendingInvoices.filter((i) => i.due <= date && i.due > today).reduce((s, i) => s + i.amount, 0);
      out.push({ date, value: v, projected: true });
    }
  }
  return out;
}

export function savingsRate(f: FinanceState, month: string) {
  const txs = monthTransactions(f, month).filter((t) => counts(t, "savings") && counts(t, "totals"));
  const income = txs.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount, 0);
  const saved = income - expense;
  return { income, expense, saved, pct: income > 0 ? Math.round((saved / income) * 100) : null };
}

/** Total das faturas do mês (todos os cartões) e limite disponível somado. */
export function cardsOverview(f: FinanceState, month: string, today = toDateKey()) {
  const cards = f.cards.filter((c) => !c.archived);
  const invoices = cards.reduce((s, c) => s + invoice(f, c, month, today).total, 0);
  const available = cards.reduce((s, c) => s + (c.limit - cardUsed(f, c)), 0);
  return { invoices, available, count: cards.length };
}

/** Cria um lançamento de ajuste para o saldo da conta ficar igual ao informado. */
export function adjustBalance(s: AppState, accountId: string, realBalance: number, date = toDateKey()) {
  const acc = s.finance.accounts.find((a) => a.id === accountId);
  if (!acc) return 0;
  const diff = realBalance - accountBalance(s.finance, acc);
  if (!diff) return 0;
  s.finance.transactions.push({
    id: uid(),
    kind: diff > 0 ? "income" : "expense",
    amount: Math.abs(diff),
    date,
    description: "Ajuste de saldo",
    categoryId: null,
    accountId,
    toAccountId: null,
    cardId: null,
    invoiceMonth: null,
    paid: true,
    installment: null,
    recurringId: null,
    notes: "",
    createdAt: new Date().toISOString(),
    isAdjust: true,
  });
  return diff;
}

// ---------- Objetivos (juntar dinheiro) ----------

export function goalSaved(g: { entries: { amount: number }[] }) {
  return g.entries.reduce((s, e) => s + e.amount, 0);
}

export function monthsLeft(deadline: string | null, today = toDateKey()) {
  if (!deadline) return null;
  const [y1, m1] = today.split("-").map(Number);
  const [y2, m2] = deadline.split("-").map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1));
}

/** Linhas CSV (ponto e vírgula, padrão Excel BR) de todos os lançamentos. */
export function transactionsCsv(f: FinanceState): string {
  const cat = (id: string | null) => f.categories.find((c) => c.id === id)?.name ?? "";
  const acc = (id: string | null) => f.accounts.find((a) => a.id === id)?.name ?? "";
  const card = (id: string | null) => f.cards.find((c) => c.id === id)?.name ?? "";
  const kindLabel: Record<string, string> = { income: "Receita", expense: "Despesa", transfer: "Transferência", card_payment: "Pagamento de fatura" };
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["Data", "Tipo", "Descrição", "Categoria", "Subcategoria", "Conta", "Cartão", "Valor", "Pago", "Parcela", "Etiquetas"];
  const rows = [...f.transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [
      t.date.split("-").reverse().join("/"),
      kindLabel[t.kind] ?? t.kind,
      t.description,
      t.splits?.length ? t.splits.map((x) => `${cat(x.categoryId) || "Sem categoria"} ${(x.amount / 100).toFixed(2).replace(".", ",")}`).join(" + ") : cat(t.categoryId),
      t.subcategory ?? "",
      acc(t.accountId),
      card(t.cardId),
      ((t.kind === "expense" || t.kind === "card_payment" ? -1 : 1) * t.amount / 100).toFixed(2).replace(".", ","),
      t.paid ? "Sim" : "Não",
      t.installment ? `${t.installment.n}/${t.installment.total}` : "",
      (t.tags ?? []).map((x) => `#${x}`).join(" "),
    ]);
  return [head, ...rows].map((r) => r.map((c) => esc(String(c))).join(";")).join("\r\n");
}
