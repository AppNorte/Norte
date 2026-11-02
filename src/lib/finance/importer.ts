// Leitura de extratos: OFX (padrão dos bancos) e CSV (Nubank, Inter e genéricos).

export interface ImportRow {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // centavos COM sinal (negativo = saída)
  fitid: string | null;
}

function cents(v: string): number | null {
  let t = v.trim().replace(/[R$\s]/g, "");
  if (!t) return null;
  const neg = /^-|^\(.*\)$|-$/.test(t);
  t = t.replace(/[()-]/g, "");
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) * (neg ? -1 : 1);
}

function isoDate(v: string): string | null {
  const t = v.trim();
  let m = /^(\d{4})(\d{2})(\d{2})/.exec(t); // OFX 20261102...
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}>([^<\\r\\n]*)`, "i").exec(block);
  return m ? m[1].trim() : null;
}

export function parseOFX(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const raw of blocks) {
    const b = raw.split(/<\/STMTTRN>/i)[0];
    const date = isoDate(tag(b, "DTPOSTED") ?? "");
    const amount = cents(tag(b, "TRNAMT") ?? "");
    if (!date || amount == null || amount === 0) continue;
    const description = [tag(b, "MEMO"), tag(b, "NAME")].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ") || "Lançamento";
    rows.push({ date, description, amount, fitid: tag(b, "FITID") });
  }
  return rows;
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** CSV com cabeçalho. `positiveIsExpense` = fatura de cartão (ex.: Nubank cartão). */
export function parseCSV(text: string, positiveIsExpense = false): ImportRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitCsvLine(lines[0], sep).map(norm);
  // Procura por prioridade (o primeiro padrão que achar coluna vence), sem repetir colunas já usadas.
  const used = new Set<number>();
  const find = (...names: RegExp[]) => {
    for (const n of names) {
      const i = head.findIndex((h, k) => !used.has(k) && n.test(h));
      if (i >= 0) {
        used.add(i);
        return i;
      }
    }
    return -1;
  };
  const iDate = find(/^data/, /^date/, /^dt/);
  const iDesc = find(/descri/, /^title/, /historico/, /estabelecimento/, /^memo/, /lancamento/);
  const iAmt = find(/^valor/, /^amount/, /^quantia/);
  const iIn = find(/credito|entrada/);
  const iOut = find(/debito|saida/);
  const iId = find(/identificador/, /^id$/);
  if (iDate < 0 || (iAmt < 0 && iIn < 0 && iOut < 0)) return [];
  const rows: ImportRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line, sep);
    const date = isoDate(c[iDate] ?? "");
    let amount: number | null = null;
    if (iAmt >= 0) amount = cents(c[iAmt] ?? "");
    else {
      const inV = iIn >= 0 ? (cents(c[iIn] ?? "") ?? 0) : 0;
      const outV = iOut >= 0 ? (cents(c[iOut] ?? "") ?? 0) : 0;
      amount = Math.abs(inV) - Math.abs(outV);
    }
    if (!date || amount == null || amount === 0) continue;
    if (positiveIsExpense) amount = -amount;
    rows.push({ date, description: (iDesc >= 0 ? c[iDesc] : "") || "Lançamento", amount, fitid: iId >= 0 ? c[iId] || null : null });
  }
  return rows;
}

export function parseStatement(fileName: string, text: string, positiveIsExpense: boolean): ImportRow[] {
  if (/\.ofx$|\.qfx$/i.test(fileName) || /<OFX>|<STMTTRN>/i.test(text)) return parseOFX(text);
  return parseCSV(text, positiveIsExpense);
}
