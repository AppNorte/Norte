import type { ActionType, IconKey } from "@/lib/types";
import type { AssistantContext } from "@/store/logic";

export const ACTION_TYPES: ActionType[] = [
  "complete_routine_item",
  "mark_bible_reading_done",
  "mark_book_reading_done",
  "propose_family_moment",
  "create_priority",
  "update_priority",
  "create_agenda_item",
  "update_routine_times",
  "create_transaction",
  "add_shopping_item",
  "remember_about_me",
];

export type SuggestionKind = "bible" | "book" | "prayer" | "priorities" | "family" | "routine" | "food" | "finance" | "home" | "faith" | "habit" | "other";

export interface ReplySuggestion {
  kind: SuggestionKind;
  label: string;
  detail?: string;
  minutes?: number;
}

export interface ReplyAction {
  type: ActionType;
  summary: string;
  payload: Record<string, unknown>;
}

export interface AssistantReply {
  text: string;
  suggestions?: ReplySuggestion[];
  actions?: ReplyAction[];
  provider: "mock" | "anthropic" | "openai";
  degraded?: boolean; // true quando a IA real falhou e o modo local respondeu
}

export interface AssistantRequest {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  context: AssistantContext;
}

export const KIND_META: Record<SuggestionKind, { icon: IconKey | "food"; href?: string }> = {
  bible: { icon: "bible", href: "/leitura" },
  book: { icon: "book", href: "/leitura" },
  prayer: { icon: "pray", href: "/rotina" },
  priorities: { icon: "list", href: "/hoje" },
  family: { icon: "users", href: "/familia" },
  routine: { icon: "check", href: "/rotina" },
  food: { icon: "food" },
  finance: { icon: "target", href: "/financas" },
  home: { icon: "list", href: "/casa" },
  faith: { icon: "heart", href: "/fe" },
  habit: { icon: "check", href: "/metas" },
  other: { icon: "check" },
};

/** Valida/limpa a resposta de qualquer provedor antes de mandar ao cliente. */
export function sanitizeReply(r: Partial<AssistantReply>, provider: AssistantReply["provider"]): AssistantReply {
  const kinds = Object.keys(KIND_META);
  const suggestions = (Array.isArray(r.suggestions) ? r.suggestions : [])
    .filter((s) => s && typeof s.label === "string" && s.label.trim())
    .slice(0, 6)
    .map((s) => ({
      kind: (kinds.includes(s.kind) ? s.kind : "other") as SuggestionKind,
      label: s.label.slice(0, 120),
      detail: typeof s.detail === "string" ? s.detail.slice(0, 120) : undefined,
      minutes: typeof s.minutes === "number" && s.minutes > 0 && s.minutes < 600 ? Math.round(s.minutes) : undefined,
    }));
  const actions = (Array.isArray(r.actions) ? r.actions : [])
    .filter((a) => a && ACTION_TYPES.includes(a.type) && typeof a.summary === "string")
    .slice(0, 3)
    .map((a) => ({
      type: a.type,
      summary: a.summary.slice(0, 400),
      payload: a.payload && typeof a.payload === "object" ? a.payload : {},
    }));
  const text = typeof r.text === "string" && r.text.trim() ? r.text.trim().slice(0, 2000) : suggestions.length || actions.length ? "Veja o que encontrei:" : "Não consegui entender. Pode reformular?";
  return { text, suggestions, actions, provider, degraded: r.degraded };
}
