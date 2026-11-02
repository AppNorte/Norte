"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Modal, Toggle, useToast } from "./ui";
import { useStore } from "@/store/StoreProvider";
import { toDateKey } from "@/lib/dates";

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Ajustes">
      {open && <SettingsForm onClose={onClose} />}
    </Modal>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  const { state, mutate, replace } = useStore();
  const toast = useToast();
  const router = useRouter();
  const p = state?.profile;
  const [name, setName] = useState(p?.displayName ?? "");
  const [sleep, setSleep] = useState(p?.sleepTime ?? "23:00");
  const [wake, setWake] = useState(p?.wakeTimeCurrent ?? "06:30");
  const [goal, setGoal] = useState(p?.wakeTimeGoal ?? "05:00");
  const [phrase, setPhrase] = useState(p?.headerPhrase ?? "");
  const [verses, setVerses] = useState(p?.showVerses ?? true);
  const [famGoal, setFamGoal] = useState(state?.weeklyFamilyGoal ?? 3);
  const [restartPlan, setRestartPlan] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!state) return null;

  const save = () => {
    mutate((s) => {
      const timesChanged = s.profile.wakeTimeCurrent !== wake || s.profile.wakeTimeGoal !== goal;
      s.profile.displayName = name.trim() || s.profile.displayName;
      s.profile.sleepTime = sleep;
      s.profile.wakeTimeCurrent = wake;
      s.profile.wakeTimeGoal = goal;
      s.profile.headerPhrase = phrase.trim();
      s.profile.showVerses = verses;
      s.weeklyFamilyGoal = Math.max(1, Math.min(14, Number(famGoal) || 3));
      if (restartPlan || timesChanged) s.profile.planStartDate = toDateKey();
      const wakeItem = s.routine.find((r) => r.kind === "wake");
      if (wakeItem && s.profile.wakeTimeGoal) wakeItem.time = s.profile.wakeTimeGoal;
    });
    toast("Ajustes salvos.");
    onClose();
  };

  return (
    <div>
      <Field label="Seu nome">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
      </Field>
      <div className="grid-2">
        <Field label="Costuma dormir">
          <input className="input" type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} />
        </Field>
        <Field label="Costuma acordar">
          <input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
        </Field>
      </div>
      <Field label="Horário meta para acordar">
        <input className="input" type="time" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </Field>
      <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
        <span className="row-main" style={{ fontSize: 15.5 }}>
          Recomeçar o plano progressivo a partir desta semana
        </span>
        <Toggle checked={restartPlan} onChange={() => setRestartPlan((v) => !v)} label="Recomeçar plano" />
      </label>
      <Field label="Frase do topo (tela Hoje)">
        <input className="input" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Ex.: Direção para uma vida com propósito." />
      </Field>
      <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
        <span className="row-main" style={{ fontSize: 15.5 }}>
          Mostrar versículos nos topos
        </span>
        <Toggle checked={verses} onChange={() => setVerses((v) => !v)} label="Mostrar versículos" />
      </label>
      <Field label="Meta semanal de momentos em família (por pessoa)">
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={14}
          value={famGoal}
          onChange={(e) => setFamGoal(Number(e.target.value))}
        />
      </Field>
      <button type="button" className="btn primary block" onClick={save}>
        Salvar ajustes
      </button>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        {!confirmReset ? (
          <button type="button" className="btn ghost block" onClick={() => setConfirmReset(true)}>
            Apagar dados e refazer configuração
          </button>
        ) : (
          <div className="empty">
            <p style={{ margin: "0 0 10px" }}>Isso apaga rotina, leituras, família e conversas salvas neste aparelho. Tem certeza?</p>
            <div className="btn-row">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  replace(null);
                  onClose();
                  router.replace("/");
                }}
              >
                Apagar tudo
              </button>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
