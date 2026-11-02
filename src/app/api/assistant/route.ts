import { NextResponse } from "next/server";
import { mockReply } from "@/lib/assistant/mock";
import { sanitizeReply, type AssistantReply, type AssistantRequest } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Provider = AssistantReply["provider"];

function safeMock(message: string, req: AssistantRequest): Partial<AssistantReply> {
  try {
    return mockReply(message, req.context);
  } catch {
    return { text: "Não consegui ler o contexto do app agora. Tente de novo em instantes." };
  }
}

function provider(): Provider {
  const p = (process.env.AI_PROVIDER || "mock").toLowerCase();
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export async function GET() {
  return NextResponse.json({ provider: provider() });
}

export async function POST(request: Request) {
  let body: AssistantRequest;
  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const message = typeof body?.message === "string" ? body.message.slice(0, 2000) : "";
  if (!message.trim() || !body.context || typeof body.context !== "object") return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((h) => (h.role === "user" || h.role === "assistant") && typeof h.text === "string" && h.text.trim())
    .slice(-12)
    .map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }));
  const req: AssistantRequest = { message, history, context: body.context };

  const p = provider();
  if (p === "mock") return NextResponse.json(sanitizeReply(safeMock(message, req), "mock"));

  try {
    const raw =
      p === "anthropic"
        ? await (await import("@/lib/assistant/anthropic")).anthropicReply(req)
        : await (await import("@/lib/assistant/openai")).openaiReply(req);
    return NextResponse.json(sanitizeReply(raw, p));
  } catch (err) {
    // Falha da IA não pode travar o app: responde em modo local.
    console.error("[assistente] provedor falhou, usando modo local:", err instanceof Error ? err.message : err);
    return NextResponse.json(sanitizeReply({ ...safeMock(message, req), degraded: true }, "mock"));
  }
}
