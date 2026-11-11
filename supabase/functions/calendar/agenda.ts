// NORTE — leitura do Google Agenda pelo "endereço secreto no formato iCal".
// Expande eventos repetidos (RRULE, EXDATE, exceções) e devolve os compromissos de um período,
// já no horário local. O ICAL (ical.js) é passado de fora para o mesmo código rodar no Deno e nos testes.

export interface AgendaItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (local)
  time: string | null; // "HH:MM" (null = dia inteiro)
  end: string | null; // "HH:MM"
  location: string | null;
}

/** Só aceita o endereço iCal do Google Agenda (evita usar o servidor para buscar qualquer site). */
export function validIcsUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim().replace(/^webcal:/i, "https:"));
    if (u.protocol !== "https:") return null;
    if (u.hostname !== "calendar.google.com" && u.hostname !== "www.google.com") return null;
    if (!/\/calendar\/ical\/.+\.ics$/.test(u.pathname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function parts(ms: number, tz: string) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

/** Meia-noite local (em ms UTC) de uma data num fuso. */
function localMidnight(date: string, tz: string): number {
  const guess = Date.parse(`${date}T00:00:00Z`);
  const p = parts(guess, tz);
  const shown = Date.parse(`${p.date}T${p.time}:00Z`);
  return guess - (shown - guess);
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// deno-lint-ignore no-explicit-any
type ICALType = any;

export function expandAgenda(ICAL: ICALType, ics: string, from: string, days: number, tz = "America/Sao_Paulo"): AgendaItem[] {
  const comp = new ICAL.Component(ICAL.parse(ics));
  for (const vtz of comp.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(new ICAL.Timezone(vtz));
    } catch {
      /* fuso já registrado */
    }
  }
  const startMs = localMidnight(from, tz);
  const endDate = addDays(from, days);
  const endMs = localMidnight(endDate, tz);

  // Junta exceções (RECURRENCE-ID) ao evento principal.
  const masters = new Map<string, ICALType>();
  const exceptions: ICALType[] = [];
  for (const ve of comp.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(ve);
    if ((ve.getFirstPropertyValue("status") ?? "").toString().toUpperCase() === "CANCELLED" && !ev.isRecurrenceException()) continue;
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) masters.get(ex.uid)?.relateException(ex);

  const out: AgendaItem[] = [];
  const push = (uid: string, title: string, location: string | null, s: ICALType, e: ICALType | null, cancelled = false) => {
    if (cancelled) return;
    const allDay = Boolean(s.isDate);
    if (allDay) {
      // Dia inteiro: um item por dia (fim exclusivo).
      const first = s.toString().slice(0, 10);
      const last = e ? addDays(e.toString().slice(0, 10), -1) : first;
      for (let d = first, k = 0; d <= last && k < 62; d = addDays(d, 1), k++) {
        if (d >= from && d < endDate) out.push({ id: `${uid}:${d}`, title, date: d, time: null, end: null, location });
      }
      return;
    }
    const sMs = s.toJSDate().getTime();
    const eMs = e ? e.toJSDate().getTime() : sMs;
    if (eMs < startMs || sMs >= endMs) return;
    const a = parts(sMs, tz);
    const b = e ? parts(eMs, tz) : null;
    out.push({ id: `${uid}:${sMs}`, title, date: a.date < from ? from : a.date, time: a.date < from ? null : a.time, end: b && b.date === a.date ? b.time : null, location });
  };

  for (const ev of masters.values()) {
    const title = (ev.summary || "Compromisso").toString().trim();
    const location = ev.location ? ev.location.toString().trim() || null : null;
    if (!ev.isRecurring()) {
      push(ev.uid, title, location, ev.startDate, ev.endDate);
      continue;
    }
    const it = ev.iterator();
    for (let n = 0, t = it.next(); t && n < 3000; t = it.next(), n++) {
      const tMs = t.isDate ? Date.parse(`${t.toString().slice(0, 10)}T12:00:00Z`) : t.toJSDate().getTime();
      if (tMs >= endMs) break;
      const d = ev.getOccurrenceDetails(t);
      const cancelled = (d.item.component.getFirstPropertyValue("status") ?? "").toString().toUpperCase() === "CANCELLED";
      const itTitle = (d.item.summary || title).toString().trim();
      push(ev.uid, itTitle, location, d.startDate, d.endDate, cancelled);
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date) || (x.time ?? "").localeCompare(y.time ?? "") || x.title.localeCompare(y.title));
}
