// Regras de negócio puras (sem React). Seletores + mutações sobre um rascunho do estado.
import type {
  AgendaItem,
  AppState,
  Book,
  FamilyMoment,
  MomentCategory,
  Period,
  Priority,
  ProposedAction,
  RoutineItem,
} from "@/lib/types";
import {
  addDays,
  diffDays,
  minutesToTime,
  timeToMinutes,
  toDateKey,
  weekStart,
} from "@/lib/dates";
import { uid } from "@/lib/id";
import { guessIcon } from "@/lib/seed";

// ======================= SELETORES =======================

export function routineFor(s: AppState, period: Period, includeInactive = false): RoutineItem[] {
  return s.routine
    .filter((r) => r.period === period && (includeInactive || r.active))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isDone(s: AppState, id: string, date = toDateKey()): boolean {
  return (s.completions[date] ?? []).includes(id);
}

export interface WakeStep {
  index: number;
  time: string;
  startDate: string;
  state: "done" | "current" | "upcoming";
}

/** Plano progressivo: recua 30 min por semana do horário atual até o horário-meta. */
export function wakePlan(s: AppState, today = toDateKey()): WakeStep[] {
  const cur = timeToMinutes(s.profile.wakeTimeCurrent);
  const goal = timeToMinutes(s.profile.wakeTimeGoal);
  if (cur == null || goal == null) return [];
  const diff = cur - goal;
  const count = diff <= 0 ? 1 : Math.min(Math.ceil(diff / 30) + 1, 8);
  const weekIdx = Math.max(0, Math.floor(diffDays(today, s.profile.planStartDate) / 7));
  const steps: WakeStep[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.max(goal, cur - 30 * i);
    steps.push({
      index: i,
      time: minutesToTime(diff <= 0 ? goal : t),
      startDate: addDays(s.profile.planStartDate, i * 7),
      state: i < weekIdx ? "done" : i === Math.min(weekIdx, count - 1) ? "current" : "upcoming",
    });
  }
  // Se o plano já terminou, a última semana fica como "atual" (meta mantida).
  return steps;
}

export function currentWakeTarget(s: AppState, today = toDateKey()): string {
  const plan = wakePlan(s, today);
  return plan.find((p) => p.state === "current")?.time ?? s.profile.wakeTimeGoal;
}

export function prioritiesFor(s: AppState, date = toDateKey()): Priority[] {
  return s.priorities.filter((p) => p.date === date).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function prioritiesDefined(s: AppState, date = toDateKey()): boolean {
  return prioritiesFor(s, date).filter((p) => p.title.trim()).length >= 3;
}

export function bibleStatus(s: AppState, today = toDateKey()) {
  const todayReading = s.bibleReadings.find((r) => r.date === today && r.planId === s.bible.id);
  const done = Math.min(s.bible.currentUnit - 1, s.bible.totalUnits);
  const finished = s.bible.currentUnit > s.bible.totalUnits;
  const unitToday = todayReading ? todayReading.unit : Math.min(s.bible.currentUnit, s.bible.totalUnits);
  return {
    done,
    total: s.bible.totalUnits,
    pct: s.bible.totalUnits ? Math.round((done / s.bible.totalUnits) * 100) : 0,
    todayLabel: `${s.bible.book} ${unitToday}`,
    completedToday: Boolean(todayReading),
    finished,
  };
}

export function currentBook(s: AppState): Book | undefined {
  return s.books.find((b) => b.status === "current");
}

export function queuedBooks(s: AppState): Book[] {
  return s.books.filter((b) => b.status === "queued").sort((a, b) => a.sortOrder - b.sortOrder);
}

export function bookStatus(s: AppState, book: Book | undefined, today = toDateKey()) {
  if (!book) return null;
  const log = s.bookLogs.find((l) => l.bookId === book.id && l.date === today);
  const from = log ? log.fromPage + 1 : book.currentPage + 1;
  let to = log ? log.toPage : book.currentPage + book.pagesPerDay;
  if (book.totalPages) to = Math.min(to, book.totalPages);
  const pct = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : null;
  return {
    from,
    to,
    pct,
    completedToday: Boolean(log),
    finished: book.totalPages != null && book.currentPage >= book.totalPages,
    needsSetup: !book.totalPages,
  };
}

export function momentsOfWeek(s: AppState, today = toDateKey()): FamilyMoment[] {
  const start = weekStart(today);
  const end = addDays(start, 6);
  return s.moments.filter((m) => {
    if (m.status !== "completed" || !m.occurredAt) return false;
    const d = m.occurredAt.slice(0, 10);
    return d >= start && d <= end;
  });
}

export interface FamilyWeekRow {
  key: string;
  label: string;
  memberId: string | null;
  category: MomentCategory;
  count: number;
}

export function familyWeek(s: AppState, today = toDateKey()): FamilyWeekRow[] {
  const week = momentsOfWeek(s, today);
  const rows: FamilyWeekRow[] = [...s.family]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      key: m.id,
      label: `Tempo com ${m.name}`,
      memberId: m.id,
      category: "person" as const,
      count: week.filter((x) => x.category === "person" && x.memberId === m.id).length,
    }));
  rows.push({
    key: "family",
    label: "Momento em família",
    memberId: null,
    category: "family",
    count: week.filter((x) => x.category === "family").length,
  });
  rows.push({
    key: "spiritual",
    label: "Momento espiritual",
    memberId: null,
    category: "spiritual",
    count: week.filter((x) => x.category === "spiritual").length,
  });
  return rows;
}

export function plannedMoments(s: AppState, memberId?: string | null): FamilyMoment[] {
  return s.moments
    .filter((m) => m.status === "planned" && (memberId === undefined || m.memberId === memberId))
    .sort((a, b) => (a.plannedAt ?? "9999").localeCompare(b.plannedAt ?? "9999"));
}

export function nextMomentFor(s: AppState, memberId: string): FamilyMoment | undefined {
  return plannedMoments(s, memberId)[0];
}

export function agendaFor(s: AppState, date = toDateKey()): AgendaItem[] {
  return s.agenda
    .filter((a) => a.date === date && a.status !== "cancelled")
    .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
}

export function memberName(s: AppState, id: string | null): string | null {
  if (!id) return null;
  return s.family.find((f) => f.id === id)?.name ?? null;
}

/** Contexto resumido enviado ao Assistente (não inclui nada além do estado do app). */
export function buildAssistantContext(s: AppState, now = new Date()) {
  const today = toDateKey(now);
  const pending = (p: Period) =>
    routineFor(s, p)
      .filter((r) => r.kind !== "wake" && !isDone(s, r.id, today))
      .map((r) => ({ id: r.id, title: r.title, time: r.time, icon: r.icon }));
  const book = currentBook(s);
  const bs = bookStatus(s, book, today);
  const bib = bibleStatus(s, today);
  return {
    now: now.toISOString(),
    today,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    name: s.profile.displayName,
    wakeGoal: s.profile.wakeTimeGoal,
    wakeTargetThisWeek: currentWakeTarget(s, today),
    routine: {
      morningPending: pending("morning"),
      eveningPending: pending("evening"),
      all: s.routine.filter((r) => r.active).map((r) => ({ id: r.id, title: r.title, time: r.time, period: r.period })),
    },
    priorities: prioritiesFor(s, today).map((p) => ({ id: p.id, title: p.title, status: p.status })),
    reading: {
      bible: {
        planId: s.bible.id,
        plan: s.bible.title,
        today: bib.todayLabel,
        done: bib.done,
        total: bib.total,
        completedToday: bib.completedToday,
      },
      book: book
        ? {
            id: book.id,
            title: book.title,
            pagesToday: bs ? `${bs.from}–${bs.to}` : null,
            pagesPerDay: book.pagesPerDay,
            currentPage: book.currentPage,
            totalPages: book.totalPages,
            completedToday: bs?.completedToday ?? false,
          }
        : null,
    },
    family: {
      members: s.family.map((f) => ({ id: f.id, name: f.name, relationship: f.relationship })),
      planned: plannedMoments(s).slice(0, 5).map((m) => ({
        title: m.title,
        member: memberName(s, m.memberId),
        plannedAt: m.plannedAt,
      })),
      week: familyWeek(s, today).map((r) => ({ label: r.label, count: r.count, goal: s.weeklyFamilyGoal })),
    },
    agenda: agendaFor(s, today).map((a) => ({ id: a.id, title: a.title, time: a.time, status: a.status })),
  };
}

export type AssistantContext = ReturnType<typeof buildAssistantContext>;

// ======================= MUTAÇÕES =======================
// Todas recebem um rascunho já clonado e o alteram diretamente.

export function setRoutineDone(s: AppState, id: string, done: boolean, date = toDateKey()) {
  const list = new Set(s.completions[date] ?? []);
  if (done) list.add(id);
  else list.delete(id);
  s.completions[date] = [...list];
}

export function toggleRoutine(s: AppState, id: string, date = toDateKey()) {
  setRoutineDone(s, id, !isDone(s, id, date), date);
}

export function saveRoutineItem(s: AppState, item: Partial<RoutineItem> & { period: Period; title: string }) {
  if (item.id) {
    const ex = s.routine.find((r) => r.id === item.id);
    if (ex) Object.assign(ex, item);
    return;
  }
  const max = Math.max(0, ...s.routine.filter((r) => r.period === item.period).map((r) => r.sortOrder));
  s.routine.push({
    id: uid(),
    period: item.period,
    title: item.title,
    time: item.time ?? null,
    icon: item.icon ?? guessIcon(item.title),
    sortOrder: max + 10,
    active: true,
    kind: "normal",
  });
}

export function deleteRoutineItem(s: AppState, id: string) {
  s.routine = s.routine.filter((r) => r.id !== id);
}

export function moveRoutineItem(s: AppState, id: string, dir: -1 | 1) {
  const item = s.routine.find((r) => r.id === id);
  if (!item) return;
  const list = routineFor(s, item.period, true);
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((r, k) => (r.sortOrder = (k + 1) * 10));
}

/** Ordena a rotina pelo horário (itens sem horário mantêm a posição relativa). */
export function sortRoutineByTime(s: AppState, period: Period) {
  const list = routineFor(s, period, true);
  let last = -1;
  const keyed = list.map((r, k) => {
    const m = timeToMinutes(r.time);
    if (m != null) last = m;
    return { r, key: m ?? last + 0.5, k };
  });
  keyed.sort((a, b) => a.key - b.key || a.k - b.k);
  keyed.forEach(({ r }, k) => (r.sortOrder = (k + 1) * 10));
}

export function setPriorities(s: AppState, titles: string[], date = toDateKey()) {
  const existing = prioritiesFor(s, date);
  const kept: Priority[] = [];
  titles.forEach((title, i) => {
    const t = title.trim();
    const ex = existing[i];
    if (!t) return;
    if (ex) {
      if (ex.title !== t) ex.status = "pending";
      ex.title = t;
      ex.sortOrder = i;
      kept.push(ex);
    } else {
      kept.push({ id: uid(), title: t, date, sortOrder: i, status: "pending" });
    }
  });
  s.priorities = [...s.priorities.filter((p) => p.date !== date), ...kept];
}

export function createPriority(s: AppState, title: string, date = toDateKey()) {
  const list = prioritiesFor(s, date);
  s.priorities.push({ id: uid(), title: title.trim(), date, sortOrder: list.length, status: "pending" });
}

export function togglePriority(s: AppState, id: string) {
  const p = s.priorities.find((x) => x.id === id);
  if (p) p.status = p.status === "done" ? "pending" : "done";
}

export function carryOverPriorities(s: AppState, today = toDateKey()) {
  const yesterday = addDays(today, -1);
  const pend = prioritiesFor(s, yesterday).filter((p) => p.status === "pending");
  const cur = prioritiesFor(s, today);
  pend.slice(0, Math.max(0, 3 - cur.length)).forEach((p, i) => {
    s.priorities.push({ id: uid(), title: p.title, date: today, sortOrder: cur.length + i, status: "pending" });
  });
}

export function completeBibleToday(s: AppState, today = toDateKey()) {
  if (s.bibleReadings.some((r) => r.date === today && r.planId === s.bible.id)) return;
  if (s.bible.currentUnit > s.bible.totalUnits) return;
  s.bibleReadings.push({
    id: uid(),
    planId: s.bible.id,
    unit: s.bible.currentUnit,
    date: today,
    completedAt: new Date().toISOString(),
  });
  s.bible.currentUnit += 1;
}

export function undoBibleToday(s: AppState, today = toDateKey()) {
  const r = s.bibleReadings.find((x) => x.date === today && x.planId === s.bible.id);
  if (!r) return;
  s.bibleReadings = s.bibleReadings.filter((x) => x.id !== r.id);
  s.bible.currentUnit = r.unit;
}

export function completeBookToday(s: AppState, toPage?: number, today = toDateKey()) {
  const book = currentBook(s);
  if (!book) return;
  if (s.bookLogs.some((l) => l.bookId === book.id && l.date === today)) return;
  let to = toPage ?? book.currentPage + book.pagesPerDay;
  if (book.totalPages) to = Math.min(to, book.totalPages);
  if (to <= book.currentPage) return;
  s.bookLogs.push({ id: uid(), bookId: book.id, date: today, fromPage: book.currentPage, toPage: to });
  book.currentPage = to;
}

export function undoBookToday(s: AppState, today = toDateKey()) {
  const book = currentBook(s);
  if (!book) return;
  const l = s.bookLogs.find((x) => x.bookId === book.id && x.date === today);
  if (!l) return;
  s.bookLogs = s.bookLogs.filter((x) => x.id !== l.id);
  book.currentPage = l.fromPage;
}

export function saveBook(s: AppState, book: Partial<Book> & { title: string }) {
  if (book.id) {
    const ex = s.books.find((b) => b.id === book.id);
    if (ex) Object.assign(ex, book);
    return;
  }
  const max = Math.max(0, ...s.books.map((b) => b.sortOrder));
  s.books.push({
    id: uid(),
    title: book.title,
    author: book.author ?? "",
    totalPages: book.totalPages ?? null,
    currentPage: book.currentPage ?? 0,
    pagesPerDay: book.pagesPerDay ?? 10,
    status: book.status === "current" ? "queued" : (book.status ?? "queued"),
    sortOrder: max + 1,
  });
}

/** Garante um único livro "current" (regra do schema). */
export function setCurrentBook(s: AppState, id: string) {
  s.books.forEach((b) => {
    if (b.id === id) b.status = "current";
    else if (b.status === "current") b.status = b.totalPages && b.currentPage >= b.totalPages ? "completed" : "queued";
  });
}

export function finishCurrentBook(s: AppState) {
  const cur = currentBook(s);
  if (!cur) return;
  cur.status = "completed";
  const next = queuedBooks(s)[0];
  if (next) next.status = "current";
}

export function deleteBook(s: AppState, id: string) {
  s.books = s.books.filter((b) => b.id !== id);
}

export function moveBook(s: AppState, id: string, dir: -1 | 1) {
  const list = queuedBooks(s);
  const i = list.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((b, k) => (b.sortOrder = k + 1));
}

export function addReflection(s: AppState, text: string, sourceType: "bible" | "book" | "free", sourceLabel: string) {
  s.reflections.unshift({ id: uid(), sourceType, sourceLabel, text: text.trim(), createdAt: new Date().toISOString() });
}

export function addMoment(
  s: AppState,
  m: { memberId: string | null; category: MomentCategory; title: string; notes?: string; plannedAt?: string | null; occurred?: boolean },
) {
  const nowIso = localIso(new Date());
  s.moments.push({
    id: uid(),
    memberId: m.category === "person" ? m.memberId : null,
    category: m.category,
    title: m.title.trim(),
    notes: m.notes?.trim() ?? "",
    plannedAt: m.occurred ? null : (m.plannedAt ?? null),
    occurredAt: m.occurred ? nowIso : null,
    status: m.occurred ? "completed" : "planned",
  });
}

export function setMomentStatus(s: AppState, id: string, status: FamilyMoment["status"]) {
  const m = s.moments.find((x) => x.id === id);
  if (!m) return;
  m.status = status;
  m.occurredAt = status === "completed" ? localIso(new Date()) : null;
}

export function deleteMoment(s: AppState, id: string) {
  s.moments = s.moments.filter((m) => m.id !== id);
}

export function addAgenda(s: AppState, a: Omit<AgendaItem, "id" | "status">) {
  s.agenda.push({ ...a, id: uid(), status: "pending" });
}

export function toggleAgenda(s: AppState, id: string) {
  const a = s.agenda.find((x) => x.id === id);
  if (a) a.status = a.status === "done" ? "pending" : "done";
}

export function deleteAgenda(s: AppState, id: string) {
  s.agenda = s.agenda.filter((x) => x.id !== id);
}

export function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ======================= AÇÕES DO ASSISTENTE =======================
// A IA só PROPÕE. A execução acontece aqui, no cliente, depois da confirmação.

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function executeAction(s: AppState, action: ProposedAction): { ok: boolean; message: string } {
  const p = action.payload;
  const today = toDateKey();
  switch (action.type) {
    case "complete_routine_item": {
      const item = s.routine.find((r) => r.id === p.id);
      if (!item) return { ok: false, message: "Item de rotina não encontrado." };
      setRoutineDone(s, item.id, true, str(p.date) || today);
      return { ok: true, message: `“${item.title}” marcado como feito.` };
    }
    case "mark_bible_reading_done": {
      const st = bibleStatus(s, today);
      if (st.completedToday) return { ok: true, message: "A leitura bíblica de hoje já estava concluída." };
      completeBibleToday(s, today);
      return { ok: true, message: `${st.todayLabel} concluído.` };
    }
    case "mark_book_reading_done": {
      const page = typeof p.page === "number" ? p.page : undefined;
      completeBookToday(s, page, today);
      return { ok: true, message: "Leitura do livro registrada." };
    }
    case "propose_family_moment": {
      const title = str(p.title);
      if (!title) return { ok: false, message: "Momento sem título." };
      const memberId = str(p.member_id) || null;
      const valid = memberId && s.family.some((f) => f.id === memberId);
      const cat = (str(p.category) as MomentCategory) || (valid ? "person" : "family");
      addMoment(s, {
        memberId: valid ? memberId : null,
        category: valid ? "person" : cat === "spiritual" ? "spiritual" : "family",
        title,
        plannedAt: str(p.datetime) || null,
      });
      return { ok: true, message: "Momento planejado." };
    }
    case "create_priority": {
      const title = str(p.title);
      if (!title) return { ok: false, message: "Prioridade sem título." };
      createPriority(s, title, str(p.date) || today);
      return { ok: true, message: "Prioridade criada." };
    }
    case "update_priority": {
      const pr = s.priorities.find((x) => x.id === p.id);
      if (!pr) return { ok: false, message: "Prioridade não encontrada." };
      const status = str(p.status);
      if (status === "remove") {
        s.priorities = s.priorities.filter((x) => x.id !== pr.id);
        return { ok: true, message: "Prioridade removida." };
      }
      if (status === "tomorrow") {
        pr.date = addDays(pr.date, 1);
        pr.status = "pending";
        pr.sortOrder = prioritiesFor(s, pr.date).length;
        return { ok: true, message: "Prioridade remarcada para amanhã." };
      }
      if (status === "done" || status === "pending" || status === "skipped") pr.status = status;
      return { ok: true, message: "Prioridade atualizada." };
    }
    case "create_agenda_item": {
      const title = str(p.title);
      if (!title) return { ok: false, message: "Compromisso sem título." };
      const cat = str(p.category) as AgendaItem["category"];
      addAgenda(s, {
        title,
        date: str(p.date) || today,
        time: str(p.time) || null,
        category: ["priority", "task", "church", "work", "other"].includes(cat) ? cat : "task",
      });
      return { ok: true, message: "Compromisso adicionado ao seu dia." };
    }
    case "update_routine_times": {
      const changes = Array.isArray(p.changes) ? (p.changes as { id?: string; title?: string; time?: string }[]) : [];
      let n = 0;
      for (const c of changes) {
        const item =
          s.routine.find((r) => r.id === c.id) ??
          s.routine.find((r) => c.title && r.title.toLowerCase() === c.title.toLowerCase());
        if (item && c.time && timeToMinutes(c.time) != null) {
          item.time = c.time;
          item.active = true;
          n++;
        }
      }
      if (!n) return { ok: false, message: "Nenhum horário foi alterado." };
      sortRoutineByTime(s, "morning");
      sortRoutineByTime(s, "evening");
      return { ok: true, message: "Rotina atualizada." };
    }
    default:
      return { ok: false, message: "Ação não autorizada." };
  }
}
