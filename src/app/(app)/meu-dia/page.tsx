"use client";

import Link from "next/link";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { Card, CardHead, Check, Cta, Field, HeadLink, Modal, useToast } from "@/components/ui";
import { SCREEN_VERSES } from "@/lib/content";
import { nowTime, partOfTime, toDateKey, type DayPart } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import type { AgendaItem, IconKey } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";
import {
  addAgenda,
  agendaFor,
  bibleStatus,
  bookStatus,
  currentBook,
  deleteAgenda,
  isDone,
  plannedMoments,
  prioritiesFor,
  routineFor,
  toggleAgenda,
  toggleRoutine,
} from "@/store/logic";

interface Entry {
  key: string;
  time: string | null;
  icon: IconKey;
  title: string;
  done: boolean;
  toggle: () => void;
  agendaId?: string;
  href?: string;
}

const AGENDA_ICON: Record<AgendaItem["category"], IconKey> = {
  priority: "target",
  task: "list",
  church: "church",
  work: "briefcase",
  other: "check",
};

const PARTS: { key: DayPart; title: string; sub: string; cls: string; icon: React.ReactNode; defaultTime: string }[] = [
  { key: "morning", title: "Manhã", sub: "Comece bem. Grandes dias nascem aqui.", cls: "part-sun", icon: <Sun size={30} strokeWidth={1.6} />, defaultTime: "09:00" },
  { key: "afternoon", title: "Tarde", sub: "Foco no que importa.", cls: "part-noon", icon: <Sun size={30} strokeWidth={1.6} />, defaultTime: "14:00" },
  { key: "night", title: "Noite", sub: "Desacelere. Agradeça. Prepare o amanhã.", cls: "part-night", icon: <Moon size={30} strokeWidth={1.6} />, defaultTime: "19:30" },
];

export default function MeuDia() {
  const { s, mutate } = useAppState();
  const now = useNow();
  const today = toDateKey(now);
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [restOpen, setRestOpen] = useState(false);

  const entries: Record<DayPart, Entry[]> = { morning: [], afternoon: [], night: [] };

  routineFor(s, "morning")
    .filter((r) => r.kind !== "wake" && r.time)
    .forEach((r) =>
      entries[partOfTime(r.time)].push({
        key: r.id,
        time: r.time,
        icon: r.icon,
        title: r.title,
        done: isDone(s, r.id, today),
        toggle: () => mutate((d) => toggleRoutine(d, r.id, today)),
      }),
    );

  agendaFor(s, today).forEach((a) =>
    entries[partOfTime(a.time)].push({
      key: a.id,
      time: a.time,
      icon: AGENDA_ICON[a.category] ?? "check",
      title: a.title,
      done: a.status === "done",
      toggle: () => mutate((d) => toggleAgenda(d, a.id)),
      agendaId: a.id,
    }),
  );

  const evening = routineFor(s, "evening");
  if (evening.length) {
    const firstTime = evening.map((r) => r.time).filter(Boolean).sort()[0] ?? null;
    const allDone = evening.every((r) => isDone(s, r.id, today));
    entries.night.push({
      key: "evening-routine",
      time: firstTime,
      icon: "moon",
      title: "Rotina da noite",
      done: allDone,
      toggle: () =>
        mutate((d) => {
          for (const r of evening) {
            const set = new Set(d.completions[today] ?? []);
            if (allDone) set.delete(r.id);
            else set.add(r.id);
            d.completions[today] = [...set];
          }
        }),
      href: "/rotina",
    });
  }

  (Object.keys(entries) as DayPart[]).forEach((k) => entries[k].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")));

  const prios = prioritiesFor(s, today);
  const prioPending = prios.filter((p) => p.status === "pending");
  const bible = bibleStatus(s, today);
  const book = currentBook(s);
  const bs = bookStatus(s, book, today);
  const readingsPending = (bible.completedToday || bible.finished ? 0 : 1) + (book && bs && !bs.completedToday && !bs.finished ? 1 : 0);
  const familyToday = plannedMoments(s).filter((m) => m.plannedAt?.startsWith(today));

  const t = nowTime(now);
  const rest = (Object.values(entries).flat() as Entry[]).filter((e) => !e.done && (!e.time || e.time >= t.slice(0, 5)));
  const editingItem = s.agenda.find((a) => a.id === editing);

  return (
    <>
      <Hero title="Meu dia" sub="Manhã, tarde e noite organizadas." quote={SCREEN_VERSES.meuDia} />
      <div className="sheet">
        {PARTS.map((p) => (
          <Card key={p.key}>
            <div className="part-head">
              <span className={`icon-bubble ${p.cls}`}>{p.icon}</span>
              <CardHead
                title={p.title}
                sub={p.sub}
                action={
                  p.key === "morning" ? (
                    <HeadLink href="/rotina">Ver rotina</HeadLink>
                  ) : (
                    <HeadLink onClick={() => setAdding(p.defaultTime)}>Adicionar</HeadLink>
                  )
                }
              />
            </div>
            {entries[p.key].length === 0 ? (
              <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setAdding(p.defaultTime)}>
                Nada previsto. <span className="inline-link">Adicionar compromisso</span>
              </button>
            ) : (
              <ul className="timeline">
                {entries[p.key].map((e) => (
                  <li key={e.key} className={`tl-row ${e.done ? "is-done" : ""}`}>
                    <span className={`pill ${e.time ? "" : "ghost"}`}>{e.time ?? "—"}</span>
                    <div className="tl-body">
                      <span className="row-icon">
                        <Icon name={e.icon} size={24} />
                      </span>
                      {e.href ? (
                        <Link href={e.href} className={`row-main ${e.done ? "done-text" : ""}`}>
                          {e.title}
                        </Link>
                      ) : e.agendaId ? (
                        <button type="button" className={`row-main ${e.done ? "done-text" : ""}`} style={{ textAlign: "left" }} onClick={() => setEditing(e.agendaId!)}>
                          {e.title}
                        </button>
                      ) : (
                        <span className={`row-main ${e.done ? "done-text" : ""}`}>{e.title}</span>
                      )}
                      <Check checked={e.done} label={e.title} onChange={e.toggle} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        <Card>
          <CardHead title="Hoje" sub="Seu dia em equilíbrio." action={<HeadLink href="/hoje">Ver detalhes</HeadLink>} />
          <div className="summary-tiles">
            <Link href="/hoje" className="summary-tile">
              <span className="avatar tone-3" style={{ background: "var(--green)", color: "#fff" }}>
                {prioPending.length}
              </span>
              <span style={{ minWidth: 0 }}>
                <b>{prioPending.length === 1 ? "prioridade" : "prioridades"}</b>
                <small>{prios.length === 0 ? "Defina as 3 de hoje." : "Foco no essencial."}</small>
              </span>
            </Link>
            <Link href="/leitura" className="summary-tile">
              <span className="avatar tone-1">{readingsPending}</span>
              <span style={{ minWidth: 0 }}>
                <b>{readingsPending === 1 ? "leitura" : "leituras"}</b>
                <small>{readingsPending ? "Alimente sua mente." : "Tudo lido hoje."}</small>
              </span>
            </Link>
            <Link href="/familia" className="summary-tile">
              <span className="avatar tone-2">{familyToday.length}</span>
              <span style={{ minWidth: 0 }}>
                <b>{familyToday.length === 1 ? "momento em família" : "momentos em família"}</b>
                <small>O que realmente importa.</small>
              </span>
            </Link>
          </div>
        </Card>

        <Cta onClick={() => setRestOpen(true)} tagline="Planeje. Viva. Conquiste um dia melhor.">
          Ver meu restante do dia
        </Cta>
      </div>

      <Modal open={adding !== null} onClose={() => setAdding(null)} title="Novo compromisso">
        {adding !== null && <AgendaForm defaultTime={adding} today={today} onClose={() => setAdding(null)} />}
      </Modal>

      <Modal open={Boolean(editingItem)} onClose={() => setEditing(null)} title={editingItem?.title ?? ""}>
        {editingItem && (
          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                mutate((d) => toggleAgenda(d, editingItem.id));
                setEditing(null);
              }}
            >
              {editingItem.status === "done" ? "Marcar como pendente" : "Concluir"}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                mutate((d) => deleteAgenda(d, editingItem.id));
                setEditing(null);
              }}
            >
              Remover
            </button>
          </div>
        )}
      </Modal>

      <Modal open={restOpen} onClose={() => setRestOpen(false)} title="Restante do dia">
        {rest.length === 0 && prioPending.length === 0 && readingsPending === 0 ? (
          <p className="empty">Nada pendente pelo resto do dia. Descanse bem.</p>
        ) : (
          <ul className="list">
            {rest.map((e) => (
              <li className="row" key={e.key}>
                <span className="pill">{e.time ?? "—"}</span>
                <span className="row-main">{e.title}</span>
                <Check checked={e.done} label={e.title} onChange={e.toggle} />
              </li>
            ))}
            {prioPending.map((p) => (
              <li className="row" key={p.id}>
                <span className="pill ghost">Prioridade</span>
                <span className="row-main">{p.title}</span>
              </li>
            ))}
            {readingsPending > 0 && (
              <li className="row">
                <span className="pill ghost">Leitura</span>
                <Link href="/leitura" className="row-main">
                  {[!bible.completedToday && !bible.finished ? bible.todayLabel : null, book && bs && !bs.completedToday && !bs.finished ? `${book.title} (pág. ${bs.from}–${bs.to})` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Link>
              </li>
            )}
          </ul>
        )}
      </Modal>
    </>
  );
}

function AgendaForm({ defaultTime, today, onClose }: { defaultTime: string; today: string; onClose: () => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(defaultTime);
  const [category, setCategory] = useState<AgendaItem["category"]>("task");
  const cats: { key: AgendaItem["category"]; label: string }[] = [
    { key: "task", label: "Tarefa" },
    { key: "priority", label: "Prioridade" },
    { key: "work", label: "Trabalho" },
    { key: "church", label: "Igreja" },
    { key: "other", label: "Outro" },
  ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        mutate((d) => addAgenda(d, { title: title.trim(), date: today, time: time || null, category }));
        toast("Compromisso adicionado.");
        onClose();
      }}
    >
      <Field label="O quê?">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Resolver pendência" required />
      </Field>
      <Field label="Horário">
        <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Tipo">
        <div className="chips">
          {cats.map((c) => (
            <button key={c.key} type="button" className="chip" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </Field>
      <button type="submit" className="btn primary block">
        Adicionar ao meu dia
      </button>
    </form>
  );
}
