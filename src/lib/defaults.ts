import type { CalendarState, FaithState, GrowthState, LearnState, MeProfile, PantryState } from "./types";

export function defaultPantry(): PantryState {
  return { items: [], shopping: [], prices: [] };
}

export function defaultFaith(): FaithState {
  return { daily: [], favorites: [], gratitude: [], prayers: [] };
}

export function defaultMe(): MeProfile {
  return { about: "", values: [], dreams: "", challenges: [], motivations: "", faith: "", tone: "acolhedor", aiConsent: false, notes: [] };
}

export function defaultGrowth(): GrowthState {
  return { goals: [], habits: [], moods: [], reviews: [] };
}

export function defaultCalendar(): CalendarState {
  return { icsUrl: null };
}

export function defaultLearn(): LearnState {
  return { read: [], books: {} };
}
