"use client";

import { useState } from "react";
import { List, Lock, Plus } from "lucide-react";
import { Card, Cta } from "@/components/ui";
import { TxForm } from "@/components/finance/TxForm";
import { CardForm, InvoiceSheet } from "@/components/finance/Sheets";
import { BankBadge, BrandChip, FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { toDateKey } from "@/lib/dates";
import { cardUsed, dayLabel, invoice, money, monthLabel } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

const STATUS: Record<string, string> = { open: "Aberta", closed: "Fechada", paid: "Paga", empty: "Sem compras" };

export default function Cartoes() {
  const { s } = useAppState();
  const f = s.finance;
  const hide = f.hideValues;
  const today = toDateKey();
  const [month, setMonth] = useFinMonth();
  const [form, setForm] = useState<string | "new" | null>(null);
  const [inv, setInv] = useState<string | null>(null);
  const [buy, setBuy] = useState<{ cardId?: string; id?: string } | null>(null);
  const cards = f.cards.filter((c) => !c.archived);
  const totalInv = cards.reduce((a, c) => a + invoice(f, c, month, today).total, 0);
  const totalOpen = cards.reduce((a, c) => a + cardUsed(f, c), 0);

  return (
    <FinanceShell sub="Faturas, limites e vencimentos.">
      <MonthSwitch month={month} onChange={setMonth} />
      {cards.length > 0 && (
        <div className="totals-bar two">
          <span>
            <small>Faturas de {monthLabel(month).split(" ")[0].toLowerCase()}</small>
            <b>{money(totalInv, hide)}</b>
          </span>
          <span>
            <small>Em aberto (todas)</small>
            <b>{money(totalOpen, hide)}</b>
          </span>
        </div>
      )}
      {cards.length === 0 && (
        <Card>
          <p className="empty">Cadastre seus cartões para acompanhar faturas, limite e vencimentos.</p>
        </Card>
      )}
      {cards.map((c) => {
        const i = invoice(f, c, month, today);
        const used = cardUsed(f, c);
        const avail = c.limit - used;
        const pct = c.limit ? Math.round((used / c.limit) * 100) : 0;
        const pay = f.accounts.find((a) => a.id === c.payAccountId);
        const status = i.overdue ? "Atrasada" : STATUS[i.status];
        return (
          <Card key={c.id} className="cc">
            <div className="cc-head">
              <BankBadge bank={c.bank} color={c.color} size={46} />
              <button type="button" className="cc-name" onClick={() => setForm(c.id)} aria-label={`Editar ${c.name}`}>
                <b>{c.name}</b>
                <BrandChip brand={c.brand ?? "outro"} />
              </button>
              <button type="button" className="icon-btn" aria-label={`Nova compra no ${c.name}`} onClick={() => setBuy({ cardId: c.id })}>
                <Plus size={22} />
              </button>
              <button type="button" className="icon-btn" aria-label={`Ver fatura do ${c.name}`} onClick={() => setInv(c.id)}>
                <List size={22} />
              </button>
            </div>
            <div className="cc-grid">
              <span>
                <small>Limite</small>
                <b>{money(c.limit, hide)}</b>
              </span>
              <span>
                <small>Em aberto</small>
                <b>{money(used, hide)}</b>
              </span>
              <span>
                <small>Disponível</small>
                <b className={avail < 0 ? "neg" : "pos"}>{money(avail, hide)}</b>
              </span>
            </div>
            {c.limit > 0 && (
              <div className={`cc-bar ${pct > 100 ? "over" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Limite usado: ${pct}%`}>
                <span style={{ width: `${Math.min(100, pct)}%` }} />
                <em>{pct}%</em>
              </div>
            )}
            <div className="cc-grid dates">
              <span>
                <small>Conta</small>
                <b>{pay?.name ?? "A definir"}</b>
              </span>
              <span>
                <small>Fechamento</small>
                <b>{dayLabel(i.closing)}</b>
              </span>
              <span>
                <small>Vencimento</small>
                <b className={i.status === "paid" ? "strike" : ""}>{dayLabel(i.due)}</b>
              </span>
            </div>
            <div className="cc-invoice">
              <span>
                <small>Fatura de {monthLabel(month).split(" ")[0].toLowerCase()}</small>
                <b>{money(i.total, hide)}</b>
              </span>
              <span className={`tag ${i.overdue || i.status === "closed" ? "tag-out" : i.status === "paid" ? "tag-in" : ""}`}>
                {i.status === "closed" && <Lock size={11} />} {status}
              </span>
            </div>
            {i.remaining > 0 && (
              <button type="button" className="btn primary block" style={{ marginTop: 10 }} onClick={() => setInv(c.id)}>
                Registrar pagamento ({money(i.remaining, hide)})
              </button>
            )}
          </Card>
        );
      })}
      <Cta onClick={() => setForm("new")} tagline="Cada compra no cartão cai na fatura certa, pelo dia de fechamento.">
        Adicionar cartão
      </Cta>

      <CardForm open={form !== null} card={form && form !== "new" ? cards.find((c) => c.id === form) : undefined} onClose={() => setForm(null)} />
      <InvoiceSheet
        open={inv !== null}
        card={cards.find((c) => c.id === inv)}
        month={month}
        onMonth={setMonth}
        onClose={() => setInv(null)}
        onOpenTx={(id) => {
          setInv(null);
          setBuy({ id });
        }}
        onEditCard={() => {
          const id = inv;
          setInv(null);
          setForm(id);
        }}
      />
      <TxForm open={buy !== null} editId={buy?.id ?? null} cardId={buy?.cardId ?? null} onClose={() => setBuy(null)} />
    </FinanceShell>
  );
}
