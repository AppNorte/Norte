"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/StoreProvider";
import { BottomNav } from "./BottomNav";
import { Compass } from "./Compass";

/** Envolve as telas internas: garante onboarding feito e mostra o menu inferior. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, hydrated } = useStore();
  const router = useRouter();

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
      <BottomNav />
    </>
  );
}
