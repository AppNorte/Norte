import { NextResponse } from "next/server";
import { parseNfceHtml } from "@/lib/nfceParse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let url: URL;
  try {
    const body = (await request.json()) as { url?: string };
    url = new URL(String(body.url ?? ""));
  } catch {
    return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  }
  // Só sites oficiais das Sefaz (evita o servidor acessar endereços arbitrários).
  if (!/^https?:$/.test(url.protocol) || !url.hostname.endsWith(".gov.br")) {
    return NextResponse.json({ error: "O QR Code não é de uma nota fiscal (Sefaz)." }, { status: 400 });
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
    if (html.includes("�")) html = new TextDecoder("iso-8859-1").decode(buf);
    const details = parseNfceHtml(html);
    if (!details.total && !details.items.length) {
      return NextResponse.json({ error: "A Sefaz do seu estado não mostrou os dados da nota automaticamente.", details }, { status: 422 });
    }
    return NextResponse.json(details);
  } catch (err) {
    console.error("[nfce]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Não consegui abrir a nota na Sefaz agora." }, { status: 502 });
  }
}
