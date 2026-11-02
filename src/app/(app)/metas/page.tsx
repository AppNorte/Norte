"use client";

import { useState } from "react";
import { Award, Flame, Plus, Trash2 } from "lucide-react";
import { Hero } from "@/components/Hero";
import { ICON_CHOICES, Icon } from "@/components/Icon";
import { MoodCheck } from "@/components/MoodCheck";
import { Bar, Card, CardHead, Check, Cta, Field, HeadLink, Modal, useToast } from "@/components/ui";
import { dayMonth, fromDateKey, toDateKey, weekStart } from "@/lib/dates";
import { money } from "@/lib/finance/logic";
import { achievements, habitStreak, habitsFor, isHabitDay, lastDays, toggleHabit, weekStats } from "@/lib/growth";
import { uid } from "@/lib/id";
import type { Goal, Habit, IconKey } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];
const AREAS = ["Fé", "Família", "Finanças", "Saúde", "Carreira", "Estudos", "Casa", "Pessoal"];

export default function Metas() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const today = toDateKey();
  const [habitForm, setHabitForm] = useState<Habit | "new" | null>(null);
  const [goalForm, setGoalForm] = useState<Goal | "new" | null>(null);
  const [review, setReview] = useState(false);

  const todays = habitsFor(s, today);
  const others = s.growth.habits.filter((h) => !todays.includes(h));
  const goals = s.growth.goals.filter((g) => g.status !== "done");
  const doneGoals = s.growth.goals.filter((g) => g.status === "done");
  const week = weekStats(s, today);
  const reviewedThisWeek = s.growth.reviews.some((r) => r.weekStart === weekStart(today));
  const badges = achievements(s, today);
  const days7 = lastDays(today, 7);

  return (
    <>
      <Hero title="Metas e hábitos" sub="Pequenos passos, grandes destinos." quote="Constância vence motivação." />
      <div className="sheet">
        <Card>
          <CardHead title="Como você está hoje?" sub="Um toque. Ajuda você e o NORTE a entender seus dias." />
          <MoodCheck />
        </Card>

        <Card>
          <CardHead title="Hábitos de hoje" sub={todays.length ? `${todays.filter((h) => h.log.includes(today)).length} de ${todays.length} feitos` : "Crie hábitos pequenos e possíveis."} action={<HeadLink onClick={() => setHabitForm("new")}>Novo</HeadLink>} />
          {s.growth.habits.length === 0 ? (
            <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setHabitForm("new")}>
              Ex.: beber 2L de água, 10 min sem celular antes de dormir, caminhar 20 min. <span className="inline-link">Criar hábito</span>
            </button>
          ) : (
            <ul className="list">
              {[...todays, ...others].map((h) => {
                const done = h.log.includes(today);
                const streak = habitStreak(h, today);
                const isToday = todays.includes(h);
                return (
                  <li key={h.id} className="habit-row" style={{ opacity: isToday ? 1 : 0.55 }}>
                    <button type="button" className="habit-main" onClick={() => setHabitForm(h)}>
                      <span className="row-icon">
                        <Icon name={h.icon as IconKey} size={24} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className={`habit-title ${done ? "done-text" : ""}`}>{h.title}</span>
                        <span className="habit-week" aria-hidden="true">
                          {days7.map((d) => (
                            <i key={d} data-done={h.log.includes(d)} data-off={!isHabitDay(h, d)} />
                          ))}
                          {streak > 1 && (
                            <b className="streak">
                              <Flame size={13} /> {streak}
                            </b>
                          )}
                        </span>
                      </span>
                    </button>
                    {isToday ? <Check checked={done} label={h.title} onChange={() => mutate((d) => toggleHabit(d, h.id, today))} /> : <small className="card-sub">hoje não</small>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Metas" sub="O que você quer alcançar e por quê." action={<HeadLink onClick={() => setGoalForm("new")}>Nova</HeadLink>} />
          {goals.length === 0 ? (
            <button type="button" className="empty" style={{ width: "100%", textAlign: "left" }} onClick={() => setGoalForm("new")}>
              Defina uma meta e quebre em passos pequenos. <span className="inline-link">Criar meta</span>
            </button>
          ) : (
            goals.map((g) => {
              const done = g.steps.filter((x) => x.done).length;
              const pct = g.steps.length ? (done / g.steps.length) * 100 : 0;
              const next = g.steps.find((x) => !x.done);
              return (
                <button type="button" key={g.id} className="goal-row" onClick={() => setGoalForm(g)}>
                  <span className="goal-top">
                    <b>{g.title}</b>
                    <span className="tag">{g.area}</span>
                  </span>
                  <Bar value={pct} label={`Progresso de ${g.title}`} />
                  <small>
                    {g.steps.length ? `${done} de ${g.steps.length} passos` : "Sem passos ainda"}
                    {g.deadline ? ` · até ${dayMonth(g.deadline)}` : ""}
                    {next ? ` · próximo: ${next.title}` : ""}
                  </small>
                </button>
              );
            })
          )}
          {doneGoals.length > 0 && <p className="card-sub" style={{ marginTop: 8 }}>✓ {doneGoals.length} meta(s) concluída(s)</p>}
        </Card>

        <Card>
          <CardHead title="Sua semana" sub={`Desde ${dayMonth(week.start)}`} />
          <div className="week-grid">
            <div className="stat">
              <b>{week.habitsPct == null ? "—" : `${week.habitsPct}%`}</b>
              <small>hábitos</small>
            </div>
            <div className="stat">
              <b>{week.routineDone}</b>
              <small>itens de rotina</small>
            </div>
            <div className="stat">
              <b>{week.moments}</b>
              <small>momentos família</small>
            </div>
            <div className="stat">
              <b>{week.gratitude}</b>
              <small>dias de gratidão</small>
            </div>
            <div className="stat">
              <b>{week.avgMood == null ? "—" : week.avgMood.toFixed(1)}</b>
              <small>humor médio</small>
            </div>
            <div className="stat">
              <b style={{ fontSize: 16 }}>{money(week.spent, s.finance.hideValues)}</b>
              <small>gastos</small>
            </div>
          </div>
          <button type="button" className="btn block" style={{ marginTop: 12 }} onClick={() => setReview(true)}>
            {reviewedThisWeek ? "Ver revisão da semana" : fromDateKey(today).getDay() === 0 || fromDateKey(today).getDay() === 6 ? "Fazer a revisão da semana" : "Revisão semanal"}
          </button>
        </Card>

        <Card>
          <CardHead title="Conquistas" icon={<Award size={28} color="var(--yellow-ink)" />} />
          {badges.length === 0 ? (
            <p className="empty">Suas conquistas aparecem aqui conforme você avança. Comece pequeno.</p>
          ) : (
            <div className="badges">
              {badges.map((b) => (
                <div key={b.id} className="badge">
                  <Award size={20} />
                  <span>
                    <b>{b.title}</b>
                    <small>{b.sub}</small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Cta onClick={() => setGoalForm("new")} tagline="Um novo rumo começa com uma decisão.">
          Nova meta
        </Cta>
      </div>

      <Modal open={habitForm !== null} onClose={() => setHabitForm(null)} title={habitForm === "new" ? "Novo hábito" : "Editar hábito"}>
        {habitForm !== null && <HabitForm key={habitForm === "new" ? "n" : habitForm.id} habit={habitForm === "new" ? undefined : habitForm} onClose={() => setHabitForm(null)} />}
      </Modal>
      <Modal open={goalForm !== null} onClose={() => setGoalForm(null)} title={goalForm === "new" ? "Nova meta" : "Meta"}>
        {goalForm !== null && <GoalForm key={goalForm === "new" ? "n" : goalForm.id} goalId={goalForm === "new" ? undefined : goalForm.id} onClose={() => setGoalForm(null)} />}
      </Modal>
      <Modal open={review} onClose={() => setReview(false)} title="Revisão da semana">
        {review && (
          <ReviewForm
            onDone={() => {
              setReview(false);
              toast("Revisão salva. Siga firme.");
            }}
          />
        )}
      </Modal>
    </>
  );
}

function HabitForm({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const { mutate } = useAppState();
  const [title, setTitle] = useState(habit?.title ?? "");
  const [icon, setIcon] = useState<string>(habit?.icon ?? "check");
  const [days, setDays] = useState<number[]>(habit?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !days.length) return;
        mutate((d) => {
          if (habit) Object.assign(d.growth.habits.find((h) => h.id === habit.id)!, { title: title.trim(), icon, weekdays: days });
          else d.growth.habits.push({ id: uid(), title: title.trim(), icon, weekdays: days, active: true, log: [], createdAt: new Date().toISOString() });
        });
        onClose();
      }}
    >
      <Field label="Hábito">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Beber 2L de água" required />
      </Field>
      <Field label="Dias da semana" group>
        <div className="dow">
          {DOW.map((d, i) => (
            <button key={i} type="button" className="chip" aria-pressed={days.includes(i)} aria-label={["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][i]} onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i].sort()))}>
              {d}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Ícone" group>
        <div className="chips">
          {ICON_CHOICES.map((c) => (
            <button key={c.key} type="button" className="chip" aria-pressed={icon === c.key} aria-label={c.label} onClick={() => setIcon(c.key)}>
              <Icon name={c.key} size={18} />
            </button>
          ))}
        </div>
      </Field>
      <button type="submit" className="btn primary block">
        Salvar hábito
      </button>
      {habit && (
        <button
          type="button"
          className="btn ghost block"
          style={{ marginTop: 8, color: "#a12f2f" }}
          onClick={() => {
            mutate((d) => void (d.growth.habits = d.growth.habits.filter((h) => h.id !== habit.id)));
            onClose();
          }}
        >
          <Trash2 size={18} /> Excluir hábito
        </button>
      )}
    </form>
  );
}

function GoalForm({ goalId, onClose }: { goalId?: string; onClose: () => void }) {
  const { s, mutate } = useAppState();
  const goal = s.growth.goals.find((g) => g.id === goalId);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [why, setWhy] = useState(goal?.why ?? "");
  const [area, setArea] = useState(goal?.area ?? "Pessoal");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [steps, setSteps] = useState<string>("");
  const [newStep, setNewStep] = useState("");

  if (goal) {
    const upd = (fn: (g: Goal) => void) => mutate((d) => fn(d.growth.goals.find((g) => g.id === goal.id)!));
    return (
      <div>
        {goal.why && <p className="card-sub" style={{ marginTop: -6 }}>Por quê: {goal.why}</p>}
        <ul className="list">
          {goal.steps.map((st) => (
            <li key={st.id} className="row">
              <Check checked={st.done} label={st.title} onChange={() => upd((g) => void (g.steps.find((x) => x.id === st.id)!.done = !st.done))} />
              <span className={`row-main ${st.done ? "done-text" : ""}`} style={{ fontSize: 15.5, marginLeft: 8 }}>
                {st.title}
              </span>
              <button type="button" className="icon-btn" aria-label={`Remover passo ${st.title}`} onClick={() => upd((g) => void (g.steps = g.steps.filter((x) => x.id !== st.id)))}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <form
          style={{ display: "flex", gap: 8, margin: "10px 0" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newStep.trim()) return;
            upd((g) => void g.steps.push({ id: uid(), title: newStep.trim(), done: false }));
            setNewStep("");
          }}
        >
          <input className="input" value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Novo passo" aria-label="Novo passo" />
          <button type="submit" className="send" aria-label="Adicionar passo" style={{ flex: "none" }}>
            <Plus size={20} />
          </button>
        </form>
        <div className="btn-row">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              upd((g) => void (g.status = "done"));
              onClose();
            }}
          >
            Concluir meta
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ marginLeft: "auto", color: "#a12f2f" }}
            onClick={() => {
              mutate((d) => void (d.growth.goals = d.growth.goals.filter((g) => g.id !== goal.id)));
              onClose();
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        mutate((d) =>
          void d.growth.goals.push({
            id: uid(),
            title: title.trim(),
            why: why.trim(),
            area,
            deadline: deadline || null,
            steps: steps
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean)
              .map((t) => ({ id: uid(), title: t, done: false })),
            status: "active",
            createdAt: new Date().toISOString(),
          }),
        );
        onClose();
      }}
    >
      <Field label="Meta">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Quitar o cartão até dezembro" required />
      </Field>
      <Field label="Por que isso importa?">
        <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Ex.: Paz em casa e liberdade" />
      </Field>
      <Field label="Área" group>
        <div className="chips">
          {AREAS.map((a) => (
            <button key={a} type="button" className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
              {a}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Prazo (opcional)">
        <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <Field label="Passos (um por linha)">
        <textarea className="textarea" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={"Listar todas as dívidas\nNegociar juros\nGuardar R$ 300 por mês"} />
      </Field>
      <button type="submit" className="btn primary block">
        Criar meta
      </button>
    </form>
  );
}

function ReviewForm({ onDone }: { onDone: () => void }) {
  const { s, mutate } = useAppState();
  const ws = weekStart(toDateKey());
  const ex = s.growth.reviews.find((r) => r.weekStart === ws);
  const [wins, setWins] = useState(ex?.wins ?? "");
  const [lessons, setLessons] = useState(ex?.lessons ?? "");
  const [next, setNext] = useState(ex?.nextFocus ?? "");
  const past = s.growth.reviews.filter((r) => r.weekStart !== ws).slice(-4).reverse();
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate((d) => {
            d.growth.reviews = [...d.growth.reviews.filter((r) => r.weekStart !== ws), { weekStart: ws, wins: wins.trim(), lessons: lessons.trim(), nextFocus: next.trim(), createdAt: new Date().toISOString() }];
          });
          onDone();
        }}
      >
        <Field label="O que deu certo esta semana?">
          <textarea className="textarea" value={wins} onChange={(e) => setWins(e.target.value)} />
        </Field>
        <Field label="O que aprendi / o que faria diferente?">
          <textarea className="textarea" value={lessons} onChange={(e) => setLessons(e.target.value)} />
        </Field>
        <Field label="Meu foco para a próxima semana">
          <input className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <button type="submit" className="btn primary block">
          Salvar revisão
        </button>
      </form>
      {past.length > 0 && (
        <>
          <h3 className="sub-title">Semanas anteriores</h3>
          {past.map((r) => (
            <div key={r.weekStart} className="card" style={{ padding: 14 }}>
              <div className="day-head" style={{ marginTop: 0 }}>
                Semana de {dayMonth(r.weekStart)}
              </div>
              {r.wins && <p style={{ margin: "6px 0 0" }}>✓ {r.wins}</p>}
              {r.nextFocus && <p className="card-sub">Foco: {r.nextFocus}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
