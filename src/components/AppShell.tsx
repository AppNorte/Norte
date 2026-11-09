"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/StoreProvider";
import { BottomNav } from "./BottomNav";
import { Compass } from "./Compass";
import { PushRefresher } from "./PushRefresher";

/** Envolve as telas internas: garante onboarding feito e mostra o menu inferior. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, hydrated } = useStore();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (hydrated && !state) router.replace("/");
  }, [hydrated, state, router]);

  if (!hydrated || !state) {
    return (
      <div className="loading-screen" aria-busy="true">
        <Compass size={64} />
      </div>
    );
  }

  return (
    <>
      <main>{children}</main>
      <PushRefresher />
      {!path.startsWith("/assistente") && (
        <Link href="/assistente" className="fab-ai" aria-label="Falar com o Assistente NORTE">
          <Compass size={34} ring={false} />
        </Link>
      )}
      <BottomNav />
    </>
  );
}
