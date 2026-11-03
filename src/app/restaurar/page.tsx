"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackupCard } from "@/components/BackupCard";
import { Hero } from "@/components/Hero";
import { useStore } from "@/store/StoreProvider";

/** Restaurar um backup antes de configurar (aparelho ou link novo). */
export default function Restaurar() {
  const { state, hydrated } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (hydrated && state) router.replace("/hoje");
  }, [hydrated, state, router]);
  return (
    <main>
      <Hero title="Restaurar backup" sub="Traga seus dados de outro aparelho ou link." quote="Guarde o que importa." />
      <div className="sheet no-nav">
        <BackupCard />
      </div>
    </main>
  );
}
