// Assistente em modo local (sem IA). Regras simples, respostas curtas e sem culpa.
// Roda no servidor (AI_PROVIDER=mock) e também no navegador como plano B se a rede/IA falhar.
import type { AssistantContext } from "@/store/logic";
import type { AssistantReply, ReplyAction, ReplySuggestion } from "./types";
import { addDays } from "@/lib/dates";

function norm(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTime(t: string): string | null {
  const m = /\b(\d{1,2})\s*(?:h|:|horas?)\s*(\d{2})?\b/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const WEEKDAYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function parseDay(t: string, today: string): string | null {
  if (/\bdepois de amanha\b/.test(t)) return addDays(today, 2);
  if (/\bamanha\b/.test(t)) return addDays(today, 1);
  if (/\bhoje\b/.test(t)) return today;
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}`).test(t)) {
      let diff = (i - dow + 7) % 7;
      if (diff === 0) diff = 7;
      return addDays(today, diff);
    }
  }
  return null;
}

function minutesAvailable(t: string): number | null {
  const m = /(\d{1,3})\s*(?:min|minutos)\b/.exec(t);
  if (m) return Number(m[1]);
  const h = /(\d)\s*(?:h|hora)s?\b(?!\s*\d)/.exec(t);
  if (h && /tenho|livre|sobr/.test(t)) return Number(h[1]) * 60;
  if (/meia hora/.test(t)) return 30;
  return null;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- "O que posso fazer agora?" ----------
function nowSuggestions(ctx: AssistantContext, available: number | null): ReplySuggestion[] {
  const out: ReplySuggestion[] = [];
  if (!ctx.reading.bible.completedToday && ctx.reading.bible.done < ctx.reading.bible.total)
    out.push({ kind: "bible", label: `Ler ${ctx.reading.bible.today}`, minutes: 8 });
  const b = ctx.reading.book;
  if (b && !b.completedToday && !(b.totalPages && b.currentPage >= b.totalPages)) {
    const pages = available && available < b.pagesPerDay * 1.5 ? Math.max(3, Math.floor(available / 1.8)) : b.pagesPerDay;
    out.push({ kind: "book", label: `Ler ${pages} páginas do livro atual`, minutes: Math.round(pages * 1.8) });
  }
  const pray = [...ctx.routine.morningPending, ...ctx.routine.eveningPending].find((r) => /ora/i.test(r.title) && r.icon === "pray");
  if (pray) out.push({ kind: "prayer", label: "Fazer sua oração", minutes: 10 });
  const hour = Number(ctx.time.slice(0, 2));
  const pendingPrios = ctx.priorities.filter((p) => p.status === "pending");
  if (ctx.priorities.length < 3) out.push({ kind: "priorities", label: hour >= 18 ? "Organizar 3 prioridades de amanhã" : "Definir as 3 prioridades de hoje", minutes: 5 });
  else if (pendingPrios.length) out.push({ kind: "priorities", label: `Avançar em: ${pendingPrios[0].title}`, minutes: 25 });
  if (ctx.family.members.length) out.push({ kind: "family", label: "Mandar uma mensagem para alguém da família", minutes: 2 });
  if (hour >= 20 && ctx.routine.eveningPending.length)
    out.unshift({ kind: "routine", label: `Começar a rotina da noite: ${ctx.routine.eveningPending[0].title}`, minutes: 5 });

  const filtered = available ? out.filter((s) => (s.minutes ?? 0) <= available) : out;
  return (filtered.length ? filtered : out).slice(0, 5);
}

// ---------- Alimentação simples ----------
const FOODS: Record<string, string> = {
  ovo: "ovos",
  ovos: "ovos",
  pao: "pão",
  paes: "pão",
  queijo: "queijo",
  banana: "banana",
  cafe: "café",
  leite: "leite",
  aveia: "aveia",
  arroz: "arroz",
  feijao: "feijão",
  frango: "frango",
  tomate: "tomate",
  presunto: "presunto",
  manteiga: "manteiga",
  iogurte: "iogurte",
  mel: "mel",
  maca: "maçã",
  tapioca: "tapioca",
  batata: "batata",
  carne: "carne",
  alface: "alface",
  cenoura: "cenoura",
  macarrao: "macarrão",
  atum: "atum",
  cuscuz: "cuscuz",
  mamao: "mamão",
};

function ingredients(t: string): string[] {
  const found = new Set<string>();
  for (const w of t.split(/[^a-z]+/)) if (FOODS[w]) found.add(FOODS[w]);
  return [...found];
}

function mealIdeas(list: string[]): ReplySuggestion[] {
  const has = (x: string) => list.includes(x);
  const ideas: ReplySuggestion[] = [];
  if (has("ovos") && has("queijo")) ideas.push({ kind: "food", label: `Ovos mexidos com queijo${has("pão") ? " + pão" : ""}`, detail: "Clássico e completo.", minutes: 5 });
  else if (has("ovos") && has("tomate")) ideas.push({ kind: "food", label: "Omelete de tomate", detail: "Leve e rápido.", minutes: 8 });
  else if (has("ovos")) ideas.push({ kind: "food", label: `Ovos mexidos${has("pão") ? " com pão" : ""}`, detail: "Simples e sustenta.", minutes: 5 });
  if (has("pão") && (has("queijo") || has("presunto"))) ideas.push({ kind: "food", label: `Pão com ${has("queijo") ? "queijo" : "presunto"}${has("banana") ? " + banana" : ""}`, detail: "Prático e energético.", minutes: 3 });
  if (has("banana") && (has("leite") || has("café") || has("aveia") || has("iogurte")))
    ideas.push({
      kind: "food",
      label: has("aveia") ? "Banana com aveia" + (has("mel") ? " e mel" : "") : has("iogurte") ? "Iogurte com banana" : `Vitamina de banana${has("café") ? " + café" : ""}`,
      detail: "Rápido e delicioso.",
      minutes: 5,
    });
  if (has("aveia") && has("leite") && !ideas.some((i) => i.label.includes("aveia"))) ideas.push({ kind: "food", label: "Mingau de aveia", detail: "Quentinho e nutritivo.", minutes: 7 });
  if (has("tapioca")) ideas.push({ kind: "food", label: `Tapioca${has("queijo") ? " com queijo" : has("ovos") ? " com ovo" : ""}`, detail: "Fácil de variar.", minutes: 6 });
  if (has("cuscuz")) ideas.push({ kind: "food", label: `Cuscuz${has("ovos") ? " com ovo" : ""}`, detail: "Bem brasileiro.", minutes: 10 });
  if (has("arroz") && has("feijão")) ideas.push({ kind: "food", label: `Arroz, feijão${has("ovos") ? " e ovo" : has("frango") ? " e frango" : ""}`, detail: "O básico que funciona.", minutes: 20 });
  if (has("frango") && !ideas.some((i) => i.label.includes("frango"))) ideas.push({ kind: "food", label: `Frango grelhado${has("alface") || has("tomate") ? " com salada" : ""}`, detail: "Proteína simples.", minutes: 20 });
  if (has("macarrão")) ideas.push({ kind: "food", label: `Macarrão${has("atum") ? " com atum" : has("tomate") ? " ao sugo" : ""}`, detail: "Rende e é rápido.", minutes: 15 });
  if (has("batata")) ideas.push({ kind: "food", label: "Batata cozida ou assada", detail: "Acompanhamento fácil.", minutes: 25 });
  if ((has("maçã") || has("mamão")) && ideas.length < 3) ideas.push({ kind: "food", label: `${cap(has("maçã") ? "maçã" : "mamão")} picado(a)`, detail: "Fruta para completar.", minutes: 2 });
  if (!ideas.length && list.length >= 2) ideas.push({ kind: "food", label: `${cap(list[0])} com ${list[1]}`, detail: "Combinação simples.", minutes: 10 });
  return ideas.slice(0, 3);
}

// ---------- Utilitários de busca ----------
function words(t: string) {
  return t.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
}

function bestMatch<T extends { title: string }>(text: string, list: T[]): T | undefined {
  const ws = words(text);
  let best: T | undefined;
  let score = 0;
  for (const it of list) {
    const tw = words(norm(it.title));
    const sc = tw.filter((w) => ws.some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))).length;
    if (sc > score) {
      score = sc;
      best = it;
    }
  }
  return best;
}

// ======================= RESPOSTA =======================
export function mockReply(message: string, ctx: AssistantContext): AssistantReply {
  const t = norm(message);
  const reply = (text: string, suggestions?: ReplySuggestion[], actions?: ReplyAction[]): AssistantReply => ({
    text,
    suggestions,
    actions,
    provider: "mock",
  });

  if (!t) return reply("Estou aqui. Como posso ajudar?");

  // 1. Reorganização: "não consegui fazer X"
  if (/\bnao (consegui|deu|fiz|vou conseguir)|\bfalhei\b|\besqueci\b/.test(t)) {
    const prio = bestMatch(t, ctx.priorities.filter((p) => p.status !== "done"));
    if (prio) {
      return reply(`Tudo bem, acontece. Sobre “${prio.title}”, o que prefere?`, undefined, [
        { type: "update_priority", summary: `Remarcar “${prio.title}” para amanhã`, payload: { id: prio.id, status: "tomorrow" } },
        { type: "update_priority", summary: `Remover “${prio.title}” das prioridades`, payload: { id: prio.id, status: "remove" } },
      ]);
    }
    const ag = bestMatch(t, ctx.agenda.filter((a) => a.status === "pending"));
    if (ag) {
      return reply(`Sem problema. Quer passar “${ag.title}” para amanhã? Se preferir manter pendente, não precisa fazer nada.`, undefined, [
        {
          type: "create_agenda_item",
          summary: `Criar “${ag.title}” amanhã${ag.time ? ` às ${ag.time}` : ""}`,
          payload: { title: ag.title, date: addDays(ctx.today, 1), time: ag.time ?? "" },
        },
      ]);
    }
    const rt = bestMatch(t, ctx.routine.all);
    if (rt) return reply(`Tudo bem. “${rt.title}” continua na sua rotina: amanhã é uma nova chance. Falhou um dia? Retome no próximo.`);
    return reply("Tudo bem, acontece. Me diga qual item ficou para trás (ex.: “não consegui fazer a prioridade 2”) e eu ajudo a remarcar, manter ou remover.");
  }

  // 2. Ajuste de horário de acordar/academia
  if (/acordar|despertar/.test(t) && parseTime(t)) {
    const wakeTime = parseTime(t)!;
    const changes: { title: string; time: string }[] = [];
    const wake = ctx.routine.all.find((r) => /acordar/i.test(r.title));
    if (wake) changes.push({ title: wake.title, time: wakeTime });
    if (/academia|treino/.test(t)) {
      const after = /academia[^\d]*(\d{1,2}\s*(?:h|:)\s*\d{0,2})/.exec(t);
      const gymTime = after ? parseTime(after[1]) : null;
      const [h, m] = wakeTime.split(":").map(Number);
      const plus30 = `${String(h + Math.floor((m + 30) / 60)).padStart(2, "0")}:${String((m + 30) % 60).padStart(2, "0")}`;
      const gym = ctx.routine.all.find((r) => /academia|treino/i.test(r.title));
      if (gym) changes.push({ title: gym.title, time: gymTime ?? plus30 });
    }
    if (changes.length) {
      return reply(
        `Posso ajustar sua rotina para:\n${changes.map((c) => `• ${c.time} ${c.title.toLowerCase()}`).join("\n")}\nQuer salvar?`,
        undefined,
        [{ type: "update_routine_times", summary: changes.map((c) => `${c.time} ${c.title}`).join(" · "), payload: { changes } }],
      );
    }
  }

  // 3. Alimentação simples
  const ings = ingredients(t);
  if (ings.length >= 2 || (ings.length >= 1 && /tenho|cafe da manha|almoco|jantar|lanche|comer|receita|refeicao/.test(t) && !/tenho \d/.test(t))) {
    const ideas = mealIdeas(ings);
    const meal = /almoco/.test(t) ? "almoço" : /jantar|janta/.test(t) ? "jantar" : /lanche/.test(t) ? "lanche" : Number(ctx.time.slice(0, 2)) < 11 ? "café da manhã" : "refeição";
    const disclaimer = /dieta|emagrec|diabet|pressao|alergi|caloria/.test(t) ? "\nPara dieta ou questões de saúde, vale falar com um nutricionista." : "";
    if (ideas.length) return reply(`Ótimo! Aqui vão ${ideas.length} ideia${ideas.length > 1 ? "s" : ""} de ${meal} simples:${disclaimer}`, ideas);
    return reply("Me diga 2 ou 3 ingredientes que você tem e eu sugiro opções simples.");
  }

  // 4. Prioridade nova
  const prioMatch = /(?:prioridade|priorizar)\s*(?:de amanha|para amanha|de hoje)?\s*(?::|e|eh|sera)?\s*(.{3,})$/.exec(t);
  if (prioMatch && /(adicion|cri|coloc|defin|nova|minha|priorizar|:)/.test(t) && !/^quais|^qual|^como/.test(t)) {
    const original = message.split(/prioridade[s]?\s*(?:de amanhã|para amanhã|de hoje)?\s*(?::|é|e|será)?/i).pop()?.trim() || prioMatch[1];
    const date = /amanha/.test(t) ? addDays(ctx.today, 1) : ctx.today;
    const title = cap(original.replace(/^[:\-–\s]+/, "").replace(/[.!]+$/, ""));
    return reply(`Posso criar a prioridade “${title}” para ${date === ctx.today ? "hoje" : "amanhã"}. Quer salvar?`, undefined, [
      { type: "create_priority", summary: `Nova prioridade: ${title}`, payload: { title, date } },
    ]);
  }

  // 5. Família
  const member = ctx.family.members.find((m) => new RegExp(`\\b${norm(m.name)}\\b`).test(t));
  if (/planej|marcar|program|agend|quero|vou/.test(t) && (member || /familia|filhos|todos juntos/.test(t)) && /momento|tempo|passeio|jogo|jogar|brincar|sair|cinema|almoc|jantar|parque|conversar|ler|orar|devocional|culto/.test(t)) {
    const day = parseDay(t, ctx.today) ?? addDays(ctx.today, 1);
    const time = parseTime(t) ?? "19:00";
    const activity =
      /jogo|jogar/.test(t) ? (/bola|futebol/.test(t) ? "Jogar bola" : "Noite de jogos") : /cinema|filme/.test(t) ? "Filme juntos" : /parque|passeio|sair/.test(t) ? "Passeio" : /almoc/.test(t) ? "Almoço em família" : /jantar/.test(t) ? "Jantar juntos" : /orar|devocional|culto/.test(t) ? "Momento espiritual" : /conversar/.test(t) ? "Conversa a sós" : "Tempo juntos";
    const spiritual = /orar|devocional|culto/.test(t);
    return reply(`Posso planejar “${activity}”${member ? ` com ${member.name}` : " em família"} para ${day === addDays(ctx.today, 1) ? "amanhã" : day.split("-").reverse().slice(0, 2).join("/")} às ${time}. Quer salvar?`, undefined, [
      {
        type: "propose_family_moment",
        summary: `${activity}${member ? ` com ${member.name}` : ""} · ${day.split("-").reverse().slice(0, 2).join("/")} ${time}`,
        payload: { member_id: member?.id ?? "", title: activity, datetime: `${day}T${time}`, category: spiritual && !member ? "spiritual" : member ? "person" : "family" },
      },
    ]);
  }
  if (member || /familia|esposa|filh/.test(t)) {
    const planned = ctx.family.planned;
    const text = planned.length
      ? `Próximo momento: ${planned[0].title}${planned[0].member ? ` com ${planned[0].member}` : ""}. Uma ideia simples para hoje:`
      : "Nada planejado ainda. Uma ideia simples para hoje:";
    return reply(text, [
      { kind: "family", label: member ? `Mandar uma mensagem carinhosa para ${member.name}` : "Mandar uma mensagem para alguém da família", minutes: 2 },
      { kind: "family", label: "Planejar um momento juntos esta semana", minutes: 3 },
    ]);
  }

  // 6. Agenda
  const time = parseTime(t);
  if (time && /(marcar|agendar|lembrar|compromisso|reuniao|consulta|tenho que|preciso|igreja|culto)/.test(t)) {
    const day = parseDay(t, ctx.today) ?? ctx.today;
    const titleRaw = message
      .replace(/\b(marcar|agendar|me lembrar de|lembrar de|lembrar|compromisso|preciso|tenho que)\b/gi, "")
      .replace(/\b(amanhã|amanha|hoje|às|as|a partir das)\b/gi, "")
      .replace(/\d{1,2}\s*(h|:|horas?)\s*\d{0,2}/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[,.:\-–\s]+|[,.!\s]+$/g, "");
    const title = cap(titleRaw || "Compromisso");
    const category = /igreja|culto|missa/.test(t) ? "church" : /reuniao|trabalho|cliente/.test(t) ? "work" : "task";
    return reply(`Posso adicionar “${title}” ${day === ctx.today ? "hoje" : "em " + day.split("-").reverse().slice(0, 2).join("/")} às ${time} no seu dia. Quer salvar?`, undefined, [
      { type: "create_agenda_item", summary: `${title} · ${day.split("-").reverse().slice(0, 2).join("/")} ${time}`, payload: { title, date: day, time, category } },
    ]);
  }

  // 7. Leitura
  if (/\b(li|terminei|conclui|acabei)\b/.test(t) && /biblia|capitulo|joao|evangelho|salmo|livro|paginas?/.test(t)) {
    const acts: ReplyAction[] = [];
    if (/biblia|capitulo|evangelho|salmo/.test(t) || norm(ctx.reading.bible.today).split(" ").some((w) => w.length > 2 && t.includes(w))) {
      if (!ctx.reading.bible.completedToday) acts.push({ type: "mark_bible_reading_done", summary: `Concluir ${ctx.reading.bible.today}`, payload: { id: ctx.reading.bible.planId } });
    }
    if (/livro|paginas?/.test(t) && ctx.reading.book && !ctx.reading.book.completedToday) {
      const pg = /pagina\s*(\d{1,4})/.exec(t);
      acts.push({
        type: "mark_book_reading_done",
        summary: pg ? `Registrar leitura até a página ${pg[1]}` : `Registrar páginas ${ctx.reading.book.pagesToday} de “${ctx.reading.book.title}”`,
        payload: { book_id: ctx.reading.book.id, ...(pg ? { page: Number(pg[1]) } : {}) },
      });
    }
    if (acts.length) return reply("Que bom! Confirma o registro?", undefined, acts);
    return reply("A leitura de hoje já está registrada. Que tal escrever uma reflexão curta?", [{ kind: "bible", label: "Escrever reflexão" }]);
  }
  if (/leitura|ler |biblia|livro|capitulo|o que leio/.test(t)) {
    const b = ctx.reading.bible;
    const bk = ctx.reading.book;
    const parts = [`Bíblia: ${b.completedToday ? `${b.today} concluído ✓` : `hoje é ${b.today}`} (${b.done} de ${b.total}).`];
    if (bk) parts.push(`Livro: “${bk.title}”, ${bk.completedToday ? "meta de hoje feita ✓" : `páginas ${bk.pagesToday}`}.`);
    return reply(parts.join("\n"), nowSuggestions(ctx, null).filter((s) => s.kind === "bible" || s.kind === "book"));
  }

  // 8. Rotina
  if (/\b(fiz|feito|terminei|conclui)\b/.test(t)) {
    const rt = bestMatch(t, [...ctx.routine.morningPending, ...ctx.routine.eveningPending]);
    if (rt) return reply(`Boa! Marco “${rt.title}” como feito hoje?`, undefined, [{ type: "complete_routine_item", summary: `Marcar “${rt.title}” como feito`, payload: { id: rt.id } }]);
  }
  if (/rotina|pendente|falta|o que falta/.test(t)) {
    const hour = Number(ctx.time.slice(0, 2));
    const list = hour >= 17 ? ctx.routine.eveningPending : ctx.routine.morningPending;
    if (!list.length) return reply("Sua rotina deste período está completa. Constância vence motivação.");
    return reply(
      `Faltam ${list.length} ${list.length === 1 ? "item" : "itens"}. Sugiro esta ordem:`,
      list.slice(0, 5).map((r) => ({ kind: (r.icon === "pray" ? "prayer" : "routine") as ReplySuggestion["kind"], label: r.title, detail: r.time ?? undefined })),
    );
  }
  if (/prioridade/.test(t)) {
    if (!ctx.priorities.length) return reply("Você ainda não definiu as prioridades de hoje.", [{ kind: "priorities", label: "Definir as 3 prioridades", minutes: 5 }]);
    return reply(ctx.priorities.map((p, i) => `${i + 1}. ${p.title}${p.status === "done" ? " ✓" : ""}`).join("\n"));
  }

  // 9. O que fazer agora
  if (/agora|celular|tempo livre|o que (posso|devo|eu) fazer|tenho \d+|minutos|sugest|me ajuda|ajuda|tedio|sem fazer nada/.test(t)) {
    const avail = minutesAvailable(t);
    return reply(
      avail ? `Com ${avail} minutos, aqui estão boas opções:` : "Aqui estão algumas sugestões para aproveitar bem esse momento:",
      nowSuggestions(ctx, avail),
    );
  }

  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|opa)\b/.test(t)) {
    return reply(`Olá, ${ctx.name}! Posso sugerir o que fazer agora, ajudar com leitura, rotina, família ou ideias de refeição com o que você tem em casa.`);
  }

  return reply(
    "Posso ajudar com:\n• o que fazer agora (ex.: “tenho 15 minutos”)\n• sua leitura de hoje\n• rotina e prioridades\n• planejar um momento em família\n• ideias de refeição com o que você tem",
  );
}
