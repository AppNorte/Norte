import { NextResponse } from "next/server";
import type { NfceDetails } from "@/lib/nfce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function aiOn() {
  return (process.env.AI_PROVIDER || "mock").toLowerCase() === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function GET() {
  return NextResponse.json({ ai: aiOn() });
}

/** Lê a foto de uma nota/recibo com IA (visão) e devolve loja, total, data e itens. */
export async function POST(request: Request) {
  if (!aiOn()) return NextResponse.json({ error: "Leitura por IA não está ligada." }, { status: 501 });
  let image = "";
  try {
    image = String(((await request.json()) as { image?: string }).image ?? "");
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!image || image.length > 7_000_000) return NextResponse.json({ error: "Imagem ausente ou grande demais" }, { status: 400 });
  try {
    const { readReceipt } = await import("@/lib/assistant/receipt");
    const details: NfceDetails = await readReceipt(image);
    return NextResponse.json(details);
  } catch (err) {
    console.error("[recibo]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Não consegui ler a foto. Tente uma foto mais nítida." }, { status: 502 });
  }
}
