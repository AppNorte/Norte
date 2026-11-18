// Extrato "EXTRATO DE CONTA" (formato do Santander).
// Regras:
// - Cabeçalho: "Período: dd/mm/aaaa a dd/mm/aaaa" e o quadro Saldo inicial | Entradas | Saídas | Saldo final.
// - "DETALHE DOS MOVIMENTOS": linha principal "dd/mm/aaaa [descrição] (-)R$ valor R$ saldo".
//   A descrição costuma vir em 2 linhas: o tipo ACIMA e o nome ABAIXO da linha principal → "Tipo - Nome".
// - Ignora cabeçalhos de dia, o cabeçalho das colunas e o rodapé "1/7".
// - Vem do mais recente para o mais antigo; sai em ordem de data.
// - Conferências: somas x resumo; saldo da linha − valor = saldo da linha anterior no tempo; inicial + entradas − saídas = final.
import type { PdfLine, PdfStatement, StatementRow } from "./pdfStatement";

const MONEY = "-?\\s?R\\$\\s?\\d{1,3}(?:\\.\\d{3})*,\\d{2}";
const MAIN = new RegExp(`^(\\d{2})/(\\d{2})/(\\d{4})\\s+(.*?)\\s*(${MONEY})\\s+(${MONEY})$`);
const DAY_HEADER = /^(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(-feira)?,\s+\d{1,2}\s+de\s+/i;
const COL_HEADER = /^data\s+descri[cç][aã]o\s+valor\s+saldo$/i;
const FOOTER = /^\d+\s*\/\s*\d+$/;

function cents(v: string): number {
  const neg = v.trim().startsWith("-");
  const n = Math.round(Number(v.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
  return neg ? -n : n;
}

const iso = (d: string) => d.split("/").reverse().join("-");
const fmt = (c: number) => `R$ ${(Math.abs(c) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Categoria sugerida pelo tipo do lançamento (o usuário pode trocar na revisão). */
function hintFor(type: string, amount: number): Pick<StatementRow, "catHint" | "transfer"> {
  const t = norm(type);
  if (/transferencia (para|da|de) conta poupanca|aplicacao poupanca|resgate poupanca/.test(t)) return { transfer: true };
  if (/remuneracao aplicacao/.test(t)) return { catHint: { kind: "income", name: "Rendimentos" } };
  if (/pix recebido|ted recebida|transferencia recebida/.test(t)) return { catHint: { kind: "income", name: "Receitas" } };
  if (/compra cartao deb/.test(t)) return { catHint: { kind: "expense", name: "Compras no débito" } };
  if (/pagamento de boleto/.test(t)) return { catHint: { kind: "expense", name: "Contas e boletos" } };
  if (/recarga telefone/.test(t)) return { catHint: { kind: "expense", name: "Telefone" } };
  return amount > 0 ? { catHint: { kind: "income", name: "Receitas" } } : {};
}

export function parseSantander(lines: PdfLine[]): PdfStatement | null {
  const all = lines.map((l) => l.text.trim());
  if (!all.some((t) => /^EXTRATO DE CONTA$/i.test(t)) || !all.some((t) => /^DETALHE DOS MOVIMENTOS$/i.test(t))) return null;

  // Cabeçalho
  const per = all.map((t) => /Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i.exec(t)).find(Boolean);
  const headIdx = all.findIndex((t) => /saldo inicial/i.test(t) && /saldo final/i.test(t));
  const vals = headIdx >= 0 ? [...(all[headIdx + 1] ?? "").matchAll(new RegExp(MONEY, "g"))].map((m) => cents(m[0])) : [];
  const summary =
    per && vals.length >= 4 ? { from: iso(per[1]), to: iso(per[2]), initial: vals[0], inflow: Math.abs(vals[1]), outflow: Math.abs(vals[2]), final: vals[3] } : null;

  // Sequência de linhas úteis da seção de movimentos (todas as páginas)
  type Tok = { kind: "main"; line: PdfLine; m: RegExpExecArray } | { kind: "desc"; line: PdfLine; text: string };
  const toks: Tok[] = [];
  let inDetail = false;
  // Coluna da descrição: pela posição do título "Descrição" no cabeçalho da tabela.
  const head = lines.find((l) => COL_HEADER.test(l.text.trim().replace(/\s+/g, " ")));
  const descX = head?.cells.find((c) => /^descri/i.test(c.s))?.x ?? 100;
  const valX = head?.cells.find((c) => /^valor/i.test(c.s))?.x ?? 400;
  for (const l of lines) {
    const t = l.text.trim();
    if (/^DETALHE DOS MOVIMENTOS$/i.test(t)) {
      inDetail = true;
      continue;
    }
    if (!inDetail || !t || DAY_HEADER.test(t) || COL_HEADER.test(t.replace(/\s+/g, " ")) || FOOTER.test(t)) continue;
    const m = MAIN.exec(t.replace(/\s+/g, " "));
    if (m) toks.push({ kind: "main", line: l, m });
    else if (l.cells[0] && l.cells[0].x >= descX - 12 && l.cells[0].x < valX - 20 && !new RegExp(MONEY).test(t)) toks.push({ kind: "desc", line: l, text: t.replace(/\s+/g, " ") });
  }

  // Monta cada movimentação: tipo (acima) e nome (abaixo).
  const docRows: (StatementRow & { type: string; name: string })[] = [];
  let pending: Tok[] = [];
  const attach = (descs: Tok[], prev: (typeof docRows)[number] | undefined, main: Tok & { kind: "main" }) => {
    // Entre duas linhas principais: o 1º texto é o nome da anterior; o último, colado acima, é o tipo da atual.
    let type = "";
    const rest = [...descs] as (Tok & { kind: "desc" })[];
    const last = rest[rest.length - 1];
    if (last && last.line.page === main.line.page && last.line.y - main.line.y > 0 && last.line.y - main.line.y <= 14) {
      type = last.text;
      rest.pop();
    }
    if (prev && rest.length) prev.name = [prev.name, ...rest.map((r) => r.text)].filter(Boolean).join(" ");
    return type;
  };
  for (const tk of toks) {
    if (tk.kind === "desc") {
      pending.push(tk);
      continue;
    }
    const prev = docRows[docRows.length - 1];
    const type = attach(pending, prev, tk);
    pending = [];
    const [, d, mo, y, inline, val, bal] = tk.m;
    const amount = cents(val);
    docRows.push({ date: `${y}-${mo}-${d}`, description: "", amount, balance: cents(bal), fitid: null, type: inline.trim() || type, name: "" });
  }
  if (pending.length && docRows.length) docRows[docRows.length - 1].name = pending.map((p) => (p as { text: string }).text).join(" ");
  if (!docRows.length) return null;

  for (const r of docRows) {
    r.description = [r.type, r.name].filter(Boolean).join(" - ").slice(0, 80) || "Movimentação";
    Object.assign(r, hintFor(r.type, r.amount));
  }

  // Conferências
  const messages: string[] = [];
  const inflow = docRows.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0);
  const outflow = docRows.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0);
  if (summary) {
    if (inflow !== summary.inflow) messages.push(`Entradas lidas ${fmt(inflow)} ≠ resumo ${fmt(summary.inflow)}.`);
    if (outflow !== summary.outflow) messages.push(`Saídas lidas ${fmt(outflow)} ≠ resumo ${fmt(summary.outflow)}.`);
    if (summary.initial + summary.inflow - summary.outflow !== summary.final) messages.push(`O próprio resumo não fecha: ${fmt(summary.initial)} + entradas − saídas ≠ ${fmt(summary.final)}.`);
  } else messages.push("Não encontrei o quadro de resumo (saldo inicial, entradas, saídas e saldo final).");
  // Documento vem do mais novo para o mais antigo: saldo(i) − valor(i) = saldo(i+1).
  for (let i = 0; i < docRows.length; i++) {
    const r = docRows[i];
    const before = i + 1 < docRows.length ? docRows[i + 1].balance : summary?.initial;
    if (before != null && r.balance != null && r.balance - r.amount !== before) {
      r.problem = `Saldo não confere: ${fmt(r.balance)} − (${r.amount < 0 ? "−" : ""}${fmt(r.amount)}) deveria dar ${fmt(before)}.`;
    }
  }
  if (summary && docRows[0].balance != null && docRows[0].balance !== summary.final) messages.push(`O saldo da última movimentação (${fmt(docRows[0].balance)}) não é o saldo final do resumo (${fmt(summary.final)}).`);
  const bad = docRows.filter((r) => r.problem).length;
  if (bad) messages.push(`${bad} ${bad === 1 ? "linha com saldo que não confere" : "linhas com saldo que não confere"} (marcadas em vermelho).`);

  // Ordem por data (mais antigo primeiro), mantendo a ordem do dia.
  const rows: StatementRow[] = docRows
    .map((r, i) => ({ r, i }))
    .reverse()
    .sort((a, b) => a.r.date.localeCompare(b.r.date))
    .map(({ r }) => {
      const { type: _t, name: _n, ...rest } = r;
      void _t;
      void _n;
      return rest;
    });

  return {
    rows,
    closing: summary ? { date: summary.to, amount: summary.final } : docRows[0].balance != null ? { date: docRows[0].date, amount: docRows[0].balance } : null,
    lines: lines.length,
    format: "santander",
    summary,
    checks: { ok: messages.length === 0, messages },
  };
}

/**
 * Refaz as conferências depois das correções na revisão.
 * `rows` em ordem de data (mais antigo primeiro), com o saldo que o extrato mostra em cada linha.
 * Devolve as mensagens gerais e o índice das linhas cujo saldo não confere.
 */
export function recheckStatement(
  rows: { amount: number; balance?: number | null }[],
  summary: NonNullable<PdfStatement["summary"]>,
): { ok: boolean; messages: string[]; bad: Set<number> } {
  const messages: string[] = [];
  const bad = new Set<number>();
  const inflow = rows.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0);
  const outflow = rows.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0);
  if (inflow !== summary.inflow) messages.push(`Entradas: lidas ${fmt(inflow)}, no resumo ${fmt(summary.inflow)} (diferença ${fmt(inflow - summary.inflow)}).`);
  if (outflow !== summary.outflow) messages.push(`Saídas: lidas ${fmt(outflow)}, no resumo ${fmt(summary.outflow)} (diferença ${fmt(outflow - summary.outflow)}).`);
  if (summary.initial + summary.inflow - summary.outflow !== summary.final) messages.push("O resumo do extrato não fecha (saldo inicial + entradas − saídas ≠ saldo final).");
  let prev = summary.initial;
  rows.forEach((r, i) => {
    if (r.balance == null) return;
    if (prev + r.amount !== r.balance) bad.add(i);
    prev = r.balance;
  });
  if (bad.size) messages.push(`${bad.size} ${bad.size === 1 ? "linha não confere" : "linhas não conferem"} com o saldo do extrato (em vermelho na lista).`);
  return { ok: messages.length === 0, messages, bad };
}
