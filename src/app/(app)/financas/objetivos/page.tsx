"use client";

import { useState } from "react";
import { Minus, Plus, Target, Trash2 } from "lucide-react";
import { Bar, Card, CardHead, Cta, Field, Modal, useToast } from "@/components/ui";
import { FinanceShell } from "@/components/finance/Shell";
import { dayMonth, toDateKey } from "@/lib/dates";
import { centsToInput, goalSaved, money, monthsLeft, parseMoney } from "@/lib/finance/logic";
import { uid } from "@/lib/id";
import type { SavingsGoal } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

const COLORS = ["#1F7A55", "#173a5b", "#c8901c", "#8a5a9e", "#c14c4c", "#2f7f8f"];

export default function Objetivos() {
  const { s } = useAppState();
  const f = s.finance;
  const hide = f.hideValues;
  const [form, setForm] = useState<SavingsGoal | "new" | null>(null);
  const [move, setMove] = useState<{ goal: SavingsGoal; sign: 1 | -1 } | null>(null);
  const goals = f.goals.filter((g) => !g.archived);
  const total = goals.reduce((a, g) => a + goalSaved(g), 0);

  return (
    <FinanceShell sub="Junte dinheiro para o que importa.">
      {goals.length > 0 && (
        <div className="totals-bar two">
          <span>
            <small>Guardado nos objetivos</small>
            <b>{money(total, hide)}</b>
          </span>
          <span>
            <small>Objetivos ativos</small>
            <b>{goals.length}</b>
          </span>
        </div>
      )}
      {goals.length === 0 && (
        <Card>
          <CardHead title="Seus objetivos" sub="Reserva de emergência, viagem, carro, quitar uma dívida…" icon={<Target size={28} />} />
          <button type="button" className="btn primary block" onClick={() => setForm("new")}>
            <Plus size={18} /> Criar o primeiro objetivo
          </button>
        </Card>
      )}
      {goals.map((g) => {
        const saved = goalSaved(g);
        const pct = g.target ? Math.round((saved / g.target) * 100) : 0;
        const left = Math.max(0, g.target - saved);
        const months = monthsLeft(g.deadline);
        return (
          <Card key={g.id}>
            <button type="button" className="goal-head" onClick={() => setForm(g)}>
              <span className="ov-ico" style={{ background: `${g.color}22`, color: g.color }}>
                <Target size={20} />
              </span>
              <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                <b>{g.name}</b>
                <small>
                  {g.deadline ? `até ${dayMonth(g.deadline)}/${g.deadline.slice(0, 4)}` : "sem prazo"}
                  {pct >= 100 ? " · concluído 🎉" : ""}
                </small>
              </span>
              <span className="tx-amount">{pct}%</span>
            </button>
            <div style={{ margin: "10px 0 6px" }}>
              <Bar value={pct} label={`${g.name}: ${pct}%`} />
            </div>
            <div className="cat-line">
              <span>
                {money(saved, hide)} <small className="card-sub">de {money(g.target, hide)}</small>
              </span>
              {left > 0 && months ? <small className="card-sub">{money(Math.ceil(left / months), hide)}/mês</small> : null}
            </div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button type="button" className="btn sm primary" onClick={() => setMove({ goal: g, sign: 1 })}>
                <Plus size={16} /> Guardar
              </button>
              <button type="button" className="btn sm" onClick={() => setMove({ goal: g, sign: -1 })} disabled={saved <= 0}>
                <Minus size={16} /> Retirar
              </button>
            </div>
          </Card>
        );
      })}
      <Cta onClick={() => setForm("new")} tagline="Pouco a pouco, com constância, o objetivo chega.">
        Novo objetivo
      </Cta>

      <Modal open={form !== null} onClose={() => setForm(null)} title={form === "new" ? "Novo objetivo" : "Objetivo"}>
        {form !== null && <GoalForm key={form === "new" ? "n" : form.id} goal={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
      </Modal>
      <Modal open={move !== null} onClose={() => setMove(null)} title={move?.sign === 1 ? `Guardar em ${move.goal.name}` : `Retirar de ${move?.goal.name ?? ""}`}>
        {move && <MoveForm goal={move.goal} sign={move.sign} onClose={() => setMove(null)} />}
      </Modal>
    </FinanceShell>
  );
}

function GoalForm({ goal, onClose }: { goal?: SavingsGoal; onClose: () => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? centsToInput(goal.target) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const [first, setFirst] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = parseMoney(target);
        if (!name.trim() || !t) return;
        mutate((d) => {
          if (goal) Object.assign(d.finance.goals.find((x) => x.id === goal.id)!, { name: name.trim(), target: t, deadline: deadline || null, color });
          else {
            const initial = parseMoney(first);
            d.finance.goals.push({
              id: uid(),
              name: name.trim(),
              target: t,
              icon: "target",
              color,
              deadline: deadline || null,
              entries: initial ? [{ id: uid(), date: toDateKey(), amount: initial, note: "Valor inicial" }] : [],
              archived: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
        toast("Objetivo salvo.");
        onClose();
      }}
    >
      <Field label="Nome">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Reserva de emergência" required />
      </Field>
      <div className="grid-2">
        <Field label="Valor do objetivo">
          <input className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" required />
        </Field>
        <Field label="Prazo (opcional)">
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      </div>
      {!goal && (
        <Field label="Já tenho guardado (opcional)">
          <input className="input" inputMode="decimal" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="0,00" />
        </Field>
      )}
      <Field label="Cor" group>
        <div className="chips">
          {COLORS.map((c) => (
            <button key={c} type="button" className="color-dot" aria-pressed={color === c} aria-label={`Cor ${c}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </Field>
      <button type="submit" className="btn primary block">
        Salvar objetivo
      </button>
      {goal && (
        <>
          <h3 className="sub-title">Histórico</h3>
          {goal.entries.length === 0 ? (
            <p className="empty">Nada guardado ainda.</p>
          ) : (
            <ul className="list">
              {[...goal.entries].reverse().map((e) => (
                <li key={e.id} className="row">
                  <span className="row-main" style={{ fontSize: 14.5 }}>
                    {e.note || (e.amount > 0 ? "Guardado" : "Retirado")}
                    <small>{dayMonth(e.date)}</small>
                  </span>
                  <span className={`tx-amount ${e.amount < 0 ? "neg" : "pos"}`}>{money(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn ghost block"
            style={{ marginTop: 10, color: "#a12f2f" }}
            onClick={() => {
              mutate((d) => void (d.finance.goals = d.finance.goals.filter((x) => x.id !== goal.id)));
              onClose();
            }}
          >
            <Trash2 size={18} /> Excluir objetivo
          </button>
        </>
      )}
    </form>
  );
}

function MoveForm({ goal, sign, onClose }: { goal: SavingsGoal; sign: 1 | -1; onClose: () => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = parseMoney(val);
        if (!v) return;
        mutate((d) => void d.finance.goals.find((x) => x.id === goal.id)!.entries.push({ id: uid(), date: toDateKey(), amount: v * sign, note: note.trim() }));
        toast(sign === 1 ? "Guardado. Cada passo conta!" : "Retirada registrada.");
        onClose();
      }}
    >
      <Field label="Valor">
        <input className="input" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0,00" autoFocus required />
      </Field>
      <Field label="Observação (opcional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <p className="card-sub" style={{ marginTop: -4 }}>
        Isso registra o valor no objetivo. Se for transferir de verdade entre contas, lance também uma transferência.
      </p>
      <button type="submit" className="btn primary block">
        {sign === 1 ? "Guardar" : "Retirar"}
      </button>
    </form>
  );
}
