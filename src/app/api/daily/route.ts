import { NextResponse } from "next/server";
import { pickLocalMessage } from "@/lib/faith/messages";
import { defaultMe } from "@/lib/defaults";
import type { DailyInput } from "@/lib/assistant/daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mensagem do dia personalizada. Com IA (AI_PROVIDER=anthropic) gera; senão, escolhe da coleção local. */
export async function POST(request: Request) {
  let body: Partial<DailyInput>;
  try {
    body = (await request.json()) as Partial<DailyInput>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const me = { ...defaultMe(), ...(body.me ?? {}) };
  const local = pickLocalMessage(me, date);

  const useAi = (process.env.AI_PROVIDER || "mock").toLowerCase() === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY) && me.aiConsent;
  if (!useAi) return NextResponse.json(local);
  try {
    const { generateDaily } = await import("@/lib/assistant/daily");
    const ai = await generateDaily({ name: String(body.name ?? "").slice(0, 60), date, me, signals: body.signals ?? {} });
    return NextResponse.json({ date, text: ai.text, verse: ai.verse, source: "ai" });
  } catch (err) {
    console.error("[mensagem do dia] IA falhou, usando coleção local:", err instanceof Error ? err.message : err);
    return NextResponse.json(local);
  }
}
