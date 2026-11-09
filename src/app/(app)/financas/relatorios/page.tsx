"use client";

import { Download } from "lucide-react";
import { Bar, Card, CardHead, useToast } from "@/components/ui";
import { CatDot } from "@/components/finance/FinIcon";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { toDateKey } from "@/lib/dates";
import { addMonths, money, monthLabel, monthSummary, shortMonth, spendByCategory, transactionsCsv } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

export default function Relatorios() {
  const { s } = useAppState();
  const toast = useToast();
  const f = s.finance;
  const hide = f.hideValues;
  const [month, setMonth] = useFinMonth();
  const months = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5)).reverse();
  const rows = months.map((m) => {
    const x = monthSummary(f, m);
    return { m, income: x.income, expense: x.expense, result: x.income - x.expense, pct: x.income ? Math.round(((x.income - x.expense) / x.income) * 100) : null };
  });
  const avgExp = rows.reduce((a, r) => a + r.expense, 0) / rows.length;
  const spend = spendByCategory(f, month);
  const total = [...spend.values()].reduce((a, v) => a + v, 0);
  const cats = [...spend.entries()]
    .map(([id, v]) => ({ c: f.categories.find((x) => x.id === id), v }))
    .sort((a, b) => b.v - a.v);
  const prevSpend = spendByCategory(f, addMonths(month, -1));

  const exportCsv = () => {
    const blob = new Blob(["﻿" + transactionsCsv(f)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `norte-financas-${toDateKey()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Planilha baixada (abre no Excel e no Google Planilhas).");
  };

  return (
    <FinanceShell sub="Entenda para onde vai o seu dinheiro.">
      <MonthSwitch month={month} onChange={setMonth} />
      <Card className="wide">
        <CardHead title="Evolução" sub="Receitas e despesas dos últimos 6 meses. Toque num mês." />
        <MonthlyChart f={f} month={month} onSelect={setMonth} hide={hide} />
      </Card>

      <Card>
        <CardHead title="Mês a mês" sub={`Gasto médio: ${money(Math.round(avgExp), hide)}/mês`} />
        <div className="rep-table" role="table" aria-label="Resumo mês a mês">
          <div className="rep-row head" role="row">
            <span role="columnheader">Mês</span>
            <span role="columnheader">Receitas</span>
            <span role="columnheader">Despesas</span>
            <span role="columnheader">Saldo</span>
          </div>
          {rows.map((r) => (
            <button type="button" key={r.m} className={`rep-row ${r.m === month ? "sel" : ""}`} role="row" onClick={() => setMonth(r.m)}>
              <span role="cell">
                {shortMonth(r.m)}/{r.m.slice(2, 4)}
              </span>
              <span role="cell" className="pos">
                {money(r.income, hide)}
              </span>
              <span role="cell" className="neg">
                {money(r.expense, hide)}
              </span>
              <span role="cell" className={r.result < 0 ? "neg" : ""}>
                {money(r.result, hide)}
                {r.pct != null && <small> {r.pct}%</small>}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead title="Despesas por categoria" sub={`${monthLabel(month)} · total ${money(total, hide)}`} />
        {cats.length === 0 ? (
          <p className="empty">Sem despesas neste mês.</p>
        ) : (
          <ul className="list">
            {cats.map(({ c, v }) => {
              const prev = prevSpend.get(c?.id ?? null) ?? 0;
              const diff = prev ? Math.round(((v - prev) / prev) * 100) : null;
              return (
                <li key={c?.id ?? "none"} className="cat-row">
                  <CatDot icon={c?.icon ?? "other"} color={c?.color ?? "#6a7a8c"} size={36} />
                  <span className="cat-body">
                    <span className="cat-line">
                      <b>{c?.name ?? "Sem categoria"}</b>
                      <span>
                        {money(v, hide)} <small>{total ? Math.round((v / total) * 100) : 0}%</small>
                      </span>
                    </span>
                    <Bar value={total ? (v / total) * 100 : 0} label={`${c?.name ?? "Sem categoria"}: ${total ? Math.round((v / total) * 100) : 0}%`} />
                    {diff != null && (
                      <small className={diff > 0 ? "neg" : "pos"}>
                        {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}% vs. mês anterior
                      </small>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <button type="button" className="btn block" onClick={exportCsv}>
        <Download size={18} /> Exportar todos os lançamentos (planilha CSV)
      </button>
    </FinanceShell>
  );
}
