import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MeProfile } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export interface DailyInput {
  name: string;
  date: string;
  me: MeProfile;
  signals: { mood?: number | null; energy?: number | null; goals?: string[]; habitsDone?: number; habitsTotal?: number };
}

const SYSTEM = `Você escreve a "mensagem do dia" do app NORTE, um app de desenvolvimento pessoal: um novo rumo na vida.
Escreva em português do Brasil, para UMA pessoa, usando o perfil dela.
Regras:
- 2 a 4 frases curtas. Calorosa, firme, sem culpa, sem clichê de autoajuda vazio.
- Toque em algo concreto do perfil (desafio, sonho, valores ou sinais de hoje), sem repetir o perfil literalmente.
- Se a fé da pessoa for "crista", inclua um versículo bíblico curto e real, com a referência correta. Se for "espiritual", pode haver uma palavra de fé genérica, sem versículo. Se for "nenhuma", nada religioso e verse = null.
- Tom pedido: use exatamente o tom do perfil (acolhedor, direto ou motivador).
- Nunca invente fatos sobre a pessoa. Nada de conselho médico, psicológico ou financeiro específico.`;

export async function generateDaily(input: DailyInput): Promise<{ text: string; verse: { text: string; ref: string } | null }> {
  const client = new Anthropic();
  const res = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              text: { type: "string" },
              verse: {
                anyOf: [
                  { type: "null" },
                  { type: "object", properties: { text: { type: "string" }, ref: { type: "string" } }, required: ["text", "ref"], additionalProperties: false },
                ],
              },
            },
            required: ["text", "verse"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: `Data: ${input.date}\nNome: ${input.name}\nPerfil e sinais (JSON):\n${JSON.stringify({ perfil: input.me, sinais: input.signals })}` }],
    },
    { timeout: 25_000 },
  );
  if (res.stop_reason === "refusal") throw new Error("refusal");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("sem texto");
  const parsed = JSON.parse(block.text) as { text: string; verse: { text: string; ref: string } | null };
  if (!parsed.text) throw new Error("vazio");
  return { text: parsed.text.slice(0, 600), verse: parsed.verse && parsed.verse.text ? { text: parsed.verse.text.slice(0, 300), ref: parsed.verse.ref.slice(0, 60) } : null };
}
