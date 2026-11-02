import "server-only";
import type { AssistantReply, AssistantRequest, ReplyAction, ReplySuggestion } from "./types";
import { PROPOSE_TOOL, SUGGEST_TOOL, SYSTEM_PROMPT } from "./prompt";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** Provedor alternativo (AI_PROVIDER=openai), via HTTP. A chave fica só no servidor. */
export async function openaiReply(req: AssistantRequest): Promise<Partial<AssistantReply>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY ausente");

  const tools = [SUGGEST_TOOL, PROPOSE_TOOL].map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: `Contexto do app (JSON):\n${JSON.stringify(req.context)}` },
        ...req.history.map((h) => ({ role: h.role, content: h.text })),
        { role: "user", content: req.message },
      ],
      tools,
      tool_choice: "auto",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: { function: { name: string; arguments: string } }[] } }[];
  };
  const msg = data.choices?.[0]?.message;
  const suggestions: ReplySuggestion[] = [];
  const actions: ReplyAction[] = [];
  for (const call of msg?.tool_calls ?? []) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(call.function.arguments);
    } catch {
      continue;
    }
    if (call.function.name === "suggest_options" && Array.isArray(input.items)) suggestions.push(...(input.items as ReplySuggestion[]));
    if (call.function.name === "propose_action")
      actions.push({ type: input.action_type as ReplyAction["type"], summary: String(input.summary ?? ""), payload: (input.payload as Record<string, unknown>) ?? {} });
  }
  return { text: msg?.content ?? "", suggestions, actions };
}
