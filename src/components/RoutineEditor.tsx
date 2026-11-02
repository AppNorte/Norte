"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ICON_CHOICES, Icon } from "./Icon";
import { Modal, Toggle, useToast } from "./ui";
import { useAppState } from "@/store/StoreProvider";
import { deleteRoutineItem, moveRoutineItem, routineFor, saveRoutineItem, sortRoutineByTime } from "@/store/logic";
import type { IconKey, Period } from "@/lib/types";
import { guessIcon } from "@/lib/seed";

export function RoutineEditor({ open, onClose, period }: { open: boolean; onClose: () => void; period: Period }) {
  return (
    <Modal open={open} onClose={onClose} title={period === "morning" ? "Editar manhã" : "Editar noite"}>
      {open && <Editor period={period} onClose={onClose} />}
    </Modal>
  );
}

function Editor({ period, onClose }: { period: Period; onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const items = routineFor(s, period, true);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");

  return (
    <div>
      <p className="card-sub" style={{ marginTop: -6, marginBottom: 12 }}>
        Ajuste nomes, horários e a ordem. As alterações são salvas na hora.
      </p>
      <ul className="list">
        {items.map((r, i) => (
          <li key={r.id} className="card" style={{ padding: 12, marginBottom: 8, opacity: r.active ? 1 : 0.6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label className="sr-only" htmlFor={`ic-${r.id}`}>
                Ícone
              </label>
              <span className="row-icon" style={{ width: 28 }}>
                <Icon name={r.icon} size={22} />
              </span>
              <input
                className="input"
                value={r.title}
                aria-label="Nome do item"
                onChange={(e) => mutate((d) => saveRoutineItem(d, { ...r, title: e.target.value }))}
              />
              <Toggle
                checked={r.active}
                label={r.active ? `Desativar ${r.title}` : `Ativar ${r.title}`}
                onChange={() => mutate((d) => saveRoutineItem(d, { ...r, active: !r.active }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input
                className="input"
                type="time"
                style={{ width: 120, flex: "none" }}
                value={r.time ?? ""}
                aria-label="Horário"
                onChange={(e) => mutate((d) => saveRoutineItem(d, { ...r, time: e.target.value || null }))}
              />
              <select
                id={`ic-${r.id}`}
                className="select"
                value={r.icon}
                onChange={(e) => mutate((d) => saveRoutineItem(d, { ...r, icon: e.target.value as IconKey }))}
                style={{ minWidth: 0 }}
              >
                {ICON_CHOICES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => mutate((d) => moveRoutineItem(d, r.id, -1))}>
                <ArrowUp size={20} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Descer"
                disabled={i === items.length - 1}
                onClick={() => mutate((d) => moveRoutineItem(d, r.id, 1))}
              >
                <ArrowDown size={20} />
              </button>
              {r.kind !== "wake" && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remover ${r.title}`}
                  onClick={() => {
                    const snapshot = r;
                    mutate((d) => deleteRoutineItem(d, r.id));
                    toast(`“${r.title}” removido.`, () => mutate((d) => void d.routine.push(snapshot)));
                  }}
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form
        className="card"
        style={{ padding: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTitle.trim()) return;
          mutate((d) => saveRoutineItem(d, { period, title: newTitle.trim(), time: newTime || null, icon: guessIcon(newTitle) }));
          setNewTitle("");
          setNewTime("");
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Novo item (ex.: Caminhada)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} aria-label="Novo item" />
          <input className="input" type="time" style={{ width: 120, flex: "none" }} value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Horário do novo item" />
        </div>
        <button type="submit" className="btn block" style={{ marginTop: 8 }}>
          <Plus size={18} /> Adicionar
        </button>
      </form>

      <div className="btn-row" style={{ marginTop: 4 }}>
        <button type="button" className="btn ghost" onClick={() => mutate((d) => sortRoutineByTime(d, period))}>
          Ordenar por horário
        </button>
        <button type="button" className="btn primary" style={{ marginLeft: "auto" }} onClick={onClose}>
          Pronto
        </button>
      </div>
    </div>
  );
}
