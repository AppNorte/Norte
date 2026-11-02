"use client";

import { useState } from "react";
import { Backdrop } from "./Backdrop";
import { Compass } from "./Compass";
import { SettingsSheet } from "./SettingsSheet";
import type { Verse } from "@/lib/content";
import { useStore } from "@/store/StoreProvider";

export function Hero({
  title,
  sub,
  quote,
  verse,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  quote?: Verse | string | null;
  verse?: Verse | null;
}) {
  const [settings, setSettings] = useState(false);
  const { state } = useStore();
  const showVerses = state?.profile.showVerses ?? true;
  const q = typeof quote === "string" ? { text: quote, ref: "" } : quote;
  return (
    <header className="hero">
      <Backdrop />
      <div className="hero-top">
        <button
          type="button"
          className="brand"
          onClick={() => state && setSettings(true)}
          aria-label={state ? "NORTE — abrir ajustes" : "NORTE"}
        >
          <Compass size={44} />
          <span className="brand-word" aria-hidden="true">
            NORTE
          </span>
        </button>
        {q && (showVerses || !q.ref) && (
          <blockquote className="hero-quote" style={{ margin: 0 }}>
            “{q.text}”{q.ref && <cite>{q.ref}</cite>}
          </blockquote>
        )}
      </div>
      <h1 className="hero-title">{title}</h1>
      {sub && <div className="hero-sub">{sub}</div>}
      {verse && showVerses && (
        <blockquote className="hero-verse" style={{ marginBottom: 0, marginRight: 0 }}>
          “{verse.text}”<cite>{verse.ref}</cite>
        </blockquote>
      )}
      {state && <SettingsSheet open={settings} onClose={() => setSettings(false)} />}
    </header>
  );
}
