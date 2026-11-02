// Modelo de dados local. Espelha docs/DATABASE_SCHEMA.md (camelCase) para facilitar
// a futura sincronização com o Supabase.

export type IconKey =
  | "pray"
  | "dumbbell"
  | "shower"
  | "coffee"
  | "bible"
  | "book"
  | "list"
  | "alarm"
  | "phone"
  | "shirt"
  | "droplet"
  | "moon"
  | "sun"
  | "church"
  | "target"
  | "heart"
  | "users"
  | "check"
  | "briefcase"
  | "walk";

export type Period = "morning" | "evening";

export interface Profile {
  displayName: string;
  sleepTime: string; // "23:00" — horário em que costuma dormir hoje
  wakeTimeCurrent: string; // "06:30" — horário em que costuma acordar hoje
  wakeTimeGoal: string; // "05:00"
  planStartDate: string; // YYYY-MM-DD — início do plano progressivo
  focusAreas: FocusArea[];
  locale: string;
  headerPhrase: string; // frase curta do topo (editável)
  showVerses: boolean;
}

export type FocusArea = "rotina" | "leitura" | "espiritual" | "familia" | "organizacao";

export interface RoutineItem {
  id: string;
  period: Period;
  title: string;
  time: string | null; // "05:30" ou null
  icon: IconKey;
  sortOrder: number;
  active: boolean;
  /** "wake" = item de acordar (não aparece como checklist em Hoje). */
  kind?: "wake" | "normal";
}

export type PriorityStatus = "pending" | "done" | "skipped";

export interface Priority {
  id: string;
  title: string;
  date: string;
  sortOrder: number;
  status: PriorityStatus;
}

export interface BiblePlan {
  id: string;
  title: string;
  book: string;
  totalUnits: number;
  currentUnit: number; // próximo capítulo a ler
}

export interface BibleReading {
  id: string;
  planId: string;
  unit: number;
  date: string;
  completedAt: string;
}

export type BookStatus = "current" | "queued" | "completed";

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number | null;
  currentPage: number; // páginas já lidas
  pagesPerDay: number;
  status: BookStatus;
  sortOrder: number;
}

export interface BookLog {
  id: string;
  bookId: string;
  date: string;
  fromPage: number;
  toPage: number;
}

export interface Reflection {
  id: string;
  sourceType: "bible" | "book" | "free";
  sourceLabel: string;
  text: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  sortOrder: number;
}

export type MomentCategory = "person" | "family" | "spiritual";
export type MomentStatus = "planned" | "completed" | "cancelled";

export interface FamilyMoment {
  id: string;
  memberId: string | null;
  category: MomentCategory;
  title: string;
  notes: string;
  plannedAt: string | null; // ISO local "YYYY-MM-DDTHH:mm"
  occurredAt: string | null;
  status: MomentStatus;
}

export type AgendaStatus = "pending" | "done" | "cancelled";

export interface AgendaItem {
  id: string;
  title: string;
  date: string;
  time: string | null;
  category: "priority" | "task" | "church" | "work" | "other";
  status: AgendaStatus;
}

// ---------- Assistente ----------

export interface Suggestion {
  icon: IconKey | "food";
  label: string;
  detail?: string;
  minutes?: number;
  href?: string;
}

export type ActionType =
  | "complete_routine_item"
  | "mark_bible_reading_done"
  | "mark_book_reading_done"
  | "propose_family_moment"
  | "create_priority"
  | "update_priority"
  | "create_agenda_item"
  | "update_routine_times";

export interface ProposedAction {
  id: string;
  type: ActionType;
  summary: string; // texto curto mostrado para confirmação
  payload: Record<string, unknown>;
  status: "proposed" | "executed" | "rejected" | "failed";
  createdAt: string;
  executedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  suggestions?: Suggestion[];
  actions?: ProposedAction[];
  offline?: boolean;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  routine: RoutineItem[];
  completions: Record<string, string[]>; // date -> routine ids
  priorities: Priority[];
  bible: BiblePlan;
  bibleReadings: BibleReading[];
  books: Book[];
  bookLogs: BookLog[];
  reflections: Reflection[];
  family: FamilyMember[];
  moments: FamilyMoment[];
  weeklyFamilyGoal: number;
  agenda: AgendaItem[];
  messages: ChatMessage[];
}
