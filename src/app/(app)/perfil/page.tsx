"use client";

import { useState } from "react";
import { Brain, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Cta, Field, Toggle, useToast } from "@/components/ui";
import { CHALLENGES } from "@/lib/faith/messages";
import { uid } from "@/lib/id";
import { toDateKey } from "@/lib/dates";
import type { MeProfile } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

const VALUES = ["Fé", "Família", "Saúde", "Honestidade", "Disciplina", "Generosidade", "Liberdade financeira", "Aprender", "Servir", "Paz", "Trabalho", "Amizade"];
const FAITH: { key: MeProfile["faith"]; label: string }[] = [
  { key: "crista", label: "Cristã (com versículos)" },
  { key: "espiritual", label: "Espiritual" },
  { key: "nenhuma", label: "Prefiro sem religião" },
];
const TONES: { key: MeProfile["tone"]; label: string; sub: string }[] = [
  { key: "acolhedor", label: "Acolhedor", sub: "Gentil e paciente" },
  { key: "direto", label: "Direto", sub: "Curto e prático" },
  { key: "motivador", label: "Motivador", sub: "Energia e desafio" },
];

export default function Perfil() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [me, setMe] = useState<MeProfile>(() => structuredClone(s.me));
  const [note, setNote] = useState("");
  const set = <K extends keyof MeProfile>(k: K, v: MeProfile[K]) => setMe((m) => ({ ...m, [k]: v }));
  const toggleIn = (k: "values" | "challenges", v: string) => set(k, me[k].includes(v) ? me[k].filter((x) => x !== v) : [...me[k], v]);

  const save = () => {
    mutate((d) => {
      const changed = JSON.stringify({ ...d.me, notes: [] }) !== JSON.stringify({ ...me, notes: [] });
      d.me = { ...me, notes: d.me.notes };
      // perfil mudou: a próxima mensagem do dia já usa o novo perfil
      if (changed) d.faith.daily = d.faith.daily.filter((x) => x.date !== toDateKey());
    });
    toast("Perfil salvo. O NORTE vai usar isso para falar com você.");
  };

  return (
    <>
      <Hero title="Meu perfil" sub="Para o NORTE te conhecer de verdade." quote="Conhece-te a ti mesmo." />
      <div className="sheet">
        <Card>
          <CardHead title="Quem é você" sub="Escreva do seu jeito. Só você e o NORTE veem." />
          <Field label="Sobre mim">
            <textarea
              className="textarea"
              value={me.about}
              onChange={(e) => set("about", e.target.value)}
              placeholder="Ex.: Pai de 2, trabalho com tecnologia, quero voltar a acordar cedo e ter mais tempo com minha família."
            />
          </Field>
          <Field label="Meus sonhos e objetivos">
            <textarea className="textarea" value={me.dreams} onChange={(e) => set("dreams", e.target.value)} placeholder="Ex.: Quitar dívidas até dezembro, ler 12 livros no ano…" />
          </Field>
          <Field label="O que me motiva">
            <input className="input" value={me.motivations} onChange={(e) => set("motivations", e.target.value)} placeholder="Ex.: Ser exemplo para meus filhos" />
          </Field>
        </Card>

        <Card>
          <CardHead title="Meus valores" sub="Escolha os que guiam suas decisões." />
          <div className="chips">
            {VALUES.map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={me.values.includes(v)} onClick={() => toggleIn("values", v)}>
                {v}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Meus desafios agora" sub="As mensagens do dia vão focar nisso." />
          <div className="chips">
            {CHALLENGES.map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={me.challenges.includes(v)} onClick={() => toggleIn("challenges", v)}>
                {v}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Fé e tom" />
          <Field label="Mensagens de fé" group>
            <div className="chips">
              {FAITH.map((f) => (
                <button key={f.key} type="button" className="chip" aria-pressed={me.faith === f.key} onClick={() => set("faith", f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Como o NORTE deve falar com você" group>
            <div className="grid-3">
              {TONES.map((t) => (
                <button key={t.key} type="button" className="tone" aria-pressed={me.tone === t.key} onClick={() => set("tone", t.key)}>
                  <b>{t.label}</b>
                  <small>{t.sub}</small>
                </button>
              ))}
            </div>
          </Field>
        </Card>

        <Card>
          <CardHead title="Inteligência artificial" icon={<ShieldCheck size={28} color="var(--green)" />} />
          <label className="row" style={{ borderBottom: 0, cursor: "pointer", alignItems: "flex-start" }}>
            <span className="row-main" style={{ fontSize: 15.5 }}>
              Permitir que a IA use meu perfil
              <small>
                Usado só para escrever sua mensagem do dia e personalizar o Assistente. Nada é compartilhado com outras pessoas. Desligue quando quiser.
              </small>
            </span>
            <Toggle checked={me.aiConsent} onChange={() => set("aiConsent", !me.aiConsent)} label="Permitir que a IA use meu perfil" />
          </label>
        </Card>

        <Card>
          <CardHead title="O que o NORTE sabe sobre você" sub="Coisas que você confirmou no Assistente ou anotou aqui. Apague o que quiser." icon={<Brain size={28} />} />
          {s.me.notes.length === 0 ? (
            <p className="empty">Nada ainda. Diga ao Assistente, por exemplo: “lembre que eu trabalho até as 18h”.</p>
          ) : (
            <ul className="list">
              {s.me.notes.map((n) => (
                <li className="row" key={n.id}>
                  <span className="row-main" style={{ fontSize: 15 }}>
                    {n.text}
                  </span>
                  <button type="button" className="icon-btn" aria-label={`Apagar: ${n.text}`} onClick={() => mutate((d) => void (d.me.notes = d.me.notes.filter((x) => x.id !== n.id)))}>
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            style={{ display: "flex", gap: 8, marginTop: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              mutate((d) => void d.me.notes.push({ id: uid(), text: note.trim(), createdAt: new Date().toISOString() }));
              setNote("");
            }}
          >
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anotar algo sobre mim…" aria-label="Nova anotação" />
            <button type="submit" className="send" aria-label="Adicionar anotação" style={{ flex: "none" }}>
              <Plus size={20} />
            </button>
          </form>
        </Card>

        <Cta onClick={save} tagline="Quanto mais o NORTE te conhece, melhor ele te guia.">
          Salvar perfil
        </Cta>
      </div>
    </>
  );
}
