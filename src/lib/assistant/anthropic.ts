import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AssistantReply, AssistantRequest, ReplyAction, ReplySuggestion } from "./types";
import { PROPOSE_TOOL, SUGGEST_TOOL, SYSTEM_PROMPT } from "./prompt";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente do servidor
  return client;
}

export async function anthropicReply(req: AssistantRequest): Promise<Partial<AssistantReply>> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...req.history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: req.message },
    // Contexto volátil vai depois da mensagem do usuário, como mensagem de sistema,
    // para manter o prompt fixo (system + tools) estável para cache.
    { role: "system", content: `Contexto do app (JSON):\n${JSON.stringify(req.context)}` },
  ];
  // Mensagens precisam começar pelo usuário.
  while (messages.length && messages[0].role !== "user") messages.shift();

  const response = await getClient().beta.messages.create(
    {
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [SUGGEST_TOOL, PROPOSE_TOOL],
      tool_choice: { type: "auto" },
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    },
    { timeout: 30_000 },
  );

  if (response.stop_reason === "refusal") {
    return { text: "Não posso ajudar com isso. Posso sugerir algo da sua rotina, leitura ou família?" };
  }

  let text = "";
  const suggestions: ReplySuggestion[] = [];
  const actions: ReplyAction[] = [];
  for (const block of response.content) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use") {
      const input = block.input as Record<string, unknown>;
      if (block.name === "suggest_options" && Array.isArray(input.items)) {
        suggestions.push(...(input.items as ReplySuggestion[]));
      }
      if (block.name === "propose_action") {
        actions.push({
          type: input.action_type as ReplyAction["type"],
          summary: String(input.summary ?? ""),
          payload: (input.payload as Record<string, unknown>) ?? {},
        });
      }
    }
  }
  return { text, suggestions, actions };
}
