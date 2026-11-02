"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Check as CheckIcon, ChevronRight, X } from "lucide-react";
import { Compass } from "./Compass";

// ---------- Cartão ----------

export function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section className={`card ${className}`} id={id}>
      {children}
    </section>
  );
}

export function CardHead({
  title,
  sub,
  icon,
  action,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-head">
      <div className="card-head-main">
        {icon}
        <div style={{ minWidth: 0 }}>
          <h2 className="card-title">{title}</h2>
          {sub && <p className="card-sub">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function HeadLink({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  const inner = (
    <>
      {children}
      <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
    </>
  );
  if (href)
    return (
      <Link href={href} className="link">
        {inner}
      </Link>
    );
  return (
    <button type="button" className="link" onClick={onClick}>
      {inner}
    </button>
  );
}

// ---------- Checkbox ----------

export function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="check"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    >
      <span className="check-box">{checked && <CheckIcon size={18} strokeWidth={3} />}</span>
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={onChange} />;
}

// ---------- Barra de progresso ----------

export function Bar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

// ---------- Botão principal ----------

export function Cta({
  children,
  onClick,
  href,
  tagline,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tagline?: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <Compass size={30} />
      <span>{children}</span>
      <ChevronRight className="cta-chevron" size={24} strokeWidth={2.2} aria-hidden="true" />
    </>
  );
  return (
    <div style={{ marginTop: 4 }}>
      {href ? (
        <Link href={href} className="cta">
          {inner}
        </Link>
      ) : (
        <button type="button" className="cta" onClick={onClick} disabled={disabled}>
          {inner}
        </button>
      )}
      {tagline && <p className="tagline">{tagline}</p>}
    </div>
  );
}

// ---------- Bottom sheet ----------

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Só reage à abertura/fechamento (não a cada renderização do pai).
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel} tabIndex={-1}>
        <div className="modal-handle" />
        <div className="modal-head">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Toast ----------

interface ToastData {
  id: number;
  text: string;
  undo?: () => void;
}

const ToastCtx = createContext<(text: string, undo?: () => void) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const show = useCallback((text: string, undo?: () => void) => {
    setToast({ id: Date.now(), text, undo });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

// ---------- Campo ----------

/** Rótulo + campo. Use `group` quando o conteúdo tiver vários botões (chips): vira um grupo acessível. */
export function Field({ label, children, group }: { label: string; children: React.ReactNode; group?: boolean }) {
  if (group)
    return (
      <div className="field" role="group" aria-label={label}>
        <span>{label}</span>
        {children}
      </div>
    );
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function tone(i: number) {
  return ((i % 6) + 6) % 6;
}
