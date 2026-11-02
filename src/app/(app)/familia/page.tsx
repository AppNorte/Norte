"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarPlus, Check as CheckIcon, ChevronRight, Heart, Pencil, User, Users, X } from "lucide-react";
import { Hero } from "@/components/Hero";
import { MomentForm, type MomentMode } from "@/components/MomentForm";
import { Bar, Card, CardHead, Cta, HeadLink, Modal, tone, useToast } from "@/components/ui";
import { SCREEN_QUOTES } from "@/lib/content";
import { clockTime, dayMonth, shortDayLabel, toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import type { FamilyMember, FamilyMoment } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";
import { deleteMoment, familyWeek, memberName, nextMomentFor, plannedMoments, setMomentStatus } from "@/store/logic";

function isPartner(rel: string) {
  return /espos|marido|mulher|namorad|noiv|c[oô]njuge/i.test(rel);
}

function MemberIcon({ m }: { m: FamilyMember }) {
  return isPartner(m.relationship) ? <Heart size={20} fill="currentColor" strokeWidth={1.5} /> : <User size={20} strokeWidth={2} />;
}

function momentWhen(m: FamilyMoment, today: string) {
  if (!m.plannedAt) return "";
  const d = m.plannedAt.slice(0, 10);
  return `${shortDayLabel(d, today)}${m.plannedAt.length > 10 ? ` ${clockTime(m.plannedAt)}` : ""}`;
}

export default function Familia() {
  const { s, mutate } = useAppState();
  const now = useNow();
  const today = toDateKey(now);
  const [form, setForm] = useState<{ mode: MomentMode; memberId?: string | null } | null>(null);
  const [member, setMember] = useState<string | null>(null);
  const [weekOpen, setWeekOpen] = useState(false);
  const [moment, setMoment] = useState<string | null>(null);

  // Atalho vindo da tela Hoje: /familia?pessoa=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("pessoa");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setForm({ mode: "plan", memberId: id });
  }, []);

  const family = [...s.family].sort((a, b) => a.sortOrder - b.sortOrder);
  const week = familyWeek(s, today);
  const goal = s.weeklyFamilyGoal;
  const upcoming = plannedMoments(s).slice(0, 2);
  const selMember = family.find((f) => f.id === member);
  const selMoment = s.moments.find((m) => m.id === moment);

  return (
    <>
      <Hero title="Família" sub="Pequenos momentos, grandes laços." quote={SCREEN_QUOTES.familia} />
      <div className="sheet">
        <Card>
          <CardHead title="Esta semana" sub="Tempo que aproxima, laços que fortalecem." action={<HeadLink onClick={() => setWeekOpen(true)}>Ver mais</HeadLink>} />
          <div>
            {week.map((r) => {
              const idx = r.memberId ? family.findIndex((f) => f.id === r.memberId) : -1;
              const m = idx >= 0 ? family[idx] : null;
              const toneClass = m ? `tone-${tone(idx)}` : r.category === "family" ? "tone-3" : "tone-4";
              return (
                <div className="week-row" key={r.key}>
                  <span className={`avatar ${toneClass}`}>
                    {m ? <MemberIcon m={m} /> : r.category === "family" ? <Users size={20} /> : <BookOpen size={20} />}
                  </span>
                  <span className="week-label">{r.label}</span>
                  <Bar value={(r.count / goal) * 100} label={`${r.label}: ${r.count} de ${goal}`} />
                  <span className="week-count">
                    {r.count}/{goal}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Pessoas importantes" sub="Gratidão por cada um na minha jornada." />
          <div className="hscroll">
            {family.map((m, i) => {
              const next = nextMomentFor(s, m.id);
              return (
                <button type="button" className="fam-card" key={m.id} onClick={() => setMember(m.id)}>
                  <span className="fam-head">
                    <span className={`avatar tone-${tone(i)}`}>{m.name.charAt(0).toUpperCase()}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="fam-name" style={{ display: "block" }}>
                        {m.name}
                      </span>
                      <span className="fam-rel">{m.relationship}</span>
                    </span>
                  </span>
                  <span className={`fam-note tint-${tone(i)}`}>
                    {next ? (
                      <>
                        <span style={{ color: `var(--${["pink", "lilac", "blue"][tone(i) % 3]}-ink, var(--green))`, display: "block", marginBottom: 2 }}>
                          {isPartner(m.relationship) ? <Heart size={16} fill="currentColor" /> : <CalendarPlus size={16} />}
                        </span>
                        {next.title}
                        <span style={{ display: "block", color: "var(--text-2)", fontSize: 12.5, marginTop: 2 }}>{momentWhen(next, today)}</span>
                      </>
                    ) : (
                      <span style={{ color: "var(--text-2)" }}>Toque para planejar um momento</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="split">
          <Card>
            <h2 className="card-title">Próximo momento juntos</h2>
            <p className="card-sub">Boas memórias se constroem no hoje.</p>
            {upcoming.length === 0 ? (
              <button type="button" className="empty" style={{ marginTop: 10, width: "100%", textAlign: "left" }} onClick={() => setForm({ mode: "plan" })}>
                Nada planejado ainda. <span className="inline-link">Planejar</span>
              </button>
            ) : (
              <ul className="list" style={{ marginTop: 6 }}>
                {upcoming.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="row" style={{ width: "100%", textAlign: "left", gap: 10 }} onClick={() => setMoment(m.id)}>
                      <CalendarPlus size={22} strokeWidth={1.6} style={{ flex: "none" }} />
                      <span className="row-main" style={{ fontSize: 14.5 }}>
                        {momentWhen(m, today).split(" ")[0]} — {m.title}
                      </span>
                      <ChevronRight size={16} style={{ flex: "none" }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="card-title">Registrar momento</h2>
            <p className="card-sub">Guarde o que importa.</p>
            <button
              type="button"
              className="empty"
              style={{ marginTop: 10, width: "100%", textAlign: "left", display: "flex", gap: 8, alignItems: "center", minHeight: 70 }}
              onClick={() => setForm({ mode: "register" })}
            >
              <Pencil size={20} color="var(--green)" style={{ flex: "none" }} />
              <span style={{ flex: 1, fontSize: 14 }}>
                {family[family.length - 1] ? `Ex.: Hoje joguei bola com ${family[family.length - 1].name}` : "O que aconteceu hoje?"}
              </span>
              <ChevronRight size={16} style={{ flex: "none" }} />
            </button>
          </Card>
        </div>

        <Cta onClick={() => setForm({ mode: "plan" })} tagline="Mais presença. Uma vida com propósito.">
          Planejar tempo em família
        </Cta>
      </div>

      <MomentForm open={form !== null} mode={form?.mode ?? "plan"} memberId={form?.memberId} onClose={() => setForm(null)} />

      <Modal open={Boolean(selMember)} onClose={() => setMember(null)} title={selMember?.name ?? ""}>
        {selMember && (
          <div>
            <p className="card-sub" style={{ marginTop: -8 }}>
              {selMember.relationship}
            </p>
            <div className="btn-row" style={{ margin: "12px 0" }}>
              <button type="button" className="btn primary" onClick={() => {
                  setMember(null);
                  setForm({ mode: "plan", memberId: selMember.id });
                }}>
                Planejar momento
              </button>
              <button type="button" className="btn" onClick={() => {
                  setMember(null);
                  setForm({ mode: "register", memberId: selMember.id });
                }}>
                Registrar momento
              </button>
            </div>
            <MomentList
              moments={s.moments.filter((m) => m.memberId === selMember.id)}
              today={today}
              onComplete={(id) => mutate((d) => setMomentStatus(d, id, "completed"))}
              onCancel={(id) => mutate((d) => setMomentStatus(d, id, "cancelled"))}
            />
          </div>
        )}
      </Modal>

      <Modal open={weekOpen} onClose={() => setWeekOpen(false)} title="Momentos registrados">
        <p className="card-sub" style={{ marginTop: -8, marginBottom: 12 }}>
          Meta leve de {goal} momentos por semana em cada linha. Ajuste em Ajustes (toque no logo NORTE).
        </p>
        <MomentList
          moments={s.moments}
          today={today}
          showWho
          onComplete={(id) => mutate((d) => setMomentStatus(d, id, "completed"))}
          onCancel={(id) => mutate((d) => setMomentStatus(d, id, "cancelled"))}
        />
      </Modal>

      <Modal open={Boolean(selMoment)} onClose={() => setMoment(null)} title={selMoment?.title ?? ""}>
        {selMoment && (
          <div>
            <p className="card-sub" style={{ marginTop: -8 }}>
              {momentWhen(selMoment, today)}
              {memberName(s, selMoment.memberId) ? ` · com ${memberName(s, selMoment.memberId)}` : ""}
            </p>
            {selMoment.notes && <p>{selMoment.notes}</p>}
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  mutate((d) => setMomentStatus(d, selMoment.id, "completed"));
                  setMoment(null);
                }}
              >
                <CheckIcon size={18} /> Aconteceu
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  mutate((d) => setMomentStatus(d, selMoment.id, "cancelled"));
                  setMoment(null);
                }}
              >
                Cancelar plano
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function MomentList({
  moments,
  today,
  onComplete,
  onCancel,
  showWho,
}: {
  moments: FamilyMoment[];
  today: string;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  showWho?: boolean;
}) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const planned = moments.filter((m) => m.status === "planned").sort((a, b) => (a.plannedAt ?? "").localeCompare(b.plannedAt ?? ""));
  const done = moments
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""))
    .slice(0, 20);

  const who = (m: FamilyMoment) =>
    m.category === "person" ? memberName(s, m.memberId) : m.category === "family" ? "Família" : "Momento espiritual";

  if (!planned.length && !done.length) return <p className="empty">Nenhum momento ainda. Pequenos momentos contam.</p>;

  return (
    <div>
      {planned.length > 0 && <h3 style={{ fontSize: 16, margin: "4px 0" }}>Planejados</h3>}
      <ul className="list">
        {planned.map((m) => (
          <li className="row" key={m.id}>
            <span className="row-main">
              {m.title}
              <small>
                {momentWhen(m, today)}
                {showWho ? ` · ${who(m)}` : ""}
              </small>
            </span>
            <button type="button" className="icon-btn" aria-label={`Aconteceu: ${m.title}`} onClick={() => onComplete(m.id)}>
              <CheckIcon size={20} color="var(--green)" />
            </button>
            <button type="button" className="icon-btn" aria-label={`Cancelar: ${m.title}`} onClick={() => onCancel(m.id)}>
              <X size={20} />
            </button>
          </li>
        ))}
      </ul>
      {done.length > 0 && <h3 style={{ fontSize: 16, margin: "14px 0 4px" }}>Vividos</h3>}
      <ul className="list">
        {done.map((m) => (
          <li className="row" key={m.id}>
            <span className="row-main">
              {m.title}
              <small>
                {m.occurredAt ? dayMonth(m.occurredAt.slice(0, 10)) : ""}
                {showWho ? ` · ${who(m)}` : ""}
              </small>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Apagar: ${m.title}`}
              onClick={() => {
                const snap = m;
                mutate((d) => deleteMoment(d, m.id));
                toast("Registro apagado.", () => mutate((d) => void d.moments.push(snap)));
              }}
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
