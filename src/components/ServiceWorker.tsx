"use client";

import { useEffect } from "react";
import { asset } from "@/lib/paths";

/** Registra o service worker (só em produção) e aplica versões novas sozinho. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reloaded = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onChange = () => {
      // Só recarrega quando uma versão nova assume (não na primeira instalação).
      if (reloaded || !hadController) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    navigator.serviceWorker
      .register(asset("/sw.js"), { updateViaCache: "none", scope: asset("/") })
      .then((reg) => {
        const check = () => document.visibilityState === "visible" && reg.update().catch(() => {});
        document.addEventListener("visibilitychange", check);
      })
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);
  return null;
}
