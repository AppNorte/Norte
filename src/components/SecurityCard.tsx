"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { PinPad } from "./AppLock";
import { Card, CardHead, Field, Modal, useToast } from "./ui";
import { clearLock, getLock, relock, setLockAfter, setPin, verifyPin } from "@/lib/lock";

type Step = null | { mode: "create" | "change" | "remove"; stage: "current" | "new" | "repeat"; first?: string };

/** Mais → Conta e backup: criar, trocar ou remover a senha do app. */
export function SecurityCard() {
  const toast = useToast();
  const [has, setHas] = useState(false);
  const [after, setAfter] = useState(1);
  const [step, setStep] = useState<Step>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const l = getLock();
    /* eslint-disable react-hooks/set-state-in-effect */
    setHas(Boolean(l));
    setAfter(l?.after ?? 1);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const close = () => {
    setStep(null);
    setError(null);
  };

  const onPin = async (pin: string) => {
    if (!step) return;
    setError(null);
    if (step.stage === "current") {
      if (!(await verifyPin(pin))) return setError("Senha atual incorreta.");
      if (step.mode === "remove") {
        clearLock();
        setHas(false);
        close();
        toast("Senha do app removida.");
        return;
      }
      return setStep({ ...step, stage: "new" });
    }
    if (step.stage === "new") return setStep({ ...step, stage: "repeat", first: pin });
    if (pin !== step.first) {
      setStep({ ...step, stage: "new", first: undefined });
      return setError("As senhas não conferem. Digite de novo.");
    }
    await setPin(pin, after);
    setHas(true);
    close();
    toast(step.mode === "create" ? "Senha criada. O NORTE vai pedir ao abrir." : "Senha trocada.");
  };

  const titles = { current: "Digite a senha atual", new: "Crie uma senha de 4 números", repeat: "Repita a nova senha" };

  return (
    <Card>
      <CardHead title="Senha do app" sub={has ? "Ligada neste aparelho." : "Peça uma senha de 4 números ao abrir o NORTE."} icon={<LockKeyhole size={26} />} />
      {has ? (
        <>
          <Field label="Pedir a senha de novo depois de sair do app por">
            <select
              className="select"
              value={after}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAfter(v);
                setLockAfter(v);
              }}
            >
              <option value={0}>Sempre que voltar</option>
              <option value={1}>1 minuto</option>
              <option value={5}>5 minutos</option>
              <option value={30}>30 minutos</option>
            </select>
          </Field>
          <div className="btn-row">
            <button type="button" className="btn sm" onClick={() => setStep({ mode: "change", stage: "current" })}>
              Trocar senha
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                relock();
                location.reload();
              }}
            >
              Bloquear agora
            </button>
            <button type="button" className="btn sm ghost" onClick={() => setStep({ mode: "remove", stage: "current" })}>
              Remover senha
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn primary block" onClick={() => setStep({ mode: "create", stage: "new" })}>
          Criar senha
        </button>
      )}
      <p className="field-hint">A senha vale só para este aparelho. Se esquecer, dá para remover confirmando a senha da sua conta do NORTE.</p>
      <Modal open={step !== null} onClose={close} title={step?.mode === "remove" ? "Remover senha" : step?.mode === "change" ? "Trocar senha" : "Criar senha"}>
        {step && <PinPad key={`${step.mode}-${step.stage}`} title={titles[step.stage]} error={error} onComplete={(p) => void onPin(p)} />}
      </Modal>
    </Card>
  );
}
