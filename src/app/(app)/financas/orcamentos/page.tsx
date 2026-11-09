"use client";

import { useState } from "react";
import { Bar, Card, CardHead, Cta } from "@/components/ui";
import { CatDot } from "@/components/finance/FinIcon";
import { BudgetSheet } from "@/components/finance/Sheets";
import { FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { money, spendByCategory } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

export default function Orcamentos() {
  const { s } = useAppState();
  const f = s.finance;
  const hide = f.hideValues;
  const [month, setMonth] = useFinMonth();
  const [edit, setEdit] = useState(false);
  const spend = spendByCategory(f, month, "budget");
  const withBudget = f.categories.filter((c) => c.kind === "expense" && c.budget);
  const without = f.categories.filter((c) => c.kind === "expense" && !c.budget && (spend.get(c.id) ?? 0) > 0);
  const totalBudget = withBudget.reduce((a, c) => a + (c.budget ?? 0), 0);
  const totalSpent = withBudget.reduce((a, c) => a + (spend.get(c.id) ?? 0), 0);
  const pct = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <FinanceShell sub="Limites por categoria, mês a mês.">
      <MonthSwitch month={month} onChange={setMonth} />
      <Card>
        <CardHead title="Orçamento do mês" sub={totalBudget ? `${pct}% usado` : "Defina limites para acompanhar."} />
        {totalBudget > 0 ? (
          <>
            <div className="cat-line" style={{ marginBottom: 6 }}>
              <b>Gasto {money(totalSpent, hide)}</b>
              <span>de {money(totalBudget, hide)}</span>
            </div>
            <span className={totalSpent > totalBudget ? "bar-over" : ""}>
              <Bar value={pct} label={`Orçamento total: ${pct}%`} />
            </span>
            <p className={`card-sub ${totalSpent > totalBudget ? "neg" : ""}`}>
              {totalSpent > totalBudget ? `Passou ${money(totalSpent - totalBudget, hide)} do total.` : `Restam ${money(totalBudget - totalSpent, hide)} para o mês.`}
            </p>
          </>
        ) : (
          <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setEdit(true)}>
            Ex.: Mercado R$ 1.200, Lazer R$ 300. <span className="inline-link">Definir limites</span>
          </button>
        )}
      </Card>
      {withBudget.length > 0 && (
        <Card>
          <CardHead title="Por categoria" />
          <ul className="list">
            {withBudget.map((c) => {
              const v = spend.get(c.id) ?? 0;
              const p = c.budget ? (v / c.budget) * 100 : 0;
              const over = v > (c.budget ?? 0);
              return (
                <li key={c.id} className="cat-row">
                  <CatDot icon={c.icon} color={c.color} size={36} />
                  <span className="cat-body">
                    <span className="cat-line">
                      <b>{c.name}</b>
                      <span className={over ? "neg" : ""}>
                        {money(v, hide)} <small>/ {money(c.budget ?? 0, hide)}</small>
                      </span>
                    </span>
                    <span className={over ? "bar-over" : ""}>
                      <Bar value={p} label={`${c.name}: ${Math.round(p)}%`} />
                    </span>
                    <small className={over ? "neg" : ""}>{over ? `Passou ${money(v - (c.budget ?? 0), hide)}` : `Restam ${money((c.budget ?? 0) - v, hide)}`}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {without.length > 0 && (
        <Card>
          <CardHead title="Sem limite definido" sub="Categorias com gastos neste mês." />
          <ul className="list">
            {without.map((c) => (
              <li key={c.id} className="row">
                <CatDot icon={c.icon} color={c.color} size={32} />
                <span className="row-main" style={{ fontSize: 15 }}>
                  {c.name}
                </span>
                <span className="tx-amount">{money(spend.get(c.id) ?? 0, hide)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Cta onClick={() => setEdit(true)} tagline="Orçamento é dizer ao dinheiro para onde ir.">
        Editar limites e categorias
      </Cta>
      <BudgetSheet open={edit} onClose={() => setEdit(false)} spend={spend} />
    </FinanceShell>
  );
}
