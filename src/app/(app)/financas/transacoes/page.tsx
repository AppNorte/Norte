"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, Cta } from "@/components/ui";
import { TxForm } from "@/components/finance/TxForm";
import { TxRow } from "@/components/finance/Sheets";
import { FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { dayLabel, money, monthTransactions } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

type Tipo = "all" | "income" | "expense" | "transfer";
type Sit = "all" | "pending" | "paid";

const norm = (x: string) =>
  x
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function Transacoes() {
  const { s } = useAppState();
  const f = s.finance;
  const hide = f.hideValues;
  const [month, setMonth] = useFinMonth();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<Tipo>("all");
  const [sit, setSit] = useState<Sit>("all");
  const [where, setWhere] = useState("all"); // acc:<id> | card:<id>
  const [cat, setCat] = useState("all");
  const [tx, setTx] = useState<{ id?: string | null } | null>(null);

  // Atalhos vindos do Resumo e dos avisos: ?tipo=income|expense|transfer|pendentes
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tipo");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (t === "income" || t === "expense" || t === "transfer") setTipo(t);
    if (t === "pendentes") setSit("pending");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const list = monthTransactions(f, month).filter((t) => {
    if (tipo === "transfer" ? t.kind !== "transfer" && t.kind !== "card_payment" : tipo !== "all" && t.kind !== tipo) return false;
    if (sit === "pending" && t.paid) return false;
    if (sit === "paid" && !t.paid) return false;
    if (where !== "all") {
      const [k, id] = where.split(":");
      if (k === "acc" && t.accountId !== id && t.toAccountId !== id) return false;
      if (k === "card" && t.cardId !== id) return false;
    }
    if (cat !== "all" && t.categoryId !== cat) return false;
    if (q.trim()) {
      const c = f.categories.find((x) => x.id === t.categoryId)?.name ?? "";
      if (!norm(`${t.description} ${c} ${t.notes}`).includes(norm(q))) return false;
    }
    return true;
  });
  const inc = list.filter((t) => t.kind === "income" && !t.isAdjust).reduce((a, t) => a + t.amount, 0);
  const exp = list.filter((t) => t.kind === "expense" && !t.isAdjust).reduce((a, t) => a + t.amount, 0);
  const days = [...new Set(list.map((t) => t.date))];
  const dayNet = (d: string) =>
    list.filter((t) => t.date === d && !t.isAdjust).reduce((a, t) => a + (t.kind === "income" ? t.amount : t.kind === "expense" ? -t.amount : 0), 0);

  return (
    <FinanceShell sub="Tudo o que entrou e saiu.">
      <MonthSwitch month={month} onChange={setMonth} />
      <Card>
        <label className="search">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lançamento" aria-label="Buscar lançamento" />
        </label>
        <div className="chips" style={{ margin: "10px 0 8px" }} role="group" aria-label="Tipo">
          {(
            [
              ["all", "Todos"],
              ["expense", "Despesas"],
              ["income", "Receitas"],
              ["transfer", "Transferências"],
            ] as [Tipo, string][]
          ).map(([k, l]) => (
            <button key={k} type="button" className="chip" aria-pressed={tipo === k} onClick={() => setTipo(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="grid-3 filters">
          <select className="select" value={sit} onChange={(e) => setSit(e.target.value as Sit)} aria-label="Situação">
            <option value="all">Situação: todas</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagas</option>
          </select>
          <select className="select" value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Conta ou cartão">
            <option value="all">Contas e cartões</option>
            {f.accounts.filter((a) => !a.archived).map((a) => (
              <option key={a.id} value={`acc:${a.id}`}>
                {a.name}
              </option>
            ))}
            {f.cards.filter((c) => !c.archived).map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                {c.name} (cartão)
              </option>
            ))}
          </select>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
            <option value="all">Categorias</option>
            {f.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.kind === "income" ? " (receita)" : ""}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="totals-bar">
        <span>
          <small>Receitas</small>
          <b className="pos">{money(inc, hide)}</b>
        </span>
        <span>
          <small>Despesas</small>
          <b className="neg">{money(exp, hide)}</b>
        </span>
        <span>
          <small>Saldo</small>
          <b className={inc - exp < 0 ? "neg" : ""}>{money(inc - exp, hide)}</b>
        </span>
      </div>

      <Card>
        {list.length === 0 ? (
          <p className="empty">Nenhum lançamento encontrado.</p>
        ) : (
          days.map((d) => (
            <div key={d}>
              <div className="day-head">
                {dayLabel(d)}
                <span className={`day-total ${dayNet(d) < 0 ? "neg" : "pos"}`}>{money(dayNet(d), hide)}</span>
              </div>
              {list
                .filter((t) => t.date === d)
                .map((t) => (
                  <TxRow key={t.id} t={t} hide={hide} onOpen={() => t.kind !== "card_payment" && setTx({ id: t.id })} />
                ))}
            </div>
          ))
        )}
      </Card>

      <Cta onClick={() => setTx({})} tagline={`${list.length} lançamento(s) neste filtro.`}>
        Novo lançamento
      </Cta>
      <TxForm open={tx !== null} editId={tx?.id ?? null} onClose={() => setTx(null)} />
    </FinanceShell>
  );
}
