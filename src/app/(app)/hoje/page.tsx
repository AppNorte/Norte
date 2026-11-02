"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { PrioritiesEditor } from "@/components/PrioritiesEditor";
import { Bar, Card, CardHead, Check, Cta, HeadLink, tone } from "@/components/ui";
import { DAILY_VERSES, pickByDay, SHORT_QUOTES } from "@/lib/content";
import { clockTime, dayPart, greeting, longDate, toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import { useAppState } from "@/store/StoreProvider";
import type { IconKey } from "@/lib/types";
import { money, totalBalance, upcomingBills } from "@/lib/finance/logic";
import { useDailyMessage } from "@/lib/faith/useDaily";
import { habitStreak, habitsFor, toggleHabit } from "@/lib/growth";
import { pantrySummary } from "@/lib/pantry";
import { MoodCheck } from "@/components/MoodCheck";
import { Flame, Sparkles } from "lucide-react";
import {
  bibleStatus,
  bookStatus,
  currentBook,
  isDone,
  nextMomentFor,
  prioritiesDefined,
  prioritiesFor,
  routineFor,
  setMomentStatus,
  toggleRoutine,
  togglePriority,
} from "@/store/logic";

export default function Hoje() {
  const { s, mutate } = useAppState();
  const now = useNow();
  const today = toDateKey(now);
  const [editPrio, setEditPrio] = useState(false);
  const daily = useDailyMessage();
  const habits = habitsFor(s, today);
  const casa = pantrySummary(s, today);
  const moodToday = s.growth.moods.some((m) => m.date === today);

  const night = dayPart(now) === "night";
  const period = night ? "evening" : "morning";
  const items = routineFor(s, period).filter((r) => r.kind !== "wake");
  const prios = prioritiesFor(s, today);
  const prioOk = prioritiesDefined(s, today);
  const tileCount = items.length + 1;
  const bible = bibleStatus(s, today);
  const book = currentBook(s);
  const bs = bookStatus(s, book, today);
  const family = [...s.family].sort((a, b) => a.sortOrder - b.sortOrder);
  const bills = upcomingBills(s.finance, today, 3).filter((b) => !b.income);
  const billsTotal = bills.reduce((acc, b) => acc + b.amount, 0);
  const lateBills = bills.filter((b) => b.overdue).length;

  return (
    <>
      <Hero
        title={`${greeting(now)}, ${s.profile.displayName}`}
        sub={
          <Link href="/meu-dia" className="hero-sub-link" aria-label={`${longDate(now)} — ver meu dia`}>
            {longDate(now)}
            <ChevronRight size={18} strokeWidth={2} style={{ opacity: 0.7 }} />
          </Link>
        }
        quote={s.profile.headerPhrase || null}
        verse={pickByDay(DAILY_VERSES, now)}
      />
      <div className="sheet">
        <Link href="/fe" className="card daily-mini">
          <span className="daily-kicker">
            <Sparkles size={15} /> Mensagem do dia
          </span>
          <span className="daily-mini-text">{daily.text}</span>
          {daily.verse && <span className="daily-mini-ref">{daily.verse.ref}</span>}
        </Link>

        {!moodToday && (
          <Card>
            <CardHead title="Como você está hoje?" />
            <MoodCheck compact />
          </Card>
        )}

        <Card>
          <CardHead
            title={night ? "Sua noite" : "Sua manhã"}
            sub={night ? "Prepare hoje um amanhã melhor." : "Pequenos hábitos, grandes destinos."}
            action={<HeadLink href="/rotina">Ver rotina</HeadLink>}
          />
          <div className="tiles">
            {items.map((r) => {
              const done = isDone(s, r.id, today);
              return (
                <div
                  key={r.id}
                  className="tile"
                  role="group"
                  onClick={() => mutate((d) => toggleRoutine(d, r.id, today))}
                  style={{ cursor: "pointer" }}
                >
                  <span className="row-icon">
                    <Icon name={r.icon} size={24} />
                  </span>
                  <span className={`tile-label ${done ? "done-text" : ""}`}>{r.title}</span>
                  <Check checked={done} label={r.title} onChange={() => mutate((d) => toggleRoutine(d, r.id, today))} />
                </div>
              );
            })}
            <div className="tile" role="group" onClick={() => setEditPrio(true)} style={{ cursor: "pointer" }}>
              <span className="row-icon">
                <Icon name="list" size={24} />
              </span>
              <span className={`tile-label ${prioOk ? "done-text" : ""}`}>3 prioridades</span>
              <Check checked={prioOk} label="Definir 3 prioridades" onChange={() => setEditPrio(true)} />
            </div>
            {tileCount % 2 === 1 && (
              <div className="tile-quote">
                <span>“{pickByDay(SHORT_QUOTES, now)}”</span>
              </div>
            )}
          </div>
          {items.length === 0 && (
            <p className="empty" style={{ marginTop: 8 }}>
              Nenhum item ativo. <Link href="/rotina" className="inline-link">Montar rotina</Link>
            </p>
          )}
        </Card>

        <Card>
          <CardHead
            title="As 3 prioridades de hoje"
            sub="Foco no essencial."
            action={<HeadLink onClick={() => setEditPrio(true)}>Editar</HeadLink>}
          />
          {prios.length === 0 ? (
            <div className="empty">
              Ainda não há prioridades para hoje.{" "}
              <button type="button" onClick={() => setEditPrio(true)}>
                Definir agora
              </button>
            </div>
          ) : (
            <ul className="list">
              {prios.map((p, i) => (
                <li className="row" key={p.id}>
                  <span className="num">{i + 1}</span>
                  <span className={`row-main ${p.status === "done" ? "done-text" : ""}`}>{p.title}</span>
                  <Check checked={p.status === "done"} label={p.title} onChange={() => mutate((d) => togglePriority(d, p.id))} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {habits.length > 0 && (
          <Card>
            <CardHead title="Hábitos de hoje" sub={`${habits.filter((h) => h.log.includes(today)).length} de ${habits.length} feitos`} action={<HeadLink href="/metas">Ver todos</HeadLink>} />
            <ul className="list">
              {habits.map((h) => {
                const streak = habitStreak(h, today);
                return (
                  <li className="row" key={h.id}>
                    <span className="row-icon">
                      <Icon name={h.icon as IconKey} size={24} />
                    </span>
                    <span className={`row-main ${h.log.includes(today) ? "done-text" : ""}`}>
                      {h.title}
                      {streak > 1 && (
                        <small style={{ color: "#c8701c" }}>
                          <Flame size={12} /> {streak} dias seguidos
                        </small>
                      )}
                    </span>
                    <Check checked={h.log.includes(today)} label={h.title} onChange={() => mutate((d) => toggleHabit(d, h.id, today))} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card>
          <CardHead title="Leitura de hoje" sub="Alimente sua mente com a Palavra." action={<HeadLink href="/leitura">Ver leitura</HeadLink>} />
          <div className="mini-cards">
            <Link href="/leitura" className="mini">
              <div className="mini-top">
                <Icon name="bible" size={28} />
                <div className="mini-title">Bíblia</div>
                <div className="mini-meta">
                  {bible.done} de {bible.total}
                  <br />
                  capítulos
                </div>
              </div>
              <div style={{ margin: "8px 0 0 38px" }}>
                <Bar value={bible.pct} label="Progresso do plano bíblico" />
              </div>
              <div className="mini-foot" style={{ marginLeft: 38 }}>
                {bible.completedToday ? `${bible.todayLabel} ✓` : `Hoje: ${bible.todayLabel}`}
              </div>
            </Link>
            <Link href="/leitura" className="mini">
              <div className="mini-top">
                <Icon name="book" size={28} />
                <div className="mini-title">Livro</div>
                {bs && (
                  <div className="mini-meta">
                    {bs.needsSetup ? (
                      <>
                        pág.
                        <br />
                        {bs.from}–{bs.to}
                      </>
                    ) : (
                      <>
                        {book!.currentPage} de {book!.totalPages}
                        <br />
                        páginas
                      </>
                    )}
                  </div>
                )}
              </div>
              <div style={{ margin: "8px 0 0 38px" }}>
                <Bar value={bs?.pct ?? 0} label="Progresso do livro" />
              </div>
              <div className="mini-foot" style={{ marginLeft: 38 }}>
                {!book ? "Escolha um livro" : bs?.completedToday ? "Meta de hoje ✓" : bs?.pct != null ? `${bs.pct}% concluído` : "Defina o total de páginas"}
              </div>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHead title="Finanças" sub="Seu dinheiro com direção." action={<HeadLink href="/financas">Ver finanças</HeadLink>} />
          {s.finance.transactions.length === 0 ? (
            <Link href="/financas" className="empty" style={{ display: "block" }}>
              Comece registrando seus gastos e entradas. <span className="inline-link">Abrir Finanças</span>
            </Link>
          ) : (
            <div className="fin-today">
              <Link href="/financas" className="mini">
                <div className="mini-title">Saldo em contas</div>
                <div className={`balance-sm ${totalBalance(s.finance) < 0 ? "neg" : ""}`}>{money(totalBalance(s.finance), s.finance.hideValues)}</div>
              </Link>
              <Link href="/financas" className="mini">
                <div className="mini-title">A pagar (3 dias)</div>
                <div className={`balance-sm ${lateBills ? "neg" : ""}`}>{bills.length ? money(billsTotal, s.finance.hideValues) : "Nada"}</div>
                <div className="mini-foot">{lateBills ? `${lateBills} atrasada(s)` : bills.length ? `${bills.length} conta(s)` : "Tudo em dia"}</div>
              </Link>
            </div>
          )}
        </Card>

        {(casa.low > 0 || casa.expiring > 0) && (
          <Link href="/casa" className="banner">
            Casa: {[casa.low ? `${casa.low} acabando` : "", casa.expiring ? `${casa.expiring} vencendo` : ""].filter(Boolean).join(" · ")} — ver lista
          </Link>
        )}

        <Card>
          <CardHead title="Família hoje" sub="Pequenos momentos, grandes laços." action={<HeadLink href="/familia">Ver mais</HeadLink>} />
          <div className="hscroll">
            {family.map((m, i) => {
              const next = nextMomentFor(s, m.id);
              const isToday = next?.plannedAt?.startsWith(today);
              return (
                <div className="fam-mini" key={m.id}>
                  <span className={`avatar tone-${tone(i)}`}>{m.name.charAt(0).toUpperCase()}</span>
                  <div className="fam-mini-body">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <b style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</b>
                      {next && (
                        <Check
                          checked={false}
                          label={`Concluir: ${next.title}`}
                          onChange={() => mutate((d) => setMomentStatus(d, next.id, "completed"))}
                        />
                      )}
                    </div>
                    {next ? (
                      <p>
                        {next.title}
                        {isToday && next.plannedAt ? ` (${clockTime(next.plannedAt)})` : ""}
                      </p>
                    ) : (
                      <p>
                        <Link href={`/familia?pessoa=${m.id}`} className="inline-link">
                          Planejar momento
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Cta href="/assistente" tagline="Planeje. Reflita. Organize. Viva melhor.">
          Perguntar ao NORTE
        </Cta>
      </div>
      <PrioritiesEditor open={editPrio} onClose={() => setEditPrio(false)} date={today} />
    </>
  );
}
