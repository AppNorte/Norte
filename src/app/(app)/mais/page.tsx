"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, BookOpen, CalendarClock, Cloud, Flame, ListChecks, Settings, ShoppingBasket, Target, UserRound, Users } from "lucide-react";
import { Compass } from "@/components/Compass";
import { Hero } from "@/components/Hero";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useAppState } from "@/store/StoreProvider";
import { syncConfigured, useSync } from "@/store/SyncProvider";

export default function Mais() {
  const { s } = useAppState();
  const sync = useSync();
  const [settings, setSettings] = useState(false);

  const items = [
    { href: "/avisos", title: "Avisos", sub: "Notificações de contas e compromissos", icon: <BellRing size={24} /> },
    { href: "/fe", title: s.me.faith === "nenhuma" ? "Força diária" : "Fé e força", sub: "Mensagem do dia, gratidão e oração", icon: <Flame size={24} /> },
    { href: "/assistente", title: "Assistente", sub: "Pergunte ao NORTE", icon: <Compass size={26} ring={false} /> },
    { href: "/perfil", title: "Meu perfil", sub: "Para o NORTE te conhecer melhor", icon: <UserRound size={24} /> },
    {
      href: "/conta",
      title: "Conta e backup",
      sub: !syncConfigured ? "Salvo neste aparelho" : sync.user ? `Sincronizado · ${sync.user.email}` : "Entre para salvar na nuvem",
      icon: <Cloud size={24} />,
    },
  ];
  // Saíram do menu principal; os dados continuam guardados.
  const stored = [
    { href: "/rotina", title: "Rotina", icon: <ListChecks size={20} /> },
    { href: "/casa", title: "Casa e compras", icon: <ShoppingBasket size={20} /> },
    { href: "/leitura", title: "Leitura", icon: <BookOpen size={20} /> },
    { href: "/familia", title: "Família", icon: <Users size={20} /> },
    { href: "/metas", title: "Metas e hábitos", icon: <Target size={20} /> },
    { href: "/meu-dia", title: "Meu dia", icon: <CalendarClock size={20} /> },
  ];

  return (
    <>
      <Hero title="Mais" sub={`Tudo do seu NORTE, ${s.profile.displayName}.`} quote="Um novo rumo, um passo de cada vez." />
      <div className="sheet">
        <div className="hub-grid">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="hub">
              <span className="icon-bubble">{it.icon}</span>
              <span>
                <b>{it.title}</b>
                <br />
                <small>{it.sub}</small>
              </span>
            </Link>
          ))}
          <button type="button" className="hub" onClick={() => setSettings(true)}>
            <span className="icon-bubble">
              <Settings size={24} />
            </span>
            <span>
              <b>Ajustes</b>
              <br />
              <small>Nome, horários, frases e dados</small>
            </span>
          </button>
        </div>
        <details className="stored">
          <summary>Recursos guardados</summary>
          <p className="card-sub">Saíram do menu para o NORTE focar em agenda e finanças. Seus dados continuam aqui.</p>
          <div className="stored-list">
            {stored.map((it) => (
              <Link key={it.href} href={it.href} className="chip">
                {it.icon} {it.title}
              </Link>
            ))}
          </div>
        </details>
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </>
  );
}
