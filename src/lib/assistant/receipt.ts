import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { NfceDetails } from "@/lib/nfce";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export async function readReceipt(base64Jpeg: string): Promise<NfceDetails> {
  const client = new Anthropic();
  const res = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 4000,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              store: { type: ["string", "null"] },
              total_cents: { type: ["integer", "null"] },
              date: { type: ["string", "null"], description: "YYYY-MM-DD" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { name: { type: "string" }, qty: { type: "number" }, unit: { type: "string" }, total_cents: { type: ["integer", "null"] } },
                  required: ["name", "qty", "unit", "total_cents"],
                  additionalProperties: false,
                },
              },
            },
            required: ["store", "total_cents", "date", "items"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Jpeg } },
            {
              type: "text",
              text: "Esta é a foto de um cupom/nota fiscal ou recibo brasileiro. Extraia: nome da loja, valor TOTAL pago em centavos (inteiro), data de emissão (YYYY-MM-DD) e os itens (nome legível, quantidade, unidade como un/kg/L, total do item em centavos). Se algo não estiver legível, use null. Não invente valores.",
            },
          ],
        },
      ],
    },
    { timeout: 40_000 },
  );
  if (res.stop_reason === "refusal") throw new Error("refusal");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("sem texto");
  const j = JSON.parse(block.text) as { store: string | null; total_cents: number | null; date: string | null; items: { name: string; qty: number; unit: string; total_cents: number | null }[] };
  return {
    store: j.store,
    total: j.total_cents && j.total_cents > 0 ? j.total_cents : null,
    date: j.date && /^\d{4}-\d{2}-\d{2}$/.test(j.date) ? j.date : null,
    items: (j.items ?? []).slice(0, 200).map((i) => ({ name: i.name, qty: i.qty || 1, unit: (i.unit || "un").toLowerCase(), total: i.total_cents })),
  };
}
