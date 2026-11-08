// NORTE — lê a página pública da NFC-e na Sefaz (só domínios .gov.br).
// Chamada pelo app com o cabeçalho x-region: sa-east-1 (roda em São Paulo; Sefaz bloqueia fora do Brasil).
interface NfceDetails {
  store: string | null;
  total: number | null;
  date: string | null;
  items: { name: string; qty: number; unit: string; total: number | null }[];
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-region",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}


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
function parseNfceHtml(html: string): NfceDetails {
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


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  let url: URL;
  try {
    const body = (await req.json()) as { url?: string };
    url = new URL(String(body.url ?? ""));
  } catch {
    return json({ error: "Link inválido" }, 400);
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.endsWith(".gov.br")) {
    return json({ error: "O QR Code não é de uma nota fiscal (Sefaz)." }, 400);
  }
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14) NORTE/1.0", accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (!new URL(res.url).hostname.endsWith(".gov.br")) throw new Error("redirecionou para fora da Sefaz");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000) throw new Error("página grande demais");
    let html = new TextDecoder("utf-8").decode(buf);
    if (html.includes("\uFFFD")) html = new TextDecoder("iso-8859-1").decode(buf);
    const details = parseNfceHtml(html);
    if (!details.total && !details.items.length) {
      return json({ error: "A Sefaz do seu estado não mostrou os dados da nota automaticamente.", details }, 422);
    }
    return json(details);
  } catch (err) {
    console.error("[nfce]", err instanceof Error ? err.message : err);
    return json({ error: "Não consegui abrir a nota na Sefaz agora." }, 502);
  }
});
