"use client";

import { useCallback, useEffect, useState } from "react";
import { Delete, LockKeyhole } from "lucide-react";
import { Compass } from "./Compass";
import { Field, Modal, useToast } from "./ui";
import { clearLock, failInfo, isLocked, markUnlocked, noteHidden, noteVisible, registerFail, resetFails, verifyPin } from "@/lib/lock";
import { getSupabase } from "@/lib/supabase";
import { useAppState } from "@/store/StoreProvider";
import { useSync } from "@/store/SyncProvider";

/** Teclado de 4 dígitos (usado no bloqueio e para criar/trocar a senha). */
export function PinPad({ title, sub, onComplete, error, left }: { title: string; sub?: string; onComplete: (pin: string) => void; error?: string | null; left?: React.ReactNode }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!error) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setShake(true);
    setPin("");
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = setTimeout(() => setShake(false), 450);
    return () => clearTimeout(t);
  }, [error]);

  const press = useCallback(
    (d: string) =>
      setPin((p) => {
        if (p.length >= 4) return p;
        const n = p + d;
        if (n.length === 4) setTimeout(() => onComplete(n), 120);
        return n;
      }),
    [onComplete],
  );

  // Teclado físico (computador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="pin">
      <h2 className="pin-title">{title}</h2>
      {sub && <p className="pin-sub">{sub}</p>}
      <div className={`pin-dots ${shake ? "shake" : ""}`} aria-label={`${pin.length} de 4 números digitados`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      <p className="pin-error" role="alert">
        {error ?? ""}
      </p>
      <div className="pin-keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className="pin-key" onClick={() => press(d)} aria-label={d}>
            {d}
          </button>
        ))}
        <span className="pin-key ghost">{left}</span>
        <button type="button" className="pin-key" onClick={() => press("0")} aria-label="0">
          0
        </button>
        <button type="button" className="pin-key ghost" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Apagar">
          <Delete size={26} />
        </button>
      </div>
    </div>
  );
}

/** Mostra a tela de senha ao abrir o app e depois de um tempo em segundo plano. */
export function AppLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocked(isLocked());
    const onVis = () => {
      if (document.visibilityState === "hidden") noteHidden();
      else {
        if (isLocked()) setLocked(true);
        noteVisible();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (locked === null) return null;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { s } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    const tick = () => setWait(Math.max(0, Math.ceil((failInfo().until - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="lock-screen">
      <div className="lock-logo">
        <Compass size={64} />
      </div>
      <PinPad
        title={`Oi, ${s.profile.displayName}`}
        sub={wait ? `Muitas tentativas. Aguarde ${wait} s.` : "Digite sua senha"}
        error={error}
        onComplete={async (pin) => {
          if (failInfo().until > Date.now()) {
            setError(`Aguarde ${Math.ceil((failInfo().until - Date.now()) / 1000)} s.`);
            return;
          }
          if (await verifyPin(pin)) {
            resetFails();
            markUnlocked();
            onUnlock();
          } else {
            const f = registerFail();
            setError(f.until > Date.now() ? "Senha incorreta. Aguarde um pouco para tentar de novo." : `Senha incorreta (${f.count}).`);
          }
        }}
        left={
          <button type="button" className="pin-forgot" onClick={() => setForgot(true)}>
            Esqueci
          </button>
        }
      />
      <Modal open={forgot} onClose={() => setForgot(false)} title="Esqueci a senha">
        {forgot && (
          <Forgot
            onDone={() => {
              setForgot(false);
              onUnlock();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function Forgot({ onDone }: { onDone: () => void }) {
  const sync = useSync();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState("");

  if (sync.user)
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const sb = getSupabase();
          if (!sb || !sync.user) return;
          setBusy(true);
          setErr(null);
          const { error } = await sb.auth.signInWithPassword({ email: sync.user.email, password });
          setBusy(false);
          if (error) {
            setErr("Senha da conta incorreta.");
            return;
          }
          clearLock();
          markUnlocked();
          toast("Senha do app removida. Crie outra em Mais → Conta e backup.");
          onDone();
        }}
      >
        <p className="card-sub" style={{ marginTop: -6 }}>
          Confirme a senha da sua conta do NORTE (<b>{sync.user.email}</b>) para remover a senha do app.
        </p>
        <Field label="Senha da conta">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {err && (
          <p className="note" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="btn primary block" disabled={busy || !password}>
          {busy ? "Conferindo…" : "Remover senha do app"}
        </button>
      </form>
    );

  return (
    <div>
      <p className="card-sub" style={{ marginTop: -6 }}>
        Este aparelho não está conectado a uma conta, então não há como confirmar que é você. A única saída é apagar os dados do NORTE <b>deste aparelho</b> (se você tiver um backup, dá para restaurar depois).
      </p>
      <Field label='Para confirmar, digite "APAGAR"'>
        <input className="input" value={confirmWipe} onChange={(e) => setConfirmWipe(e.target.value)} autoCapitalize="characters" />
      </Field>
      <button
        type="button"
        className="btn danger block"
        disabled={confirmWipe.trim().toUpperCase() !== "APAGAR"}
        onClick={() => {
          for (const k of Object.keys(localStorage)) if (k.startsWith("norte:")) localStorage.removeItem(k);
          sessionStorage.clear();
          location.reload();
        }}
      >
        <LockKeyhole size={18} /> Apagar dados e senha deste aparelho
      </button>
    </div>
  );
}
