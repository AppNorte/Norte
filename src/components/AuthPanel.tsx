"use client";

import { useState } from "react";
import { Cloud, CloudOff, LogOut, RefreshCw } from "lucide-react";
import { Card, CardHead, Field, useToast } from "./ui";
import { getSupabase } from "@/lib/supabase";
import { appUrl } from "@/lib/paths";
import { syncConfigured, useSync } from "@/store/SyncProvider";

function translate(msg: string): string {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos e tente de novo.";
  if (/already registered|already exists/i.test(msg)) return "Este e-mail já tem conta. Use “Entrar”.";
  if (/password.*(6|short)/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}

export function AuthPanel() {
  const sync = useSync();
  const toast = useToast();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!syncConfigured) {
    return (
      <Card>
        <CardHead title="Nuvem não configurada" icon={<CloudOff size={28} />} />
        <p className="card-sub">
          Por enquanto seus dados ficam salvos só neste aparelho. Quando o Supabase for configurado (variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> na Vercel), aqui aparece o login para salvar tudo na nuvem.
        </p>
      </Card>
    );
  }

  if (sync.recovery) return <NewPassword onDone={sync.endRecovery} />;

  if (sync.user) {
    const when = sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
    return (
      <Card>
        <CardHead title="Salvo na nuvem" sub={sync.user.email} icon={<Cloud size={28} color="var(--green)" />} />
        <p className="card-sub" style={{ marginTop: -4 }}>
          {sync.status === "syncing" ? "Sincronizando…" : sync.status === "error" ? `Erro: ${sync.error}` : when ? `Última sincronização às ${when}.` : "Conectado."}
        </p>
        <p className="card-sub">Use o mesmo e-mail em outro aparelho para ver os mesmos dados.</p>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => void sync.syncNow()}>
            <RefreshCw size={18} /> Sincronizar agora
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              await sync.signOut();
              toast("Você saiu. Os dados continuam neste aparelho.");
            }}
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMsg(null);
    const res =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email: email.trim(), password })
        : await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: appUrl("/entrar") } });
    setBusy(false);
    if (res.error) {
      setMsg(translate(res.error.message));
      return;
    }
    if (mode === "up" && !res.data.session) {
      setMsg("Conta criada! Abra o e-mail que enviamos e toque no link para confirmar. Depois volte e toque em Entrar.");
      setMode("in");
      return;
    }
    toast("Bem-vindo! Seus dados agora ficam salvos na nuvem.");
  };

  return (
    <Card>
      <CardHead title={mode === "in" ? "Entrar" : "Criar conta"} sub="Salve tudo na nuvem e use em mais de um aparelho." icon={<Cloud size={28} />} />
      <div className="seg">
        <button type="button" role="tab" className="seg-btn" aria-selected={mode === "in"} onClick={() => setMode("in")}>
          Entrar
        </button>
        <button type="button" role="tab" className="seg-btn" aria-selected={mode === "up"} onClick={() => setMode("up")}>
          Criar conta
        </button>
      </div>
      <form onSubmit={submit}>
        <Field label="E-mail">
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Senha (mínimo 6 caracteres)">
          <input
            className="input"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {msg && (
          <p className="empty" role="alert" style={{ marginBottom: 12 }}>
            {msg}
          </p>
        )}
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      {mode === "in" && (
        <button
          type="button"
          className="btn ghost block"
          style={{ marginTop: 6 }}
          onClick={async () => {
            const sb = getSupabase();
            if (!sb) return;
            if (!email.trim()) {
              setMsg("Digite seu e-mail acima e toque de novo em “Esqueci minha senha”.");
              return;
            }
            setBusy(true);
            const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl("/entrar") });
            setBusy(false);
            setMsg(error ? translate(error.message) : "Enviamos um link para o seu e-mail. Abra-o neste aparelho para criar uma nova senha.");
          }}
        >
          Esqueci minha senha
        </button>
      )}
    </Card>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card>
      <CardHead title="Criar nova senha" icon={<Cloud size={28} />} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const sb = getSupabase();
          if (!sb) return;
          setBusy(true);
          const { error } = await sb.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) {
            setMsg(translate(error.message));
            return;
          }
          toast("Senha atualizada.");
          onDone();
        }}
      >
        <Field label="Nova senha (mínimo 6 caracteres)">
          <input className="input" type="password" autoComplete="new-password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
        </Field>
        {msg && (
          <p className="empty" role="alert" style={{ marginBottom: 12 }}>
            {msg}
          </p>
        )}
        <button type="submit" className="btn primary block" disabled={busy}>
          Salvar nova senha
        </button>
      </form>
    </Card>
  );
}
