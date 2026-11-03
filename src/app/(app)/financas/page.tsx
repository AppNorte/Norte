"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, CreditCard as CardIcon, Eye, EyeOff } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Bar, Card, CardHead, Check, Cta, HeadLink, useToast } from "@/components/ui";
import { AccountIcon, CatDot } from "@/components/finance/FinIcon";
import { TxForm } from "@/components/finance/TxForm";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { ImportSheet } from "@/components/finance/ImportSheet";
import { FileUp, Plus, ScanLine } from "lucide-react";
import { AccountsSheet, AllTxSheet, BudgetSheet, CardForm, InvoiceSheet, TxRow } from "@/components/finance/Sheets";
import { SCREEN_VERSES } from "@/lib/content";
import { toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import {
  accountBalance,
  addMonths,
  cardUsed,
  currentInvoiceMonth,
  dayLabel,
  invoice,
  materializeRecurring,
  money,
  monthLabel,
  monthOf,
  monthSummary,
  monthTransactions,
  needsMaterialize,
  spendByCategory,
  togglePaid,
  upcomingBills,
} from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

export default function Financas() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const now = useNow();
  const today = toDateKey(now);
  const [month, setMonth] = useState(monthOf(today));
  const [tx, setTx] = useState<{ id?: string | null; scan?: boolean } | null>(null);
  const [sheet, setSheet] = useState<null | "accounts" | "all" | "budget" | "newCard" | "import">(null);
  const [inv, setInv] = useState<{ cardId: string; month: string } | null>(null);
  const [editCard, setEditCard] = useState<string | null>(null);

  const f = s.finance;
  const hide = f.hideValues;

  // Lançamentos fixos do mês (até 2 meses à frente) entram como pendentes.
  useEffect(() => {
    if (month <= addMonths(monthOf(today), 2) && needsMaterialize(f, month)) mutate((d) => void materializeRecurring(d, month));
  }, [month, today, f, mutate]);

  const sum = monthSummary(f, month, today);
  const txs = monthTransactions(f, month);
  const bills = upcomingBills(f, today, 7);
  const spend = spendByCategory(f, month);
  const cards = f.cards.filter((c) => !c.archived);
  const accounts = f.accounts.filter((a) => !a.archived);
  const isCurrent = month === monthOf(today);

  const catRows = f.categories
    .filter((c) => c.kind === "expense" && ((spend.get(c.id) ?? 0) > 0 || c.budget))
    .map((c) => ({ c, spent: spend.get(c.id) ?? 0 }))
    .sort((a, b) => b.spent - a.spent);
  const uncategorized = spend.get(null) ?? 0;
  const days = [...new Set(txs.slice(0, 10).map((t) => t.date))];
  const selCard = cards.find((c) => c.id === (inv?.cardId ?? editCard));

  return (
    <>
      <Hero title="Finanças" sub="Seu dinheiro com direção." quote={SCREEN_VERSES.financas} />
      <div className="sheet">
        <Card>
          <div className="month-switch">
            <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="month-label" onClick={() => setMonth(monthOf(today))} aria-label="Voltar para o mês atual">
              {monthLabel(month)}
            </button>
            <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={22} />
            </button>
          </div>
          <div className="balance-block">
            <span className="kicker">Saldo em contas</span>
            <div className="balance-row">
              <span className={`balance ${sum.balance < 0 ? "neg" : ""}`}>{money(sum.balance, hide)}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label={hide ? "Mostrar valores" : "Esconder valores"}
                onClick={() => mutate((d) => void (d.finance.hideValues = !d.finance.hideValues))}
              >
                {hide ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="io-grid">
            <div className="io in">
              <span className="io-ico">
                <ArrowDownLeft size={18} />
              </span>
              <span>
                <small>Receitas</small>
                <b>{money(sum.income, hide)}</b>
              </span>
            </div>
            <div className="io out">
              <span className="io-ico">
                <ArrowUpRight size={18} />
              </span>
              <span>
                <small>Despesas</small>
                <b>{money(sum.expense, hide)}</b>
              </span>
            </div>
          </div>
          {month >= monthOf(today) && (
            <p className="forecast">
              Previsto no fim de {monthLabel(month).split(" ")[0].toLowerCase()}: <b className={sum.forecast < 0 ? "neg" : ""}>{money(sum.forecast, hide)}</b>
            </p>
          )}
        </Card>

        <div className="quick-actions">
          <button type="button" className="qa" onClick={() => setTx({})}>
            <Plus size={22} />
            <span>Lançar</span>
          </button>
          <button type="button" className="qa qa-main" onClick={() => setTx({ scan: true })}>
            <ScanLine size={22} />
            <span>Escanear nota</span>
          </button>
          <button type="button" className="qa" onClick={() => setSheet("import")}>
            <FileUp size={22} />
            <span>Extrato</span>
          </button>
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
          <CardHead title="Cartões de crédito" action={<HeadLink onClick={() => setSheet("newCard")}>Adicionar</HeadLink>} />
          {cards.length === 0 ? (
            <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setSheet("newCard")}>
              Cadastre seus cartões para acompanhar faturas, limite e vencimentos. <span className="inline-link">Adicionar cartão</span>
            </button>
          ) : (
            cards.map((c) => {
              const m = isCurrent ? currentInvoiceMonth(f, c, today) : month;
              const i = invoice(f, c, m, today);
              const used = cardUsed(f, c);
              const label = i.overdue ? "Atrasada" : { open: "Aberta", closed: "Fechada", paid: "Paga", empty: "Sem compras" }[i.status];
              return (
                <button type="button" key={c.id} className="card-row" onClick={() => setInv({ cardId: c.id, month: m })}>
                  <span className="card-chip" style={{ background: c.color }}>
                    <CardIcon size={18} color="#fff" />
                  </span>
                  <span className="row-main" style={{ minWidth: 0 }}>
                    <span className="card-line">
                      <b>{c.name}</b>
                      <span className={`tag ${i.overdue ? "tag-out" : i.status === "paid" ? "tag-in" : ""}`}>{label}</span>
                    </span>
                    <small>
                      Fatura de {monthLabel(m).split(" ")[0].toLowerCase()} · vence {dayLabel(i.due)}
                    </small>
                    {c.limit > 0 && (
                      <span style={{ display: "block", marginTop: 6 }}>
                        <Bar value={(used / c.limit) * 100} label={`Limite usado de ${c.name}`} />
                        <small>Disponível {money(Math.max(0, c.limit - used), hide)}</small>
                      </span>
                    )}
                  </span>
                  <span className="tx-amount neg">{money(i.remaining || i.total, hide)}</span>
                </button>
              );
            })
          )}
        </Card>

        <Card>
          <CardHead title="Contas" action={<HeadLink onClick={() => setSheet("accounts")}>Gerenciar</HeadLink>} />
          <ul className="list">
            {accounts.map((a) => {
              const b = accountBalance(f, a);
              return (
                <li className="row" key={a.id}>
                  <span className="acc-dot" style={{ background: a.color }}>
                    <AccountIcon type={a.type} size={18} />
                  </span>
                  <span className="row-main">{a.name}</span>
                  <span className={`tx-amount ${b < 0 ? "neg" : ""}`}>{money(b, hide)}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHead title="Evolução" sub="Receitas e despesas dos últimos 6 meses. Toque num mês." />
          <MonthlyChart f={f} month={month} onSelect={setMonth} hide={hide} />
        </Card>

        <Card>
          <CardHead title="Para onde foi o dinheiro" sub={`Despesas de ${monthLabel(month).split(" ")[0].toLowerCase()} por categoria.`} action={<HeadLink onClick={() => setSheet("budget")}>Orçamento</HeadLink>} />
          {catRows.length === 0 && !uncategorized ? (
            <p className="empty">Sem despesas neste mês ainda.</p>
          ) : (
            <ul className="list">
              {catRows.map(({ c, spent }) => {
                const pct = c.budget ? (spent / c.budget) * 100 : sum.expense ? (spent / sum.expense) * 100 : 0;
                const over = c.budget != null && spent > c.budget;
                return (
                  <li key={c.id} className="cat-row">
                    <CatDot icon={c.icon} color={c.color} size={36} />
                    <span className="cat-body">
                      <span className="cat-line">
                        <b>{c.name}</b>
                        <span className={over ? "neg" : ""}>
                          {money(spent, hide)}
                          {c.budget ? <small> / {money(c.budget, hide)}</small> : null}
                        </span>
                      </span>
                      <span className={over ? "bar-over" : ""}>
                        <Bar value={pct} label={`${c.name}: ${Math.round(pct)}%`} />
                      </span>
                      {c.budget != null && (
                        <small className={over ? "neg" : ""}>{over ? `Passou ${money(spent - c.budget, hide)} do orçamento` : `Restam ${money(c.budget - spent, hide)}`}</small>
                      )}
                    </span>
                  </li>
                );
              })}
              {uncategorized > 0 && (
                <li className="cat-row">
                  <CatDot icon="other" color="#6a7a8c" size={36} />
                  <span className="cat-body">
                    <span className="cat-line">
                      <b>Sem categoria</b>
                      <span>{money(uncategorized, hide)}</span>
                    </span>
                  </span>
                </li>
              )}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Lançamentos" sub={`${txs.length} em ${monthLabel(month).split(" ")[0].toLowerCase()}`} action={txs.length > 0 ? <HeadLink onClick={() => setSheet("all")}>Ver todos</HeadLink> : undefined} />
          {txs.length === 0 ? (
            <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setTx({})}>
              Nenhum lançamento neste mês. <span className="inline-link">Lançar o primeiro</span>
            </button>
          ) : (
            days.map((d) => (
              <div key={d}>
                <div className="day-head">{dayLabel(d)}</div>
                {txs
                  .slice(0, 10)
                  .filter((t) => t.date === d)
                  .map((t) => (
                    <TxRow key={t.id} t={t} hide={hide} onOpen={() => (t.kind === "card_payment" ? setInv({ cardId: t.cardId!, month: t.invoiceMonth! }) : setTx({ id: t.id }))} />
                  ))}
              </div>
            ))
          )}
        </Card>

        <Cta onClick={() => setTx({})} tagline="Quem cuida do pouco, prospera no muito.">
          Novo lançamento
        </Cta>
        <button type="button" className="btn ghost block" style={{ marginTop: 6 }} onClick={() => setSheet("import")}>
          <FileUp size={18} /> Importar extrato do banco (OFX/CSV)
        </button>
      </div>

      <TxForm open={tx !== null} editId={tx?.id ?? null} scan={Boolean(tx?.scan)} onClose={() => setTx(null)} />
      <ImportSheet open={sheet === "import"} onClose={() => setSheet(null)} />
      <AccountsSheet open={sheet === "accounts"} onClose={() => setSheet(null)} />
      <BudgetSheet open={sheet === "budget"} onClose={() => setSheet(null)} spend={spend} />
      <AllTxSheet
        open={sheet === "all"}
        onClose={() => setSheet(null)}
        txs={txs}
        title={`Lançamentos de ${monthLabel(month).toLowerCase()}`}
        onOpen={(id) => {
          setSheet(null);
          setTx({ id });
        }}
      />
      <CardForm open={sheet === "newCard" || editCard !== null} card={editCard ? selCard : undefined} onClose={() => { setSheet(null); setEditCard(null); }} />
      <InvoiceSheet
        open={inv !== null}
        card={selCard}
        month={inv?.month ?? month}
        onMonth={(m) => setInv((x) => (x ? { ...x, month: m } : x))}
        onClose={() => setInv(null)}
        onOpenTx={(id) => {
          setInv(null);
          setTx({ id });
        }}
        onEditCard={() => {
          const id = inv?.cardId ?? null;
          setInv(null);
          setEditCard(id);
        }}
      />
    </>
  );
}
