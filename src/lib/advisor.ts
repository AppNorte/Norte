"use client";
// Conselheiro financeiro com IA: monta o RESUMO dos números (não o extrato inteiro) e chama a função "advisor".
import type { AppState } from "./types";
import { PUBLIC_CONFIG } from "./publicConfig";
import { getSupabase } from "./supabase";
import { toDateKey } from "./dates";
import { addMonths, cardUsed, counts, currentInvoiceMonth, goalSaved, invoice, monthOf, monthSummary, savingsRate, spendByCategory, totalBalance, upcomingBills } from "./finance/logic";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_CONFIG.supabaseAnonKey;
const reais = (c: number) => Math.round(c) / 100;

export interface AdvisorTurn {
  role: "user" | "assistant";
  content: string;
}

/** Resumo financeiro enviado à IA (valores em R$). */
export function financeSnapshot(s: AppState, today = toDateKey()) {
  const f = s.finance;
  const month = monthOf(today);
  const sum = monthSummary(f, month, today);
  const cat = (id: string | null) => f.categories.find((c) => c.id === id)?.name ?? "Sem categoria";
  const spend = [...spendByCategory(f, month).entries()].sort((a, b) => b[1] - a[1]);
  const history = [1, 2, 3].map((k) => {
    const m = addMonths(month, -k);
    const x = monthSummary(f, m, today);
    return { mes: m, receitas: reais(x.income), despesas: reais(x.expense) };
  });
  // Onde mais gasta neste mês (agrupado pela descrição)
  const byDesc = new Map<string, number>();
  for (const t of f.transactions) {
    if (t.kind !== "expense" || monthOf(t.date) !== month || !counts(t, "stats")) continue;
    const k = t.description.split(" - ").pop()!.trim().slice(0, 40) || "Sem descrição";
    byDesc.set(k, (byDesc.get(k) ?? 0) + t.amount);
  }
  return {
    hoje: today,
    nome: s.profile.displayName,
    saldo_total_contas: reais(totalBalance(f)),
    mes_atual: {
      mes: month,
      receitas: reais(sum.income),
      despesas: reais(sum.expense),
      a_receber: reais(sum.incomePending),
      a_pagar: reais(sum.expensePending),
      faturas_do_mes: reais(sum.invoicesDue),
      saldo_previsto_fim_do_mes: reais(sum.forecast),
      economia_percentual: savingsRate(f, month).pct,
    },
    meses_anteriores: history,
    gastos_por_categoria: spend.slice(0, 10).map(([id, v]) => ({ categoria: cat(id), valor: reais(v) })),
    maiores_gastos: [...byDesc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([d, v]) => ({ descricao: d, valor: reais(v) })),
    orcamentos: f.categories
      .filter((c) => c.kind === "expense" && c.budget)
      .map((c) => ({ categoria: c.name, limite: reais(c.budget!), gasto: reais(spendByCategory(f, month, "budget").get(c.id) ?? 0) })),
    contas: f.accounts.filter((a) => !a.archived).map((a) => ({ nome: a.name, tipo: a.type })),
    cartoes: f.cards
      .filter((c) => !c.archived)
      .map((c) => {
        const inv = invoice(f, c, currentInvoiceMonth(f, c, today), today);
        return { nome: c.name, limite: reais(c.limit), usado: reais(cardUsed(f, c)), fatura_atual: reais(inv.total), vencimento: inv.due, situacao: inv.status };
      }),
    contas_a_vencer_14_dias: upcomingBills(f, today, 14)
      .slice(0, 15)
      .map((b) => ({ descricao: b.label, data: b.date, valor: reais(b.amount), atrasada: b.overdue, tipo: b.income ? "receber" : "pagar" })),
    objetivos: f.goals
      .filter((g) => !g.archived)
      .map((g) => ({ nome: g.name, meta: reais(g.target), guardado: reais(goalSaved(g)), prazo: g.deadline })),
    contas_fixas: f.recurring.filter((r) => r.active).map((r) => ({ descricao: r.description, valor: reais(r.amount), dia: r.day, tipo: r.kind === "income" ? "entrada" : "saida" })),
  };
}

export async function advisorConfigured(): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/functions/v1/advisor`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(12_000) });
    return Boolean(((await r.json()) as { configured?: boolean }).configured);
  } catch {
    return false;
  }
}

export async function askAdvisor(question: string, history: AdvisorTurn[], snapshot: unknown): Promise<{ answer: string; remaining?: number }> {
  const sb = getSupabase();
  const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
  if (!data.session) throw new Error("Entre na sua conta do NORTE (Mais → Conta e backup) para usar o conselheiro.");
  const r = await fetch(`${URL_BASE}/functions/v1/advisor`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${data.session.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ question, history, snapshot }),
    signal: AbortSignal.timeout(120_000),
  });
  const j = (await r.json().catch(() => ({}))) as { answer?: string; remaining?: number; error?: string };
  if (!r.ok || !j.answer) throw new Error(j.error || "A IA não respondeu agora. Tente de novo.");
  return { answer: j.answer, remaining: j.remaining };
}
