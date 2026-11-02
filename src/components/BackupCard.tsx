"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Card, CardHead, useToast } from "./ui";
import { toDateKey } from "@/lib/dates";
import type { AppState } from "@/lib/types";
import { migrate } from "@/store/migrate";
import { useStore } from "@/store/StoreProvider";

const LAST = "norte:last-backup";

/** Baixar e restaurar um arquivo com todos os dados (funciona sem nuvem). */
export function BackupCard() {
  const { state, replace } = useStore();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [last, setLast] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(LAST);
    } catch {
      return null;
    }
  });

  const download = () => {
    if (!state) return;
    const blob = new Blob([JSON.stringify({ app: "NORTE", exportedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `norte-backup-${toDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const when = new Date().toISOString();
    try {
      window.localStorage.setItem(LAST, when);
    } catch {
      /* ignore */
    }
    setLast(when);
    toast("Backup baixado. Guarde o arquivo em um lugar seguro (Drive, e-mail…).");
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      const st = migrate(json?.state ?? json);
      if (!st) throw new Error("inválido");
      setPending(st);
    } catch {
      toast("Esse arquivo não é um backup do NORTE.");
    }
    if (input.current) input.current.value = "";
  };

  return (
    <Card>
      <CardHead title="Backup" sub="Um arquivo com todos os seus dados. Útil para trocar de celular ou se precaver." />
      <p className="card-sub" style={{ marginTop: -4 }}>
        {last ? `Último backup: ${new Date(last).toLocaleDateString("pt-BR")}.` : "Você ainda não fez nenhum backup."}
      </p>
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button type="button" className="btn primary" onClick={download}>
          <Download size={18} /> Baixar backup
        </button>
        <button type="button" className="btn" onClick={() => input.current?.click()}>
          <Upload size={18} /> Restaurar
        </button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} aria-label="Arquivo de backup" />
      </div>
      {pending && (
        <div className="empty" role="alert" style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 10px" }}>
            Restaurar o backup de <b>{pending.profile.displayName}</b>
            {pending.updatedAt ? ` (salvo em ${new Date(pending.updatedAt).toLocaleDateString("pt-BR")})` : ""}? Os dados atuais deste aparelho serão substituídos.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn danger sm"
              onClick={() => {
                replace({ ...pending, updatedAt: Date.now() });
                setPending(null);
                toast("Backup restaurado.");
              }}
            >
              Substituir pelos dados do backup
            </button>
            <button type="button" className="btn sm" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
