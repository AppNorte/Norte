"use client";

import { useState } from "react";
import { Modal, useToast } from "./ui";
import { useAppState } from "@/store/StoreProvider";
import { carryOverPriorities, prioritiesFor, setPriorities } from "@/store/logic";
import { addDays } from "@/lib/dates";

export function PrioritiesEditor({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  return (
    <Modal open={open} onClose={onClose} title="As 3 prioridades de hoje">
      {open && <Form onClose={onClose} date={date} />}
    </Modal>
  );
}

function Form({ onClose, date }: { onClose: () => void; date: string }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const current = prioritiesFor(s, date);
  const [titles, setTitles] = useState<string[]>(() => [0, 1, 2].map((i) => current[i]?.title ?? ""));
  const pendingYesterday = prioritiesFor(s, addDays(date, -1)).filter((p) => p.status === "pending");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutate((d) => setPriorities(d, titles, date));
        toast("Prioridades salvas.");
        onClose();
      }}
    >
      <p className="card-sub" style={{ marginTop: -6, marginBottom: 14 }}>
        Foco no essencial. Três coisas que, se feitas, fazem o dia valer.
      </p>
      {titles.map((t, i) => (
        <label className="field" key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="num" aria-hidden="true">
            {i + 1}
          </span>
          <input
            className="input"
            value={t}
            placeholder={`Prioridade ${i + 1}`}
            aria-label={`Prioridade ${i + 1}`}
            onChange={(e) => setTitles((arr) => arr.map((x, k) => (k === i ? e.target.value : x)))}
          />
        </label>
      ))}
      {pendingYesterday.length > 0 && current.length < 3 && (
        <button
          type="button"
          className="btn ghost block"
          onClick={() => {
            mutate((d) => carryOverPriorities(d, date));
            onClose();
            toast("Pendências de ontem trazidas para hoje.");
          }}
        >
          Trazer {pendingYesterday.length} pendente(s) de ontem
        </button>
      )}
      <button type="submit" className="btn primary block" style={{ marginTop: 8 }}>
        Salvar prioridades
      </button>
    </form>
  );
}
