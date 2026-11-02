"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, Clock, Moon, Sun, Target, User, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { Card, CardHead, Cta, Toggle } from "@/components/ui";
import { SCREEN_QUOTES } from "@/lib/content";
import { buildInitialState, onboardingDefaults, type OnboardingInput } from "@/lib/seed";
import type { FocusArea } from "@/lib/types";
import { useStore } from "@/store/StoreProvider";

const FOCUS: { key: FocusArea; label: string; icon: React.ReactNode }[] = [
  { key: "rotina", label: "Rotina", icon: <Icon name="dumbbell" size={24} /> },
  { key: "leitura", label: "Leitura", icon: <Icon name="bible" size={24} /> },
  { key: "espiritual", label: "Vida espiritual", icon: <Icon name="pray" size={24} /> },
  { key: "familia", label: "Família", icon: <Icon name="users" size={24} /> },
  { key: "financas", label: "Finanças", icon: <Wallet size={24} strokeWidth={1.7} aria-hidden="true" /> },
  { key: "organizacao", label: "Organização do dia", icon: <ClipboardList size={24} strokeWidth={1.7} aria-hidden="true" /> },
];

const INCLUDE: { key: keyof OnboardingInput["include"]; label: string; icon: React.ReactNode }[] = [
  { key: "oracao", label: "Oração", icon: <Icon name="pray" /> },
  { key: "academia", label: "Academia", icon: <Icon name="dumbbell" /> },
  { key: "biblia", label: "Bíblia", icon: <Icon name="bible" /> },
  { key: "livro", label: "Livro", icon: <Icon name="book" /> },
  { key: "momentoFamilia", label: "Momento em família", icon: <Icon name="users" /> },
];

export default function Onboarding() {
  const router = useRouter();
  const { state, hydrated, replace } = useStore();
  const [form, setForm] = useState<OnboardingInput>(onboardingDefaults);

  // Já configurado? Não sobrescreve os dados: vai para Hoje.
  useEffect(() => {
    if (hydrated && state) router.replace("/hoje");
  }, [hydrated, state, router]);

  const set = <K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const finish = () => {
    replace(buildInitialState(form));
    router.replace("/hoje");
  };

  const timeRow = (icon: React.ReactNode, label: string, key: "sleepTime" | "wakeTimeCurrent" | "wakeTimeGoal") => (
    <label className="ob-row">
      <span className="row-icon">{icon}</span>
      <span className="ob-label">{label}</span>
      <span className="ob-input">
        <input className="input" type="time" value={form[key]} onChange={(e) => set(key, e.target.value)} required />
        <Clock size={20} strokeWidth={1.8} />
      </span>
    </label>
  );

  return (
    <main>
      <Hero title="Monte seu NORTE" sub="Vamos organizar sua rotina de forma simples." quote={SCREEN_QUOTES.onboarding} />
      <div className="sheet no-nav">
        <Card>
          <CardHead title="Seus dados básicos" sub="Assim personalizamos sua experiência." />
          <label className="ob-row">
            <span className="row-icon">
              <User size={26} strokeWidth={1.6} />
            </span>
            <span className="ob-label">Seu nome</span>
            <input
              className="input"
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              autoComplete="given-name"
              placeholder="Como quer ser chamado?"
            />
          </label>
          {timeRow(<Moon size={26} strokeWidth={1.6} />, "Horário que costuma dormir", "sleepTime")}
          {timeRow(<Sun size={26} strokeWidth={1.6} />, "Horário que costuma acordar", "wakeTimeCurrent")}
          {timeRow(<Target size={26} strokeWidth={1.6} />, "Horário meta", "wakeTimeGoal")}
        </Card>

        <Card>
          <CardHead title="Quero fortalecer" sub="Escolha as áreas que deseja desenvolver." />
          <div className="focus-grid">
            {FOCUS.map((f) => {
              const on = form.focusAreas.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  className="focus-chip"
                  aria-pressed={on}
                  onClick={() =>
                    set("focusAreas", on ? form.focusAreas.filter((x) => x !== f.key) : [...form.focusAreas, f.key])
                  }
                >
                  <span className="row-icon" style={{ width: 26 }}>
                    {f.icon}
                  </span>
                  <span className="lbl">{f.label}</span>
                  <span className="focus-mark">{on && <Check size={15} strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Quero incluir" sub="Ative o que deseja ter na sua rotina." />
          <ul className="list">
            {INCLUDE.map((it) => (
              <li className="row" key={it.key}>
                <span className="row-icon">{it.icon}</span>
                <span className="row-main">{it.label}</span>
                <Toggle
                  checked={form.include[it.key]}
                  label={it.label}
                  onChange={() => set("include", { ...form.include, [it.key]: !form.include[it.key] })}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Cta onClick={finish} tagline="Pequenas decisões. Grandes destinos." disabled={!form.wakeTimeGoal}>
          Finalizar configuração
        </Cta>
      </div>
    </main>
  );
}
