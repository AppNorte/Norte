"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Landmark, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { SCREEN_VERSES } from "@/lib/content";
import { BANKS, bankOf } from "@/lib/finance/banks";
import { addMonths, currentMonth, monthLabel } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

// ---------- Mês selecionado (vale para todas as abas de Finanças) ----------
const KEY = "norte:fin-month";
let memMonth: string | null = null;

export function useFinMonth(): [string, (m: string) => void] {
  const [month, setMonthState] = useState<string>(() => {
    if (memMonth) return memMonth;
    try {
      const v = window.sessionStorage.getItem(KEY);
      if (v && /^\d{4}-\d{2}$/.test(v)) return v;
    } catch {
      /* ignore */
    }
    return currentMonth();
  });
  const setMonth = (m: string) => {
    memMonth = m;
    try {
      window.sessionStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
    setMonthState(m);
  };
  return [month, setMonth];
}

export function MonthSwitch({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const { s, mutate } = useAppState();
  const hide = s.finance.hideValues;
  return (
    <div className="month-switch fin-month">
      <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeft size={22} />
      </button>
      <button type="button" className="month-label" onClick={() => onChange(currentMonth())} aria-label="Voltar para o mês atual">
        {monthLabel(month)}
      </button>
      <button type="button" className="icon-btn" aria-label="Próximo mês" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRight size={22} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={hide ? "Mostrar valores" : "Esconder valores"}
        onClick={() => mutate((d) => void (d.finance.hideValues = !d.finance.hideValues))}
      >
        {hide ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

// ---------- Abas ----------
const TABS = [
  { href: "/financas", label: "Resumo" },
  { href: "/financas/transacoes", label: "Transações" },
  { href: "/financas/contas", label: "Contas" },
  { href: "/financas/cartoes", label: "Cartões" },
  { href: "/financas/orcamentos", label: "Orçamentos" },
  { href: "/financas/objetivos", label: "Objetivos" },
  { href: "/financas/calendario", label: "Calendário" },
  { href: "/financas/relatorios", label: "Relatórios" },
];

export function FinNav() {
  const path = usePathname().replace(/\/$/, "");
  const active = (href: string) => (href === "/financas" ? /\/financas$/.test(path) : path.endsWith(href));
  useEffect(() => {
    document.querySelector(".fin-nav [aria-current='page']")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [path]);
  return (
    <nav className="fin-nav" aria-label="Seções de Finanças">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="fin-tab" aria-current={active(t.href) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function FinanceShell({ sub = "Seu dinheiro com direção.", children }: { sub?: string; children: React.ReactNode }) {
  return (
    <>
      <Hero title="Finanças" sub={sub} quote={SCREEN_VERSES.financas} />
      <div className="sheet">
        <FinNav />
        {children}
      </div>
    </>
  );
}

// ---------- Selo do banco ----------
export function BankBadge({ bank, type, color, size = 40 }: { bank?: string | null; type?: string; color?: string; size?: number }) {
  const b = bankOf(bank);
  const style = { width: size, height: size, fontSize: Math.round(size * (b && b.mark.length > 2 ? 0.3 : 0.38)) };
  if (b)
    return (
      <span className="bank-badge" style={{ ...style, background: b.bg, color: b.fg }} aria-hidden="true">
        {b.mark}
      </span>
    );
  return (
    <span className="bank-badge" style={{ ...style, background: color ?? "#173a5b", color: "#fff" }} aria-hidden="true">
      {type === "cash" ? <Wallet size={size * 0.48} /> : <Landmark size={size * 0.48} />}
    </span>
  );
}

export function BrandChip({ brand }: { brand?: string | null }) {
  if (!brand) return null;
  const label: Record<string, string> = { mastercard: "Mastercard", visa: "VISA", elo: "elo", amex: "AMEX", hipercard: "Hiper", outro: "Cartão" };
  return <span className={`brand-chip brand-${brand}`}>{label[brand] ?? brand}</span>;
}

export function BankPicker({ value, onChange }: { value: string | null; onChange: (k: string) => void }) {
  return (
    <div className="bank-grid" role="group" aria-label="Banco">
      {BANKS.map((b) => (
        <button key={b.key} type="button" className="bank-opt" aria-pressed={value === b.key} onClick={() => onChange(b.key)} aria-label={b.name}>
          <BankBadge bank={b.key} size={36} />
          <span>{b.name.replace("Banco ", "")}</span>
        </button>
      ))}
    </div>
  );
}

