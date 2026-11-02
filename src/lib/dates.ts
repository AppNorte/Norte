// Utilitários de data/hora no fuso local do aparelho.

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function diffDays(a: string, b: string): number {
  const ms = fromDateKey(a).getTime() - fromDateKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** Segunda-feira da semana da data informada. */
export function weekStart(key: string): string {
  const d = fromDateKey(key);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return toDateKey(d);
}

export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "05:00" -> "5h", "05:30" -> "5h30" */
export function shortHour(t: string): string {
  const min = timeToMinutes(t);
  if (min == null) return t;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

/** "06:30" -> "6h30", "06:00" -> "6h00" */
export function hourLabel(t: string): string {
  const min = timeToMinutes(t);
  if (min == null) return t;
  return `${Math.floor(min / 60)}h${pad(min % 60)}`;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function nowTime(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const WEEKDAYS_SHORT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "Sexta-feira, 11 de setembro" */
export function longDate(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function shortDayLabel(key: string, today = toDateKey()): string {
  const diff = diffDays(key, today);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return WEEKDAYS_SHORT[fromDateKey(key).getDay()];
}

export function dayMonth(key: string): string {
  const d = fromDateKey(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export type DayPart = "morning" | "afternoon" | "night";

export function dayPart(d: Date = new Date()): DayPart {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "night";
}

export function partOfTime(t: string | null): DayPart {
  const m = timeToMinutes(t);
  if (m == null) return "morning";
  if (m < 12 * 60) return "morning";
  if (m < 18 * 60) return "afternoon";
  return "night";
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
