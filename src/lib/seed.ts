import seed from "../../seed.example.json";
import type { AppState, FocusArea, IconKey, RoutineItem } from "./types";
import { toDateKey } from "./dates";
import { uid } from "./id";
import { defaultFinance } from "./finance/defaults";
import { defaultCalendar, defaultFaith, defaultGrowth, defaultLearn, defaultMe, defaultPantry } from "./defaults";

/** Sugere um ícone a partir do título (o usuário pode trocar depois). */
export function guessIcon(title: string): IconKey {
  const t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/acordar|despertar/.test(t)) return "alarm";
  if (/oracao|orar|devocional/.test(t)) return "pray";
  if (/academia|treino|exercicio|corrida|musculacao/.test(t)) return "dumbbell";
  if (/banho/.test(t)) return "shower";
  if (/cafe|almoco|jantar|refeicao/.test(t)) return "coffee";
  if (/biblia|evangelho|capitulo/.test(t)) return "bible";
  if (/livro|leitura|ler/.test(t)) return "book";
  if (/prioridade/.test(t)) return "list";
  if (/celular|telefone|distrac/.test(t)) return "phone";
  if (/roupa/.test(t)) return "shirt";
  if (/agua/.test(t)) return "droplet";
  if (/dormir|sono|deitar/.test(t)) return "moon";
  if (/igreja|culto|missa/.test(t)) return "church";
  if (/familia|esposa|filh/.test(t)) return "users";
  if (/caminhada|caminhar/.test(t)) return "walk";
  if (/trabalho|reuniao|projeto/.test(t)) return "briefcase";
  return "check";
}

export interface OnboardingInput {
  displayName: string;
  sleepTime: string;
  wakeTimeCurrent: string;
  wakeTimeGoal: string;
  focusAreas: FocusArea[];
  include: {
    oracao: boolean;
    academia: boolean;
    biblia: boolean;
    livro: boolean;
    momentoFamilia: boolean;
  };
}

export function onboardingDefaults(): OnboardingInput {
  return {
    displayName: seed.profile.displayName,
    sleepTime: "23:00",
    wakeTimeCurrent: "06:30",
    wakeTimeGoal: seed.profile.wakeGoal,
    focusAreas: ["rotina", "leitura", "espiritual", "familia"],
    include: { oracao: true, academia: true, biblia: true, livro: true, momentoFamilia: true },
  };
}

function isTitle(title: string, re: RegExp) {
  return re.test(title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
}

/** Monta o estado inicial a partir do seed.example.json + respostas do onboarding. */
export function buildInitialState(input: OnboardingInput = onboardingDefaults()): AppState {
  const today = toDateKey();
  const routine: RoutineItem[] = [];

  seed.routine.morning.forEach((it, i) => {
    const wake = isTitle(it.title, /acordar/);
    let active = true;
    if (isTitle(it.title, /academia/)) active = input.include.academia;
    if (isTitle(it.title, /biblia/)) active = input.include.biblia;
    if (isTitle(it.title, /livro/)) active = input.include.livro;
    routine.push({
      id: uid(),
      period: "morning",
      title: it.title,
      time: wake ? input.wakeTimeGoal || it.time : it.time,
      icon: guessIcon(it.title),
      sortOrder: (i + 1) * 10,
      active,
      kind: wake ? "wake" : "normal",
    });
  });

  // Oração não tem horário no seed: entra logo depois de acordar.
  routine.push({
    id: uid(),
    period: "morning",
    title: "Oração",
    time: null,
    icon: "pray",
    sortOrder: 15,
    active: input.include.oracao,
    kind: "normal",
  });

  seed.routine.evening.forEach((it, i) => {
    routine.push({
      id: uid(),
      period: "evening",
      title: it.title,
      time: it.time,
      icon: guessIcon(it.title),
      sortOrder: (i + 1) * 10,
      active: true,
      kind: "normal",
    });
  });

  routine.push({
    id: uid(),
    period: "evening",
    title: "Momento em família",
    time: null,
    icon: "users",
    sortOrder: 35, // antes de dormir
    active: input.include.momentoFamilia,
    kind: "normal",
  });

  const bibleId = uid();
  return {
    version: 2,
    updatedAt: Date.now(),
    onboarded: true,
    profile: {
      displayName: input.displayName.trim() || seed.profile.displayName,
      sleepTime: input.sleepTime,
      wakeTimeCurrent: input.wakeTimeCurrent,
      wakeTimeGoal: input.wakeTimeGoal,
      planStartDate: today,
      focusAreas: input.focusAreas,
      locale: seed.profile.locale,
      headerPhrase: "Direção para uma vida com propósito.",
      showVerses: true,
    },
    routine,
    completions: {},
    priorities: seed.priorities.map((title, i) => ({
      id: uid(),
      title,
      date: today,
      sortOrder: i,
      status: "pending" as const,
    })),
    bible: {
      id: bibleId,
      title: seed.reading.bible.planTitle,
      book: seed.reading.bible.book,
      totalUnits: seed.reading.bible.totalChapters,
      currentUnit: seed.reading.bible.currentChapter,
    },
    bibleReadings: [],
    books: [
      {
        id: uid(),
        title: seed.reading.book.title,
        author: seed.reading.book.author,
        totalPages: null,
        currentPage: seed.reading.book.currentPage,
        pagesPerDay: seed.reading.book.pagesPerDay,
        status: "current",
        sortOrder: 0,
      },
    ],
    bookLogs: [],
    reflections: [],
    family: seed.family.map((f) => ({
      id: uid(),
      name: f.name,
      relationship: f.relationship,
      sortOrder: f.sortOrder,
    })),
    moments: [],
    weeklyFamilyGoal: 3,
    agenda: [],
    messages: [],
    finance: defaultFinance(),
    pantry: defaultPantry(),
    faith: defaultFaith(),
    me: defaultMe(),
    growth: defaultGrowth(),
    calendar: defaultCalendar(),
    learn: defaultLearn(),
  };
}
