// Extrato bancário em PDF → lançamentos para revisar.
// 1) pdf.js extrai o texto (no próprio aparelho; nada é enviado);
// 2) o texto é remontado em linhas e cada linha com data + valor vira um lançamento;
// 3) linhas de "saldo" viram marcadores para conferir/ajustar o saldo da conta.
import { asset } from "@/lib/paths";
import type { ImportRow } from "./importer";
import { parseSantander } from "./pdfSantander";

export interface StatementRow extends ImportRow {
  balance?: number | null; // saldo depois deste lançamento (quando o extrato mostra)
  transfer?: boolean; // sugestão: transferência entre contas (ex.: para a poupança)
  catHint?: { kind: "expense" | "income"; name: string }; // categoria sugerida pelo tipo do lançamento
  problem?: string | null; // conferência que falhou nesta linha
}

export interface StatementChecks {
  ok: boolean;
  messages: string[];
}

export interface PdfStatement {
  rows: StatementRow[];
  closing: { date: string; amount: number } | null; // saldo final (ajuste de saldo)
  lines: number;
  format?: "santander" | "generic";
  summary?: { from: string; to: string; initial: number; inflow: number; outflow: number; final: number } | null;
  checks?: StatementChecks | null;
}

/** Uma linha do PDF: texto e pedaços com a posição horizontal. */
export interface PdfLine {
  page: number;
  y: number;
  text: string;
  cells: { s: string; x: number }[];
}

export class PdfPasswordError extends Error {
  wrong: boolean;
  constructor(wrong: boolean) {
    super(wrong ? "Senha do PDF incorreta." : "Este PDF tem senha.");
    this.wrong = wrong;
  }
}

/** Texto do PDF em linhas (agrupa os pedaços pela altura na página e ordena pela posição horizontal). */
export async function pdfLines(data: ArrayBuffer, password?: string): Promise<PdfLine[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = asset("/pdf.worker.min.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(data), password });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    const err = e as { name?: string; code?: number };
    if (err?.name === "PasswordException") throw new PdfPasswordError(err.code === 2);
    throw e;
  }
  const out: PdfLine[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as { str?: string; transform?: number[]; width?: number }[])
      .filter((i) => i.str && i.str.trim() && i.transform)
      .map((i) => ({ s: i.str!, x: i.transform![4], y: i.transform![5], w: i.width ?? 0 }));
    // agrupa por linha (tolerância de 3 pontos)
    const rows: { y: number; it: typeof items }[] = [];
    for (const it of items.sort((a, b) => b.y - a.y)) {
      const r = rows.find((x) => Math.abs(x.y - it.y) <= 3);
      if (r) r.it.push(it);
      else rows.push({ y: it.y, it: [it] });
    }
    for (const r of rows) {
      const parts = r.it.sort((a, b) => a.x - b.x);
      let line = "";
      let end = -Infinity;
      for (const it of parts) {
        const gap = it.x - end;
        line += line ? (gap > 12 ? "   " : gap > 1.5 ? " " : "") : "";
        line += it.s;
        end = it.x + it.w;
      }
      out.push({ page: p, y: r.y, text: line.replace(/\s+$/, ""), cells: parts.map((x) => ({ s: x.s.trim(), x: x.x })) });
    }
  }
  await task.destroy();
  return out;
}

const MONTHS: Record<string, string> = { jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06", jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12" };
const MONEY = /(?:^|\s)(-\s?)?(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})(\s?-|\s?[DC](?![a-zà-ú]))?(?=\s|$)/gi;
const DATE_START = /^\s*(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b|^\s*(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?:\s*(?:de\s+)?(\d{4}))?\b/i;
const BALANCE = /\bsaldo\b/i;
const SKIP = /\b(total|subtotal|limite|resumo|per[ií]odo|ag[eê]ncia|conta corrente|cpf|cnpj|p[aá]gina|data\s+(?:lan|hist|desc)|lan[cç]amentos? futuros?|rendimento bruto)\b/i;

function toCents(num: string): number {
  return Math.round(Number(num.replace(/\./g, "").replace(",", ".")) * 100);
}

/** Ano do extrato: o mais comum entre as datas completas (dd/mm/aaaa) do texto. */
function guessYear(lines: string[], fallback: number) {
  const count = new Map<number, number>();
  for (const l of lines) for (const m of l.matchAll(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/g)) count.set(Number(m[1]), (count.get(Number(m[1])) ?? 0) + 1);
  let best = fallback;
  let n = 0;
  for (const [y, c] of count) if (c > n) [best, n] = [y, c];
  return best;
}

export function parsePdfStatement(input: PdfLine[] | string[], today = new Date()): PdfStatement {
  const structured = typeof input[0] === "object" ? (input as PdfLine[]) : null;
  if (structured) {
    const sant = parseSantander(structured);
    if (sant) return sant;
  }
  const lines = structured ? structured.map((l) => l.text) : (input as string[]);
  const year = guessYear(lines, today.getFullYear());
  const todayKey = today.toISOString().slice(0, 10);
  // Se o extrato não marca débito/crédito em lugar nenhum, os valores sem sinal ficam como saída (o usuário pode inverter).
  const hasSigns = lines.some((l) => /\d,\d{2}\s?-(?:\s|$)|-\s?(?:R\$\s?)?\d{1,3}(?:\.\d{3})*,\d{2}|\d,\d{2}\s?[DC](?:\s|$)/.test(l));
  const rows: StatementRow[] = [];
  let closing: PdfStatement["closing"] = null;
  let lastDate: string | null = null;

  for (const raw of lines) {
    const line = raw.replace(/ /g, " ").trim();
    if (!line) continue;
    const dm = DATE_START.exec(line);
    let date: string | null = null;
    let rest = line;
    if (dm) {
      let d: string, mo: string, y: string | undefined;
      if (dm[1]) [d, mo, y] = [dm[1], dm[2], dm[3]];
      else [d, mo, y] = [dm[4], MONTHS[dm[5].toLowerCase().slice(0, 3)], dm[6]];
      const yy = y ? (y.length === 2 ? `20${y}` : y) : String(year);
      const dd = Number(d);
      const mm = Number(mo);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        date = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        // dd/mm sem ano no começo do ano: datas de dezembro são do ano anterior
        if (!y && date > todayKey && mm === 12) date = `${Number(yy) - 1}${date.slice(4)}`;
        rest = line.slice(dm[0].length);
      }
    }
    const monies = [...rest.matchAll(MONEY)];
    if (!monies.length) {
      if (date) lastDate = date;
      continue;
    }
    const useDate = date ?? lastDate;
    if (!useDate) continue;
    const first = monies[0];
    const signed = (m: RegExpMatchArray) => {
      const v = toCents(m[2]);
      const suffix = (m[3] ?? "").trim().toUpperCase();
      const neg = Boolean(m[1]) || suffix === "-" || suffix === "D";
      const pos = suffix === "C";
      return neg ? -v : pos ? v : hasSigns ? v : -v;
    };
    const desc = rest
      .slice(0, first.index)
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s\-–|:]+|[\s\-–|:]+$/g, "")
      .trim();

    if (BALANCE.test(line)) {
      // "SALDO ANTERIOR", "SALDO DO DIA", "SALDO FINAL"…: guarda o último como saldo de fechamento
      const last = monies[monies.length - 1];
      const v = toCents(last[2]);
      const neg = Boolean(last[1]) || /-|D/i.test((last[3] ?? "").trim());
      closing = { date: useDate, amount: neg ? -v : v };
      lastDate = useDate;
      continue;
    }
    if (!desc || SKIP.test(desc) || desc.length < 2) {
      if (date) lastDate = date;
      continue;
    }
    // Duas quantias na linha: a 1ª é o lançamento, a última costuma ser o saldo do dia.
    if (monies.length >= 2) {
      const bal = monies[monies.length - 1];
      const bv = toCents(bal[2]);
      closing = { date: useDate, amount: /-|D/i.test((bal[3] ?? "").trim()) || bal[1] ? -bv : bv };
    }
    const amount = signed(first);
    if (!amount) continue;
    rows.push({ date: useDate, description: desc.slice(0, 80), amount, fitid: null });
    lastDate = useDate;
  }
  return { rows, closing, lines: lines.length, format: "generic" };
}
