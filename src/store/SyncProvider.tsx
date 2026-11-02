"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "@/lib/types";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { migrate } from "./migrate";
import { useStore } from "./StoreProvider";

export const syncConfigured = supabaseConfigured;

type Status = "off" | "idle" | "syncing" | "error";

interface SyncValue {
  user: { id: string; email: string } | null;
  status: Status;
  lastSync: number | null;
  error: string | null;
  /** Resultado da primeira conciliação após o login: "remote" = baixou da nuvem. */
  lastReconcile: "remote" | "local" | "empty" | null;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SyncValue>({
  user: null,
  status: "off",
  lastSync: null,
  error: null,
  lastReconcile: null,
  syncNow: async () => {},
  signOut: async () => {},
});

const MARK = "norte:sync-user"; // usuário já conciliado neste aparelho
const BACKUP = "norte:backup";

function ls(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Sincroniza o estado inteiro (JSONB) com a tabela app_state do Supabase.
 * Regra: no primeiro login em um aparelho, a nuvem vence (a cópia local vira backup).
 * Depois disso, vence quem foi alterado por último.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { state, hydrated, replace } = useStore();
  const [user, setUser] = useState<SyncValue["user"]>(null);
  const [status, setStatus] = useState<Status>(supabaseConfigured ? "idle" : "off");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastReconcile, setLastReconcile] = useState<SyncValue["lastReconcile"]>(null);
  const synced = useRef<number | null>(null); // updatedAt da última versão igual à nuvem
  const stateRef = useRef(state);
  const reconciled = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Sessão
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const push = useCallback(async (s: AppState, uid: string) => {
    const sb = getSupabase();
    if (!sb) return;
    setStatus("syncing");
    const { error: e } = await sb.from("app_state").upsert({ user_id: uid, data: s, updated_at: new Date(s.updatedAt || Date.now()).toISOString() });
    if (e) {
      setStatus("error");
      setError(e.message);
      return;
    }
    synced.current = s.updatedAt;
    setLastSync(Date.now());
    setError(null);
    setStatus("idle");
  }, []);

  const pull = useCallback(async (uid: string): Promise<AppState | null | undefined> => {
    const sb = getSupabase();
    if (!sb) return undefined;
    const { data, error: e } = await sb.from("app_state").select("data, updated_at").eq("user_id", uid).maybeSingle();
    if (e) {
      setStatus("error");
      setError(e.message);
      return undefined;
    }
    return data ? migrate(data.data) : null;
  }, []);

  const reconcile = useCallback(
    async (uid: string) => {
      setStatus("syncing");
      const remote = await pull(uid);
      if (remote === undefined) return;
      const local = stateRef.current;
      const store = ls();
      const firstTimeHere = store?.getItem(MARK) !== uid;
      if (!remote) {
        if (local) await push(local, uid);
        setLastReconcile(local ? "local" : "empty");
      } else if (!local || firstTimeHere || remote.updatedAt > local.updatedAt) {
        if (local && local.updatedAt !== remote.updatedAt) store?.setItem(BACKUP, JSON.stringify(local));
        synced.current = remote.updatedAt;
        replace(remote);
        setLastReconcile("remote");
        setLastSync(Date.now());
        setStatus("idle");
      } else if (local.updatedAt > remote.updatedAt) {
        await push(local, uid);
        setLastReconcile("local");
      } else {
        synced.current = local.updatedAt;
        setLastReconcile("local");
        setLastSync(Date.now());
        setStatus("idle");
      }
      store?.setItem(MARK, uid);
    },
    [pull, push, replace],
  );

  // Concilia ao entrar
  useEffect(() => {
    if (!hydrated || !user || reconciled.current === user.id) return;
    reconciled.current = user.id;
    void reconcile(user.id);
  }, [hydrated, user, reconcile]);

  // Envia alterações (com espera curta para juntar várias)
  useEffect(() => {
    if (!user || !state || reconciled.current !== user.id) return;
    if (synced.current === state.updatedAt) return;
    const t = setTimeout(() => void push(state, user.id), 1500);
    return () => clearTimeout(t);
  }, [state, user, push]);

  // Ao voltar para o app, busca novidades de outro aparelho
  useEffect(() => {
    if (!user) return;
    const onVis = async () => {
      if (document.visibilityState !== "visible") return;
      const local = stateRef.current;
      if (local && synced.current !== local.updatedAt) return; // há alterações locais a enviar
      const remote = await pull(user.id);
      if (remote && (!local || remote.updatedAt > local.updatedAt)) {
        synced.current = remote.updatedAt;
        replace(remote);
        setLastSync(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user, pull, replace]);

  const syncNow = useCallback(async () => {
    if (!user) return;
    const local = stateRef.current;
    if (local && synced.current !== local.updatedAt) await push(local, user.id);
    else await reconcile(user.id);
  }, [user, push, reconcile]);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const local = stateRef.current;
    if (user && local && synced.current !== local.updatedAt) await push(local, user.id);
    await sb.auth.signOut();
    ls()?.removeItem(MARK);
    reconciled.current = null;
    synced.current = null;
    setLastReconcile(null);
  }, [user, push]);

  const value = useMemo(
    () => ({ user, status, lastSync, error, lastReconcile, syncNow, signOut }),
    [user, status, lastSync, error, lastReconcile, syncNow, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync() {
  return useContext(Ctx);
}
