"use client";

import { useState } from "react";
import { money } from "@/lib/finance/logic";

const LINE = "#1F7A55"; // mesma cor validada do gráfico de evolução

/** Saldo dia a dia: linha cheia até hoje, tracejada no que é previsão. Toque mostra o valor. */
export function DailyChart({ points, hide }: { points: { date: string; value: number; projected: boolean }[]; hide: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  if (!points.length) return null;
  const W = 340;
  const H = 120;
  const pad = { t: 10, b: 20, l: 4, r: 4 };
  const vals = points.map((p) => p.value);
  let min = Math.min(0, ...vals);
  let max = Math.max(0, ...vals);
  if (max === min) max = min + 100_00;
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const lastReal = points.findLastIndex((p) => !p.projected);
  const path = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, k) => `${k ? "L" : "M"}${x(from + k).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(" ");
  const real = lastReal >= 0 ? path(0, lastReal) : "";
  const proj = lastReal < points.length - 1 ? path(Math.max(0, lastReal), points.length - 1) : "";
  const area = lastReal >= 0 ? `${real} L${x(lastReal).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} L${x(0).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} Z` : "";
  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const s = sel ?? (lastReal >= 0 ? lastReal : 0);
  const sp = points[s];

  return (
    <div className="daily-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Saldo dia a dia do mês"
        style={{ display: "block", touchAction: "pan-y" }}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
          setSel(Math.max(0, Math.min(points.length - 1, i)));
        }}
        onPointerLeave={() => setSel(null)}
      >
        <defs>
          <linearGradient id="dc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LINE} stopOpacity="0.18" />
            <stop offset="1" stopColor={LINE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {min < 0 && <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#cfd6dc" strokeDasharray="3 4" />}
        {area && <path d={area} fill="url(#dc-fill)" />}
        {real && <path d={real} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {proj && <path d={proj} fill="none" stroke={LINE} strokeWidth={2} strokeDasharray="4 4" opacity={0.6} />}
        <line x1={x(s)} x2={x(s)} y1={pad.t} y2={H - pad.b} stroke="#9aa7b3" strokeWidth={1} />
        <circle cx={x(s)} cy={y(sp.value)} r={4.5} fill="#fff" stroke={LINE} strokeWidth={2} />
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={H - 4} fontSize={11} fill="#6a7a8c" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
            {points[i].date.slice(8, 10)}/{points[i].date.slice(5, 7)}
          </text>
        ))}
      </svg>
      <p className="chart-caption" aria-live="polite">
        {sp.date.slice(8, 10)}/{sp.date.slice(5, 7)}: <b className={sp.value < 0 ? "neg" : ""}>{money(sp.value, hide)}</b>
        {sp.projected ? " (previsto)" : ""}
      </p>
    </div>
  );
}
