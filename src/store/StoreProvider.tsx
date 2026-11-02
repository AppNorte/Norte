"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "@/lib/types";

const STORAGE_KEY = "norte:v1";

interface StoreValue {
  state: AppState | null; // null = ainda não fez onboarding
  hydrated: boolean;
  /** Aplica uma mutação sobre uma cópia do estado e persiste. */
  mutate: (recipe: (draft: AppState) => void) => void;
  replace: (next: AppState | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.version !== 1 || !parsed.onboarded) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(state: AppState | null) {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // armazenamento indisponível (modo privado etc.) — o app segue funcionando em memória
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // Leitura do localStorage só existe no cliente; precisa acontecer após a montagem.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (first.current) {
      first.current = false;
      return;
    }
    save(state);
  }, [state, hydrated]);

  // Sincroniza entre abas abertas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mutate = useCallback((recipe: (draft: AppState) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      recipe(draft);
      return draft;
    });
  }, []);

  const replace = useCallback((next: AppState | null) => setState(next), []);

  const value = useMemo(() => ({ state, hydrated, mutate, replace }), [state, hydrated, mutate, replace]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}

/** Para telas internas: estado garantido (o AppShell redireciona quem não fez onboarding). */
export function useAppState(): { s: AppState; mutate: StoreValue["mutate"] } {
  const { state, mutate } = useStore();
  if (!state) throw new Error("Estado não inicializado");
  return { s: state, mutate };
}
