"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BellRing, BookOpen, CalendarClock, CalendarDays, Cloud, Flame, GraduationCap, House, Settings, ShoppingBasket, Target, UserRound, Users, Wallet, ListChecks } from "lucide-react";
import { Compass } from "./Compass";
import { SettingsSheet } from "./SettingsSheet";
import { useAppState } from "@/store/StoreProvider";
import { useSync } from "@/store/SyncProvider";

/** Menu lateral da versão para computador (aparece só em telas largas; no celular fica o menu inferior). */
export function SideNav() {
  const path = usePathname();
  const { s } = useAppState();
  const sync = useSync();
  const [settings, setSettings] = useState(false);

  const main = [
    { href: "/hoje", label: "Hoje", Icon: House },
    { href: "/agenda", label: "Agenda", Icon: CalendarDays },
    { href: "/financas", label: "Finanças", Icon: Wallet },
    { href: "/aprender", label: "Aprender", Icon: GraduationCap },
  ];
  const more = [
    { href: "/avisos", label: "Avisos", Icon: BellRing },
    { href: "/fe", label: s.me.faith === "nenhuma" ? "Força diária" : "Fé e força", Icon: Flame },
    { href: "/perfil", label: "Meu perfil", Icon: UserRound },
  ];
  // Recursos que saíram do menu principal (dados guardados; dá para abrir quando quiser).
  const stored = [
    { href: "/rotina", label: "Rotina", Icon: ListChecks },
    { href: "/casa", label: "Casa", Icon: ShoppingBasket },
    { href: "/leitura", label: "Leitura", Icon: BookOpen },
    { href: "/familia", label: "Família", Icon: Users },
    { href: "/metas", label: "Metas e hábitos", Icon: Target },
    { href: "/meu-dia", label: "Meu dia", Icon: CalendarClock },
  ];
  const item = ({ href, label, Icon }: (typeof main)[number]) => {
    const active = path === href || path.startsWith(`${href}/`);
    return (
      <Link key={href} href={href} className="side-link" aria-current={active ? "page" : undefined}>
        <Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="side" aria-label="Menu lateral">
      <Link href="/hoje" className="side-brand" aria-label="NORTE — Hoje">
        <Compass size={40} />
        <span className="brand-word">NORTE</span>
      </Link>
      <nav className="side-nav" aria-label="Seções">
        {main.map(item)}
        <span className="side-label">Mais</span>
        {more.map(item)}
        <details className="side-stored" open={stored.some((x) => path.startsWith(x.href)) || undefined}>
          <summary className="side-label">Recursos guardados</summary>
          {stored.map(item)}
        </details>
      </nav>
      <div className="side-foot">
        <Link href="/assistente" className="side-ai" aria-current={path.startsWith("/assistente") ? "page" : undefined}>
          <Compass size={26} ring={false} />
          <span>
            <b>Assistente NORTE</b>
            <small>Pergunte ou peça algo</small>
          </span>
        </Link>
        <Link href="/conta" className="side-link" aria-current={path.startsWith("/conta") ? "page" : undefined}>
          <Cloud size={21} strokeWidth={1.8} aria-hidden="true" />
          <span className="side-ellipsis">{sync.user ? sync.user.email : "Conta e backup"}</span>
        </Link>
        <button type="button" className="side-link" onClick={() => setSettings(true)}>
          <Settings size={21} strokeWidth={1.8} aria-hidden="true" />
          Ajustes
        </button>
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </aside>
  );
}
