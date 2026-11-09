"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard as CardIcon, FileUp, Landmark, Plus, ScanLine, Scale } from "lucide-react";
import { Bar, Card, CardHead, Check, Cta, HeadLink, useToast } from "@/components/ui";
import { CatDot } from "@/components/finance/FinIcon";
import { TxForm } from "@/components/finance/TxForm";
import { ImportSheet } from "@/components/finance/ImportSheet";
import { InvoiceSheet } from "@/components/finance/Sheets";
import { DailyChart } from "@/components/finance/DailyChart";
import { BrandChip, FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import {
  addMonths,
  cardsOverview,
  dailyBalances,
  dayLabel,
  materializeRecurring,
  money,
  monthLabel,
  monthOf,
  monthSummary,
  monthTransactions,
  needsMaterialize,
  savingsRate,
  spendByCategory,
  startBalance,
  togglePaid,
  upcomingBills,
} from "@/lib/finance/logic";
import type { Transaction, TxKind } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

function Gauge({ pct }: { pct: number | null }) {
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const r = 44;
  const len = Math.PI * r;
  return (
    <svg viewBox="0 0 110 64" width="120" aria-hidden="true">
      <path d={`M11,58 A${r},${r} 0 0 1 99,58`} fill="none" stroke="#e5e8eb" strokeWidth="10" strokeLinecap="round" />
      {v > 0 && (
        <path d={`M11,58 A${r},${r} 0 0 1 99,58`} fill="none" stroke="#1F7A55" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(v / 100) * len} ${len}`} />
      )}
    </svg>
  );
}

export default function Financas() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const now = useNow();
  const today = toDateKey(now);
  const [month, setMonth] = useFinMonth();
  const [tx, setTx] = useState<{ id?: string | null; scan?: boolean; kind?: Exclude<TxKind, "card_payment"> } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [inv, setInv] = useState<{ cardId: string; month: string } | null>(null);

  const f = s.finance;
  const hide = f.hideValues;

  useEffect(() => {
    if (month <= addMonths(monthOf(today), 2) && needsMaterialize(f, month)) mutate((d) => void materializeRecurring(d, month));
  }, [month, today, f, mutate]);

  const sum = monthSummary(f, month, today);
  const start = startBalance(f, month);
  const daily = dailyBalances(f, month, today);
  const isCurrent = month === monthOf(today);
  const bills = isCurrent ? upcomingBills(f, today, 7) : [];
  const cards = cardsOverview(f, month, today);
  const eco = savingsRate(f, month);
  const incReal = sum.income - sum.incomePending;
  const expReal = sum.expense - sum.expensePending;
  const spend = spendByCategory(f, month);
  const topCats = f.categories
    .filter((c) => c.kind === "expense" && (spend.get(c.id) ?? 0) > 0)
    .map((c) => ({ c, v: spend.get(c.id)! }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  // Últimas despesas: compras parceladas aparecem uma vez, com "6 x R$ 17,00"
  const seen = new Set<string>();
  const latest: { t: Transaction; total: number; n: number }[] = [];
  for (const t of [...monthTransactions(f, month)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (t.kind !== "expense" || t.isAdjust) continue;
    if (t.installment) {
      if (seen.has(t.installment.groupId)) continue;
      seen.add(t.installment.groupId);
      const group = f.transactions.filter((x) => x.installment?.groupId === t.installment!.groupId);
      latest.push({ t, total: group.reduce((a, x) => a + x.amount, 0), n: t.installment.total });
    } else latest.push({ t, total: t.amount, n: 1 });
    if (latest.length >= 5) break;
  }

  return (
    <FinanceShell>
      <MonthSwitch month={month} onChange={setMonth} />

      <Card>
        <div className="trio">
          <div>
            <small>Inicial</small>
            <b>{money(start, hide)}</b>
          </div>
          <div className="trio-main">
            <small>Saldo</small>
            <b className={`balance ${sum.balance < 0 ? "neg" : ""}`}>{money(sum.balance, hide)}</b>
          </div>
          <div>
            <small>Previsto</small>
            <b className={sum.forecast < 0 ? "neg" : ""}>{money(sum.forecast, hide)}</b>
          </div>
        </div>
        <DailyChart points={daily} hide={hide} />
      </Card>

      <div className="quick-actions four">
        <button type="button" className="qa" onClick={() => setTx({})}>
          <Plus size={22} />
          <span>Lançar</span>
        </button>
        <button type="button" className="qa qa-main" onClick={() => setTx({ scan: true })}>
          <ScanLine size={22} />
          <span>Escanear nota</span>
        </button>
        <button type="button" className="qa" onClick={() => setTx({ kind: "transfer" })}>
          <ArrowLeftRight size={22} />
          <span>Transferir</span>
        </button>
        <button type="button" className="qa" onClick={() => setImportOpen(true)}>
          <FileUp size={22} />
          <span>Extrato</span>
        </button>
      </div>

      <h2 className="section-title">Visão geral</h2>
      <div className="ov-grid">
        <Link href="/financas/contas" className="ov">
          <span className="ov-ico" style={{ background: "#dbe7fb", color: "#2a5bb5" }}>
            <Landmark size={20} />
          </span>
          <b className={sum.balance < 0 ? "neg" : ""}>{money(sum.balance, hide)}</b>
          <small>Contas</small>
          <span className="ov-prev">Previsto {money(sum.forecast, hide)}</span>
        </Link>
        <Link href="/financas/relatorios" className="ov">
          <span className="ov-ico" style={{ background: "#fbefd5", color: "#9a6a10" }}>
            <Scale size={20} />
          </span>
          <b className={incReal - expReal < 0 ? "neg" : ""}>{money(incReal - expReal, hide)}</b>
          <small>Balanço</small>
          <span className="ov-prev">Previsto {money(sum.income - sum.expense, hide)}</span>
        </Link>
        <Link href="/financas/transacoes?tipo=income" className="ov">
          <span className="ov-ico" style={{ background: "#dcefe6", color: "#1F7A55" }}>
            <ArrowDownLeft size={20} />
          </span>
          <b>{money(incReal, hide)}</b>
          <small>Receitas</small>
          <span className="ov-prev">Previsto {money(sum.income, hide)}</span>
        </Link>
        <Link href="/financas/transacoes?tipo=expense" className="ov">
          <span className="ov-ico" style={{ background: "#fbe6e6", color: "#b23a3a" }}>
            <ArrowUpRight size={20} />
          </span>
          <b>{money(expReal, hide)}</b>
          <small>Despesas</small>
          <span className="ov-prev">Previsto {money(sum.expense, hide)}</span>
        </Link>
        <Link href="/financas/cartoes" className="ov ov-wide">
          <span className="ov-ico" style={{ background: "#e7e1f7", color: "#4b3d8f" }}>
            <CardIcon size={20} />
          </span>
          <span style={{ minWidth: 0 }}>
            <b>{money(cards.invoices, hide)}</b>
            <small>Faturas de {monthLabel(month).split(" ")[0].toLowerCase()}</small>
          </span>
          <span className="ov-right">
            <small>Limite disponível</small>
            <b className={cards.available < 0 ? "neg" : ""}>{cards.count ? money(cards.available, hide) : "—"}</b>
          </span>
        </Link>
      </div>

      {isCurrent && (
        <Card>
          <CardHead title="A pagar e receber" sub="Vencidos e próximos 7 dias." />
          {bills.length === 0 ? (
            <p className="empty">Nada vencendo nos próximos dias. Respire tranquilo.</p>
          ) : (
            <ul className="list">
              {bills.map((b) => (
                <li className="row" key={b.id}>
                  <span className={`bill-date ${b.overdue ? "late" : ""}`}>{b.overdue ? "Atrasada" : b.date === today ? "Hoje" : dayLabel(b.date)}</span>
                  <span className="row-main" style={{ fontSize: 15.5 }}>
                    {b.label}
                    <small>
                      {b.income ? "a receber" : "a pagar"} · {money(b.amount, hide)}
                    </small>
                  </span>
                  {b.kind === "tx" ? (
                    <Check
                      checked={false}
                      label={`Marcar ${b.label} como ${b.income ? "recebido" : "pago"}`}
                      onChange={() => {
                        mutate((d) => togglePaid(d, b.id));
                        toast(b.income ? "Marcado como recebido." : "Marcado como pago.", () => mutate((d) => togglePaid(d, b.id)));
                      }}
                    />
                  ) : (
                    <button type="button" className="btn sm" onClick={() => setInv({ cardId: b.cardId!, month: b.month! })}>
                      Pagar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <CardHead title="Economia mensal" sub={`Quanto sobrou da renda em ${monthLabel(month).split(" ")[0].toLowerCase()}.`} />
        <div className="eco">
          <div className="eco-gauge">
            <Gauge pct={eco.pct} />
            <b className={eco.pct != null && eco.pct < 0 ? "neg" : ""}>{eco.pct == null ? "—" : `${eco.pct}%`}</b>
            <small>de economia</small>
          </div>
          <div className="eco-side">
            <small>Receitas</small>
            <b className="pos">{money(eco.income, hide)}</b>
            <small>Despesas</small>
            <b className="neg">{money(eco.expense, hide)}</b>
            <small>Economizado</small>
            <b className={eco.saved < 0 ? "neg" : ""}>{money(eco.saved, hide)}</b>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Últimas despesas" action={<HeadLink href="/financas/transacoes?tipo=expense">Ver todas</HeadLink>} />
        {latest.length === 0 ? (
          <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setTx({})}>
            Nenhuma despesa neste mês. <span className="inline-link">Lançar</span>
          </button>
        ) : (
          latest.map(({ t, total, n }) => {
            const cat = f.categories.find((c) => c.id === t.categoryId);
            const card = t.cardId ? f.cards.find((c) => c.id === t.cardId) : undefined;
            return (
              <button type="button" key={t.id} className="tx-row" onClick={() => setTx({ id: t.id })}>
                <CatDot icon={cat?.icon ?? "other"} color={cat?.color ?? "#6a7a8c"} />
                <span className="tx-main">
                  <span className="tx-title">
                    {card && <BrandChip brand={card.brand ?? "outro"} />} {t.description}
                  </span>
                  <small>{n > 1 ? `${n} x ${money(Math.round(total / n), hide)}` : (cat?.name ?? "Sem categoria")}</small>
                </span>
                <span className="tx-amount" style={{ textAlign: "right" }}>
                  {money(total, hide)}
                  <small style={{ display: "block", fontWeight: 400, color: "var(--text-2)", fontSize: 12 }}>{dayLabel(t.date)}</small>
                </span>
              </button>
            );
          })
        )}
      </Card>

      <Card>
        <CardHead title="Para onde foi o dinheiro" action={<HeadLink href="/financas/relatorios">Relatórios</HeadLink>} />
        {topCats.length === 0 ? (
          <p className="empty">Sem despesas neste mês ainda.</p>
        ) : (
          <ul className="list">
            {topCats.map(({ c, v }) => (
              <li key={c.id} className="cat-row">
                <CatDot icon={c.icon} color={c.color} size={36} />
                <span className="cat-body">
                  <span className="cat-line">
                    <b>{c.name}</b>
                    <span>{money(v, hide)}</span>
                  </span>
                  <Bar value={sum.expense ? (v / sum.expense) * 100 : 0} label={`${c.name}: ${sum.expense ? Math.round((v / sum.expense) * 100) : 0}%`} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Cta onClick={() => setTx({})} tagline="Quem cuida do pouco, prospera no muito.">
        Novo lançamento
      </Cta>

      <TxForm open={tx !== null} editId={tx?.id ?? null} scan={Boolean(tx?.scan)} initialKind={tx?.kind ?? "expense"} onClose={() => setTx(null)} />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <InvoiceSheet
        open={inv !== null}
        card={f.cards.find((c) => c.id === inv?.cardId)}
        month={inv?.month ?? month}
        onMonth={(m) => setInv((x) => (x ? { ...x, month: m } : x))}
        onClose={() => setInv(null)}
        onOpenTx={(id) => {
          setInv(null);
          setTx({ id });
        }}
        onEditCard={() => setInv(null)}
      />
    </FinanceShell>
  );
}
