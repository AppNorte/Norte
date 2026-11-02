"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CalendarClock, Cloud, Flame, Settings, Target, UserRound, Users } from "lucide-react";
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
    { href: "/leitura", title: "Leitura", sub: "Bíblia, livro atual e reflexões", icon: <BookOpen size={24} /> },
    { href: "/familia", title: "Família", sub: "Pessoas importantes e momentos", icon: <Users size={24} /> },
    { href: "/meu-dia", title: "Meu dia", sub: "Manhã, tarde e noite", icon: <CalendarClock size={24} /> },
    { href: "/assistente", title: "Assistente", sub: "Pergunte ao NORTE", icon: <Compass size={26} ring={false} /> },
    {
      href: "/conta",
      title: "Conta e nuvem",
      sub: !syncConfigured ? "Salvo neste aparelho" : sync.user ? `Sincronizado · ${sync.user.email}` : "Entre para salvar na nuvem",
      icon: <Cloud size={24} />,
    },
  ];
  const soon = [
    { title: "Fé e força", sub: "Mensagem diária, gratidão e oração", icon: <Flame size={24} /> },
    { title: "Metas e hábitos", sub: "Objetivos, sequência de dias e revisão", icon: <Target size={24} /> },
    { title: "Meu perfil", sub: "Para a IA te conhecer melhor", icon: <UserRound size={24} /> },
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
        <h2 className="sub-title" style={{ margin: "22px 4px 10px" }}>
          Chegando nas próximas etapas
        </h2>
        <div className="hub-grid">
          {soon.map((it) => (
            <div key={it.title} className="hub soon" aria-disabled="true">
              <span className="icon-bubble">{it.icon}</span>
              <span>
                <b>{it.title}</b>
                <br />
                <small>{it.sub}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </>
  );
}
