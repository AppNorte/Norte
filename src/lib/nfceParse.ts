import type { NfceDetails } from "./nfce";

function clean(t: string) {
  return t
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function cents(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** Interpreta a página pública da NFC-e (layout nacional usado pela maioria das Sefaz). */
export function parseNfceHtml(html: string): NfceDetails {
  const store = /class="txtTopo"[^>]*>([^<]+)</i.exec(html)?.[1] ?? /Raz[aã]o Social[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)</i.exec(html)?.[1] ?? null;
  const total =
    cents(/Valor a pagar R\$:?\s*<\/label>\s*<span[^>]*>([\d.,]+)/i.exec(html)?.[1]) ??
    cents(/Valor total R\$:?\s*<\/label>\s*<span[^>]*>([\d.,]+)/i.exec(html)?.[1]) ??
    cents(/(?:Valor a pagar|Valor total)[^\d]{0,80}([\d.]*\d,\d{2})/i.exec(clean(html))?.[1]);
  const dm = /Emiss[aã]o:?\s*(?:<\/strong>)?\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(html);
  const date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null;
  const items: NfceDetails["items"] = [];
  const rowRe = /<tr[^>]*id="Item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) && items.length < 200) {
    const row = m[1];
    const name = /class="txtTit[^"]*"[^>]*>([^<]+)</i.exec(row)?.[1];
    if (!name) continue;
    const qty = Number((/class="Rqtd"[^>]*>[\s\S]*?<\/strong>\s*([\d.,]+)/i.exec(row)?.[1] ?? "1").replace(",", ".")) || 1;
    const unit = (/class="RUN"[^>]*>[\s\S]*?<\/strong>\s*([A-Za-z]+)/i.exec(row)?.[1] ?? "un").toLowerCase();
    const val = cents(/class="valor"[^>]*>([\d.,]+)/i.exec(row)?.[1]);
    items.push({ name: clean(name), qty, unit: unit === "unid" ? "un" : unit, total: val });
  }
  return { store: store ? clean(store) : null, total, date, items };
}

