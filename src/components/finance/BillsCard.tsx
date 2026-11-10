"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Card, Check, useToast } from "@/components/ui";
import { BankBadge } from "./Shell";
import { invoiceDates, monthBills, money, togglePaid, type MonthBill } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function dayTag(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${String(d.getDate()).padStart(2, "0")} · ${WEEK[d.getDay()]}`;
}

function shortDate(date: string) {
  return `${date.slice(8, 10)}/${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

const NUM = ["nenhuma", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez"];

/** Contas do mês logo abaixo do seletor de mês: resumo + lista, com "marcar como paga" num toque. */
export function BillsCard({ month, today, onOpenTx, onOpenInvoice }: { month: string; today: string; onOpenTx: (id: string) => void; onOpenInvoice: (cardId: string, month: string) => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const f = s.finance;
  const hide = f.hideValues;
  const [all, setAll] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const b = monthBills(f, month, today);
  const n = b.toPay.length;
  const pending = [...b.toPay, ...b.toReceive];
  const visible = all ? pending : pending.slice(0, 4);

  const mark = (x: MonthBill) => {
    if (x.kind === "invoice") return onOpenInvoice(x.cardId!, x.month!);
    mutate((d) => togglePaid(d, x.id));
    const now = !x.paid;
    toast(now ? (x.income ? `${x.label}: recebido.` : `${x.label}: paga.`) : "Voltou para pendente.", () => mutate((d) => togglePaid(d, x.id)));
  };

  const row = (x: MonthBill) => {
    const card = x.cardId ? f.cards.find((c) => c.id === x.cardId) : undefined;
    const dates = card && x.month ? invoiceDates(card, x.month) : null;
    return (
      <li key={x.id} className={`bill ${x.paid ? "is-paid" : ""}`}>
        {x.kind === "invoice" && card ? (
          <BankBadge bank={card.bank ?? null} color={card.color} size={36} />
        ) : (
          <Check checked={x.paid} onChange={() => mark(x)} label={`${x.paid ? "Desmarcar" : "Marcar"} ${x.label} como ${x.income ? "recebido" : "paga"}`} />
        )}
        <button type="button" className="bill-main" onClick={() => (x.kind === "invoice" ? onOpenInvoice(x.cardId!, x.month!) : onOpenTx(x.id))}>
          <span className="bill-top">
            <span>{x.overdue ? <b className="late">Atrasada</b> : x.date === today ? <b>Hoje</b> : dayTag(x.date)}</span>
            <b className={x.income ? "pos" : ""}>{money(x.amount, hide)}</b>
          </span>
          <span className="bill-name">{x.label}</span>
          <span className="bill-tags">
            {x.income && <i className="tag tag-in">a receber</i>}
            {dates && !x.paid && <i className="pill">{today > dates.closing ? `Fechou dia ${shortDate(dates.closing)}` : `Fecha dia ${shortDate(dates.closing)}`}</i>}
            {x.paid && <i className="tag">{x.income ? "recebido" : "paga"}</i>}
          </span>
        </button>
        {x.kind === "invoice" && !x.paid && (
          <button type="button" className="btn sm" onClick={() => onOpenInvoice(x.cardId!, x.month!)}>
            Pagar
          </button>
        )}
      </li>
    );
  };

  return (
    <Card className="wide bills-card">
      <p className="bills-head" role="status">
        {n === 0 ? (
          <>
            <CircleCheck size={22} aria-hidden="true" /> <span>Nenhuma conta pendente neste mês.</span>
          </>
        ) : (
          <span>
            Você tem <b>{n <= 10 ? NUM[n] : n} {n === 1 ? "conta pendente" : "contas pendentes"}</b> no total de <b>{money(b.totalToPay, hide)}</b>
          </span>
        )}
      </p>
      {pending.length > 0 && <ul className="bills">{visible.map(row)}</ul>}
      <div className="bills-actions">
        {pending.length > 4 && (
          <button type="button" className="link" onClick={() => setAll((v) => !v)}>
            {all ? "Mostrar menos" : `Ver todas (${pending.length})`}
          </button>
        )}
        {b.paid.length > 0 && (
          <button type="button" className="link" onClick={() => setShowPaid((v) => !v)}>
            {showPaid ? "Esconder pagas" : `Pagas no mês (${b.paid.length})`}
          </button>
        )}
      </div>
      {showPaid && <ul className="bills">{b.paid.map(row)}</ul>}
    </Card>
  );
}
