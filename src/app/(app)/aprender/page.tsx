"use client";

import Link from "next/link";
import { useState } from "react";
import { BookMarked, Check as CheckIcon, ChevronRight, GraduationCap, Search } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Modal } from "@/components/ui";
import { toDateKey } from "@/lib/dates";
import { FINANCE_BOOKS, LESSONS, lessonOfDay, type Lesson } from "@/lib/learn";
import { useAppState } from "@/store/StoreProvider";

export default function Aprender() {
  const { s, mutate } = useAppState();
  const today = toDateKey();
  const daily = lessonOfDay(today);
  const [open, setOpen] = useState<Lesson | null>(null);
  const read = new Set(s.learn.read);
  const done = LESSONS.filter((l) => read.has(l.id)).length;

  const setBook = (id: string, v: "want" | "done" | null) =>
    mutate((d) => {
      if (v) d.learn.books[id] = v;
      else delete d.learn.books[id];
    });

  return (
    <>
      <Hero title="Aprender" sub="Finanças com sabedoria bíblica." quote={{ text: "Os planos bem elaborados levam à fartura.", ref: "Provérbios 21:5" }} />
      <div className="sheet">
        <Card className="wide lesson-today">
          <span className="daily-kicker">
            <GraduationCap size={16} /> Lição de hoje
          </span>
          <h2 className="lesson-title">{daily.title}</h2>
          <p className="lesson-ref">
            <b>{daily.ref}</b> — {daily.idea}
          </p>
          <button type="button" className="btn primary sm" onClick={() => setOpen(daily)}>
            Ler a lição <ChevronRight size={16} />
          </button>
        </Card>

        <Card>
          <CardHead title="Todas as lições" sub={`${done} de ${LESSONS.length} lidas`} />
          <ul className="list">
            {LESSONS.map((l) => (
              <li key={l.id}>
                <button type="button" className="row lesson-row" onClick={() => setOpen(l)}>
                  <span className={`lesson-dot ${read.has(l.id) ? "on" : ""}`} aria-hidden="true">
                    {read.has(l.id) && <CheckIcon size={14} strokeWidth={3} />}
                  </span>
                  <span className="row-main">
                    {l.title}
                    <small>{l.ref}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHead title="Biblioteca de finanças" sub="Livros que valem a leitura. Marque o que quer ler e o que já leu." icon={<BookMarked size={26} />} />
          <ul className="list">
            {FINANCE_BOOKS.map((b) => {
              const st = s.learn.books[b.id];
              return (
                <li key={b.id} className="lib-book">
                  <div className="row-main">
                    <b>{b.title}</b>
                    <small>
                      {b.author}
                      {b.christian ? " · visão cristã" : ""}
                    </small>
                    <span className="lib-why">{b.why}</span>
                  </div>
                  <div className="lib-actions">
                    <button type="button" className="chip" aria-pressed={st === "want"} onClick={() => setBook(b.id, st === "want" ? null : "want")}>
                      Quero ler
                    </button>
                    <button type="button" className="chip" aria-pressed={st === "done"} onClick={() => setBook(b.id, st === "done" ? null : "done")}>
                      Já li
                    </button>
                    <a className="chip" href={`https://www.google.com/search?q=${encodeURIComponent(`${b.title} ${b.author} Skeelo`)}`} target="_blank" rel="noopener noreferrer" aria-label={`Procurar ${b.title}`}>
                      <Search size={14} /> Procurar
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.title ?? ""}>
        {open && (
          <div className="lesson">
            <p className="lesson-ref">
              <b>{open.ref}</b> — {open.idea}
            </p>
            {open.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="note">
              <span>
                <b>Passo de hoje:</b> {open.action}
              </span>
            </div>
            <div className="btn-row">
              {open.link && (
                <Link href={open.link.href} className="btn" onClick={() => setOpen(null)}>
                  {open.link.label}
                </Link>
              )}
              <button
                type="button"
                className="btn primary"
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  const id = open.id;
                  mutate((d) => {
                    if (!d.learn.read.includes(id)) d.learn.read.push(id);
                  });
                  setOpen(null);
                }}
              >
                {read.has(open.id) ? "Fechar" : "Marcar como lida"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
