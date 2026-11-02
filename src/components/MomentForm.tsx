"use client";

import { useState } from "react";
import { Field, Modal, useToast } from "./ui";
import { useAppState } from "@/store/StoreProvider";
import { addMoment } from "@/store/logic";
import type { MomentCategory } from "@/lib/types";
import { addDays, toDateKey } from "@/lib/dates";

export type MomentMode = "register" | "plan";

export function MomentForm({
  open,
  onClose,
  mode,
  memberId,
}: {
  open: boolean;
  onClose: () => void;
  mode: MomentMode;
  memberId?: string | null;
}) {
  return (
    <Modal open={open} onClose={onClose} title={mode === "plan" ? "Planejar momento" : "Registrar momento"}>
      {open && <Form mode={mode} memberId={memberId ?? null} onClose={onClose} />}
    </Modal>
  );
}

function Form({ mode, memberId, onClose }: { mode: MomentMode; memberId: string | null; onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [who, setWho] = useState<string>(memberId ?? "family");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(mode === "plan" ? addDays(toDateKey(), 1) : toDateKey());
  const [time, setTime] = useState("19:00");

  const options: { key: string; label: string }[] = [
    ...[...s.family].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => ({ key: m.id, label: m.name })),
    { key: "family", label: "Família toda" },
    { key: "spiritual", label: "Momento espiritual" },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const category: MomentCategory = who === "family" ? "family" : who === "spiritual" ? "spiritual" : "person";
    mutate((d) =>
      addMoment(d, {
        memberId: category === "person" ? who : null,
        category,
        title,
        notes,
        plannedAt: mode === "plan" ? `${date}T${time || "19:00"}` : null,
        occurred: mode === "register",
      }),
    );
    toast(mode === "plan" ? "Momento planejado." : "Momento registrado. Guarde o que importa.");
    onClose();
  };

  return (
    <form onSubmit={submit}>
      <Field label="Com quem?" group>
        <div className="chips" role="group">
          {options.map((o) => (
            <button key={o.key} type="button" className="chip" aria-pressed={who === o.key} onClick={() => setWho(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={mode === "plan" ? "O que vão fazer?" : "O que aconteceu?"}>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "plan" ? "Ex.: Noite de jogos" : "Ex.: Jogamos bola no fim da tarde"}
          required
        />
      </Field>
      {mode === "plan" && (
        <div className="grid-2">
          <Field label="Dia">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Horário">
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="Anotação (opcional)">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>
      <button type="submit" className="btn primary block">
        {mode === "plan" ? "Salvar plano" : "Registrar"}
      </button>
    </form>
  );
}
