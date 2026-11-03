"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Backdrop } from "@/components/Backdrop";
import { Compass } from "@/components/Compass";
import { Cta } from "@/components/ui";
import { useStore } from "@/store/StoreProvider";
import { syncConfigured } from "@/store/SyncProvider";
import Link from "next/link";

export default function Splash() {
  const { state, hydrated } = useStore();
  const router = useRouter();

  // Quem já configurou vai direto para Hoje.
  useEffect(() => {
    if (hydrated && state) router.replace("/hoje");
  }, [hydrated, state, router]);

  return (
    <main className="splash">
      <Backdrop variant="splash" className="hero-backdrop" />
      <div className="splash-mark">
        <Compass size={150} />
      </div>
      <h1 className="splash-word">NORTE</h1>
      <p className="splash-tag">
        Direção para uma vida
        <br />
        com propósito.
      </p>
      <div className="splash-foot">
        <Cta href="/onboarding">Começar</Cta>
        {syncConfigured && (
          <Link href="/entrar" className="splash-login">
            Já tenho conta · Entrar
          </Link>
        )}
        <Link href="/restaurar" className="splash-login" style={{ display: "flex", justifyContent: "center" }}>
          Tenho um backup · Restaurar
        </Link>
        <p className="splash-pillars" aria-label="Fé, Rotina, Finanças, Casa, Família, IA">
          Fé<span>•</span>Rotina<span>•</span>Finanças<span>•</span>Casa<span>•</span>Família<span>•</span>IA
        </p>
      </div>
    </main>
  );
}
