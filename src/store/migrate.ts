import type { AppState } from "@/lib/types";
import { defaultFinance } from "@/lib/finance/defaults";

/** Converte qualquer versão salva para a atual, preenchendo o que faltar. */
export function migrate(raw: unknown): AppState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<AppState> & { version?: number };
  if (!s.onboarded || !s.profile) return null;
  const out = { ...s } as AppState;
  if (!out.finance) out.finance = defaultFinance();
  out.finance = { ...defaultFinance(), ...out.finance };
  out.version = 2;
  out.updatedAt = typeof s.updatedAt === "number" ? s.updatedAt : 0;
  return out;
}
