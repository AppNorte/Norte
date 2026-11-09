"use client";

import { addMonths, counts, money, monthLabel, monthTransactions, shortMonth } from "@/lib/finance/logic";
import type { FinanceState } from "@/lib/types";

// Paleta validada (scripts/validate_palette do guia de gráficos): passa em daltonismo e contraste.
const INCOME = "#1F7A55";
const EXPENSE = "#E08A2E";

function niceMax(v: number) {
  if (v <= 0) return 100_00;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

function topRounded(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function short(cents: number) {
  const v = cents / 100;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(".", ",")} mil`;
  return v.toFixed(0);
}

/** Receitas × despesas dos últimos 6 meses (até o mês selecionado). */
export function MonthlyChart({ f, month, onSelect, hide }: { f: FinanceState; month: string; onSelect: (m: string) => void; hide: boolean }) {
  const months = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5));
  const data = months.map((m) => {
    const txs = monthTransactions(f, m);
    return {
      m,
      income: txs.filter((t) => t.kind === "income" && counts(t, "stats")).reduce((a, t) => a + t.amount, 0),
      expense: txs.filter((t) => t.kind === "expense" && counts(t, "stats")).reduce((a, t) => a + t.amount, 0),
    };
  });
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense))));
  const W = 340;
  const H = 150;
  const top = 8;
  const bottom = 22;
  const plotH = H - top - bottom;
  const group = W / data.length;
  const barW = Math.min(16, group / 3.2);
  const sel = data.find((d) => d.m === month)!;
  const hasData = data.some((d) => d.income || d.expense);

  return (
    <div>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i style={{ background: INCOME }} /> Receitas
        </span>
        <span>
          <i style={{ background: EXPENSE }} /> Despesas
        </span>
        <span className="chart-max">{hide ? "" : `até R$ ${short(max)}`}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Receitas e despesas dos últimos 6 meses" style={{ display: "block", overflow: "visible" }}>
        {[0.5, 1].map((g) => (
          <line key={g} x1={0} x2={W} y1={top + plotH * (1 - g)} y2={top + plotH * (1 - g)} stroke="#e8ecef" strokeWidth={1} strokeDasharray="3 4" />
        ))}
        <line x1={0} x2={W} y1={top + plotH} y2={top + plotH} stroke="#cfd6dc" strokeWidth={1} />
        {data.map((d, i) => {
          const cx = group * i + group / 2;
          const hi = (d.income / max) * plotH;
          const he = (d.expense / max) * plotH;
          const active = d.m === month;
          return (
            <g key={d.m} onClick={() => onSelect(d.m)} style={{ cursor: "pointer" }} opacity={active ? 1 : 0.55}>
              <rect x={group * i} y={0} width={group} height={H} fill="transparent" />
              <path d={topRounded(cx - barW - 1, top + plotH - hi, barW, hi)} fill={INCOME} />
              <path d={topRounded(cx + 1, top + plotH - he, barW, he)} fill={EXPENSE} />
              <text x={cx} y={H - 5} textAnchor="middle" fontSize={11.5} fill={active ? "#132c49" : "#6a7a8c"} fontWeight={active ? 700 : 500}>
                {shortMonth(d.m)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="chart-caption">
        {!hasData ? (
          "Os meses aparecem aqui conforme você lança."
        ) : (
          <>
            <b>{monthLabel(sel.m)}</b>: entrou {money(sel.income, hide)} · saiu {money(sel.expense, hide)} · saldo{" "}
            <b className={sel.income - sel.expense < 0 ? "neg" : "pos"}>{money(sel.income - sel.expense, hide)}</b>
          </>
        )}
      </p>
      <table className="sr-only">
        <caption>Receitas e despesas por mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Receitas</th>
            <th>Despesas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.m}>
              <td>{monthLabel(d.m)}</td>
              <td>{money(d.income, hide)}</td>
              <td>{money(d.expense, hide)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
