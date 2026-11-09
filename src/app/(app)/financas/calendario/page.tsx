"use client";

import { useState } from "react";
import { Card, CardHead } from "@/components/ui";
import { TxForm } from "@/components/finance/TxForm";
import { TxRow } from "@/components/finance/Sheets";
import { FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { toDateKey } from "@/lib/dates";
import { dateInMonth, dayLabel, daysInMonth, invoice, money, monthTransactions } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

function short(cents: number) {
  const v = Math.abs(cents) / 100;
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k` : v.toFixed(0);
}

export default function Calendario() {
  const { s } = useAppState();
  const f = s.finance;
  const hide = f.hideValues;
  const today = toDateKey();
  const [month, setMonth] = useFinMonth();
  const [day, setDay] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const txs = monthTransactions(f, month).filter((t) => !t.isAdjust);
  const dues = f.cards
    .filter((c) => !c.archived)
    .map((c) => ({ c, inv: invoice(f, c, month, today) }))
    .filter((x) => x.inv.total > 0);
  const n = daysInMonth(month);
  const first = new Date(`${month}-01T12:00:00`).getDay();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => dateInMonth(month, i + 1))];
  const sel = day && day.startsWith(month) ? day : null;
  const dayTx = sel ? txs.filter((t) => t.date === sel) : [];
  const dayDues = sel ? dues.filter((d) => d.inv.due === sel) : [];

  return (
    <FinanceShell sub="O mês dia a dia.">
      <MonthSwitch month={month} onChange={setMonth} />
      <Card>
        <div className="cal">
          {WEEK.map((w, i) => (
            <span key={i} className="cal-w">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const list = txs.filter((t) => t.date === d);
            const inc = list.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0);
            const exp = list.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount, 0);
            const pending = list.some((t) => !t.paid && !t.cardId);
            const due = dues.some((x) => x.inv.due === d);
            return (
              <button
                key={d}
                type="button"
                className={`cal-d ${d === today ? "today" : ""} ${sel === d ? "sel" : ""}`}
                onClick={() => setDay(d)}
                aria-label={`${dayLabel(d)}${inc ? `, entradas ${money(inc)}` : ""}${exp ? `, saídas ${money(exp)}` : ""}${due ? ", vencimento de fatura" : ""}`}
              >
                <b>{Number(d.slice(8, 10))}</b>
                {!hide && inc > 0 && <i className="pos">+{short(inc)}</i>}
                {!hide && exp > 0 && <i className="neg">−{short(exp)}</i>}
                {(pending || due) && <em className={due ? "due" : ""} />}
              </button>
            );
          })}
        </div>
        <p className="card-sub" style={{ marginTop: 10 }}>
          Ponto laranja: conta pendente · ponto roxo: vencimento de fatura.
        </p>
      </Card>
      {sel && (
        <Card>
          <CardHead title={dayLabel(sel)} />
          {dayDues.map(({ c, inv }) => (
            <p key={c.id} className="empty" style={{ marginBottom: 8 }}>
              Vence a fatura do <b>{c.name}</b>: {money(inv.remaining || inv.total, hide)}
              {inv.status === "paid" ? " (paga)" : ""}
            </p>
          ))}
          {dayTx.length === 0 && dayDues.length === 0 && <p className="empty">Nada neste dia.</p>}
          {dayTx.map((t) => (
            <TxRow key={t.id} t={t} hide={hide} onOpen={() => t.kind !== "card_payment" && setTx(t.id)} />
          ))}
        </Card>
      )}
      <TxForm open={tx !== null} editId={tx} onClose={() => setTx(null)} />
    </FinanceShell>
  );
}
