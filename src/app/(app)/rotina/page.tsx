"use client";

import { useState } from "react";
import { Check as CheckIcon } from "lucide-react";
import { Compass } from "@/components/Compass";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { RoutineEditor } from "@/components/RoutineEditor";
import { Card, CardHead, Check, Cta, HeadLink, Modal, useToast } from "@/components/ui";
import { SCREEN_QUOTES } from "@/lib/content";
import { dayMonth, dayPart, hourLabel, shortHour, toDateKey, addDays } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import type { Period } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";
import { isDone, routineFor, setRoutineDone, toggleRoutine, wakePlan } from "@/store/logic";

export default function Rotina() {
  const { s, mutate } = useAppState();
  const now = useNow();
  const today = toDateKey(now);
  const [editing, setEditing] = useState<Period | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [runner, setRunner] = useState(false);

  const plan = wakePlan(s, today);
  const curIdx = Math.max(0, plan.findIndex((p) => p.state === "current"));
  const winStart = Math.max(0, Math.min(curIdx - 1, plan.length - 4));
  const visible = plan.slice(winStart, winStart + 4);
  const evening = routineFor(s, "evening");
  const morning = routineFor(s, "morning");

  return (
    <>
      <Hero title="Rotina" sub={`Plano de volta às ${shortHour(s.profile.wakeTimeGoal)}`} quote={SCREEN_QUOTES.rotina} />
      <div className="sheet">
        <Card>
          <CardHead
            title="Seu progresso"
            sub="Uma manhã melhor, semana por semana."
            action={<HeadLink onClick={() => setPlanOpen(true)}>Ver plano</HeadLink>}
          />
          {plan.length <= 1 ? (
            <p className="empty">Você já está no seu horário-meta: acordar às {hourLabel(s.profile.wakeTimeGoal)}. Agora é manter a constância.</p>
          ) : (
            <ol className="stepper" style={{ listStyle: "none", padding: 0 }}>
              {visible.map((st) => (
                <li key={st.index} className={`step ${st.state}`}>
                  <span className="step-dot">{st.state === "done" ? <CheckIcon size={20} strokeWidth={3} /> : st.index + 1}</span>
                  <span className="step-label">Semana {st.index + 1}</span>
                  <span className="step-time">{hourLabel(st.time)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHead title="Rotina da noite" sub="Prepare hoje um amanhã melhor." action={<HeadLink onClick={() => setEditing("evening")}>Editar</HeadLink>} />
          {evening.length === 0 ? (
            <p className="empty">Nenhum item. <button type="button" onClick={() => setEditing("evening")}>Adicionar</button></p>
          ) : (
            <ul className="list">
              {evening.map((r) => {
                const done = isDone(s, r.id, today);
                return (
                  <li className="row" key={r.id}>
                    <span className="row-icon">
                      <Icon name={r.icon} size={26} />
                    </span>
                    <span className={`row-main ${done ? "done-text" : ""}`}>{r.title}</span>
                    {r.time && <span className="row-time">{hourLabel(r.time)}</span>}
                    <Check checked={done} label={r.title} onChange={() => mutate((d) => toggleRoutine(d, r.id, today))} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Manhã ideal" sub="Disciplina nos primeiros passos." action={<HeadLink onClick={() => setEditing("morning")}>Editar</HeadLink>} />
          <ul className="timeline">
            {morning.map((r) => {
              const done = isDone(s, r.id, today);
              return (
                <li key={r.id} className={`tl-row ${done ? "is-done" : ""}`}>
                  <span className={`pill ${r.time ? "" : "ghost"}`}>{r.time ?? "—"}</span>
                  <button
                    type="button"
                    className="tl-body"
                    style={{ textAlign: "left" }}
                    onClick={() => mutate((d) => toggleRoutine(d, r.id, today))}
                    aria-pressed={done}
                    aria-label={`${r.title}${done ? " — feito" : ""}`}
                  >
                    <span className="row-icon">
                      <Icon name={r.icon} size={24} />
                    </span>
                    <span className={`row-main ${done ? "done-text" : ""}`}>{r.title}</span>
                    {done && <CheckIcon size={20} strokeWidth={2.6} color="var(--green)" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="quote-card">
          <span style={{ color: "var(--green)" }}>
            <Compass size={38} />
          </span>
          <span className="sep" />
          <q>Constância vence motivação.</q>
        </div>

        <Cta onClick={() => setRunner(true)} tagline="Pequenos passos. Grandes destinos.">
          Começar rotina
        </Cta>
      </div>

      <RoutineEditor open={editing !== null} period={editing ?? "morning"} onClose={() => setEditing(null)} />

      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title="Plano progressivo">
        <p className="card-sub" style={{ marginTop: -6 }}>
          Recuamos 30 minutos por semana, de {hourLabel(s.profile.wakeTimeCurrent)} até {hourLabel(s.profile.wakeTimeGoal)}. Se um dia
          não der certo, tudo bem: retome no próximo.
        </p>
        <ul className="list" style={{ marginTop: 10 }}>
          {plan.map((st) => (
            <li className="row" key={st.index}>
              <span className={`num ${st.state === "upcoming" ? "muted" : ""}`}>{st.state === "done" ? <CheckIcon size={16} strokeWidth={3} /> : st.index + 1}</span>
              <span className="row-main">
                Semana {st.index + 1}
                <small>
                  {dayMonth(st.startDate)} a {dayMonth(addDays(st.startDate, 6))}
                  {st.state === "current" ? " · semana atual" : ""}
                </small>
              </span>
              <span className="pill">{st.time}</span>
            </li>
          ))}
        </ul>
        <p className="card-sub" style={{ marginTop: 12 }}>
          Para mudar os horários ou recomeçar o plano, toque no logo NORTE no topo e abra Ajustes.
        </p>
      </Modal>

      <RoutineRunner open={runner} onClose={() => setRunner(false)} period={dayPart(now) === "night" ? "evening" : "morning"} today={today} />
    </>
  );
}

function RoutineRunner({ open, onClose, period, today }: { open: boolean; onClose: () => void; period: Period; today: string }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [skipped, setSkipped] = useState<string[]>([]);
  const pending = routineFor(s, period).filter((r) => !isDone(s, r.id, today) && !skipped.includes(r.id));
  const current = pending[0];
  const total = routineFor(s, period).length;
  const doneCount = routineFor(s, period).filter((r) => isDone(s, r.id, today)).length;

  const close = () => {
    setSkipped([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={period === "morning" ? "Rotina da manhã" : "Rotina da noite"}>
      <p className="card-sub" style={{ marginTop: -6 }}>
        {doneCount} de {total} feitos hoje
      </p>
      {current ? (
        <div className="card" style={{ textAlign: "center", padding: "26px 16px", marginTop: 12 }}>
          <span className="icon-bubble" style={{ margin: "0 auto 12px", width: 72, height: 72 }}>
            <Icon name={current.icon} size={34} />
          </span>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{current.title}</div>
          {current.time && <div className="card-sub">Previsto para {current.time}</div>}
          <div className="btn-row" style={{ justifyContent: "center", marginTop: 18 }}>
            <button type="button" className="btn" onClick={() => setSkipped((x) => [...x, current.id])}>
              Pular por agora
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                mutate((d) => setRoutineDone(d, current.id, true, today));
              }}
            >
              <CheckIcon size={18} /> Feito
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "26px 16px", marginTop: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{doneCount === total ? "Rotina concluída." : "Por agora é isso."}</div>
          <p className="card-sub">{doneCount === total ? "Bom trabalho. Constância vence motivação." : "Os itens pulados continuam pendentes para quando der."}</p>
          <button
            type="button"
            className="btn primary"
            style={{ marginTop: 12 }}
            onClick={() => {
              if (doneCount === total) toast("Rotina concluída. Bom trabalho!");
              close();
            }}
          >
            Fechar
          </button>
        </div>
      )}
    </Modal>
  );
}
