"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { Hero } from "@/components/Hero";
import { useStore } from "@/store/StoreProvider";
import { useSync } from "@/store/SyncProvider";

/** Login antes do onboarding (aparelho novo): baixa os dados da nuvem. */
export default function Entrar() {
  const { state, hydrated } = useStore();
  const sync = useSync();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !sync.user || !sync.lastReconcile) return;
    router.replace(state ? "/hoje" : "/onboarding");
  }, [hydrated, sync.user, sync.lastReconcile, state, router]);

  return (
    <main>
      <Hero title="Bem-vindo de volta" sub="Entre para recuperar seus dados." quote="Um novo rumo, um passo de cada vez." />
      <div className="sheet no-nav">
        <AuthPanel />
      </div>
    </main>
  );
}
