// NORTE — Conselheiro financeiro com IA (Claude).
// GET  → { configured } (se o segredo ANTHROPIC_API_KEY existe no projeto).
// POST { question, history, snapshot } com o login do usuário (JWT) → { answer, remaining }.
// - Só usuários logados; limite diário por usuário (tabela ai_usage) para controlar o custo.
// - O app manda um RESUMO dos números (não o extrato inteiro); a chave fica só aqui no servidor.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const DAILY_LIMIT = 40;
const MODEL = "claude-opus-5-5";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

const KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const anthropic = KEY ? new Anthropic({ apiKey: KEY }) : null;

// Instruções fixas (vêm primeiro e ficam em cache; os números do usuário vão na mensagem).
const SYSTEM = `Você é o Conselheiro financeiro do NORTE, um app cristão de agenda e finanças pessoais.
Fale em português do Brasil, com calma, respeito e esperança — como um amigo sábio, nunca com julgamento.

Como responder:
- Baseie-se nos números do usuário que vêm em "Meus números". Nunca invente valores; se faltar dado, diga o que falta e pergunte.
- Seja prático: comece pela resposta direta e termine com 2 a 4 passos concretos para esta semana ou este mês.
- Use valores em reais (R$) com formatação brasileira.
- Quando fizer sentido, traga um princípio bíblico curto sobre mordomia, contentamento, generosidade ou planejamento, citando só a referência (ex.: Provérbios 21:5). Não force; não pregue.
- Prioridades financeiras que você pode sugerir, nesta ordem quando aplicável: organizar o orçamento, reserva de emergência, sair de dívidas caras (cartão rotativo, cheque especial), generosidade planejada, metas e investimentos simples.
- Não recomende produtos financeiros específicos, ações, criptomoedas ou empresas, nem prometa rendimentos. Para dívidas graves, impostos ou decisões grandes, sugira também procurar um profissional.
- Respostas curtas: até cerca de 250 palavras, com listas quando ajudar. Sem tabelas largas.
- Se o usuário falar de angústia, ansiedade ou desânimo com dinheiro, acolha primeiro.`;

type Turn = { role: "user" | "assistant"; content: string };

async function useQuota(userId: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const { data } = await admin.from("ai_usage").select("count").eq("user_id", userId).eq("day", day).maybeSingle();
  const used = (data?.count as number | undefined) ?? 0;
  if (used >= DAILY_LIMIT) return -1;
  await admin.from("ai_usage").upsert({ user_id: userId, day, count: used + 1 });
  return DAILY_LIMIT - used - 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") return json({ configured: Boolean(anthropic), limit: DAILY_LIMIT });
  if (!anthropic) return json({ error: "A IA ainda não foi ligada no NORTE (falta a chave da Anthropic no servidor)." }, 501);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Entre na sua conta do NORTE para usar o conselheiro." }, 401);

  const body = (await req.json().catch(() => ({}))) as { question?: string; history?: Turn[]; snapshot?: unknown };
  const question = (body.question ?? "").toString().trim().slice(0, 2000);
  if (!question) return json({ error: "Escreva a sua pergunta." }, 400);
  const remaining = await useQuota(u.user.id);
  if (remaining < 0) return json({ error: `Você usou as ${DAILY_LIMIT} perguntas de hoje. Volte amanhã!` }, 429);

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
    .slice(-10)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));
  // A conversa precisa começar com o usuário.
  while (history.length && history[0].role !== "user") history.shift();
  const snapshot = JSON.stringify(body.snapshot ?? {}).slice(0, 20_000);

  try {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [...history, { role: "user", content: `Meus números (resumo gerado pelo app, valores em R$):\n${snapshot}\n\nPergunta: ${question}` }],
    });
    if (res.stop_reason === "refusal") return json({ answer: "Não consigo ajudar com esse pedido. Que tal reformular a pergunta sobre suas finanças?", remaining });
    const answer = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();
    return json({ answer: answer || "Não consegui formular uma resposta agora. Tente de novo.", remaining });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "A chave da Anthropic no servidor é inválida." }, 502);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Muitas perguntas ao mesmo tempo. Tente em um minuto." }, 429);
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, String(e.message).slice(0, 200));
      return json({ error: e.status === 402 || /credit|billing/i.test(e.message) ? "A conta da Anthropic está sem créditos." : "A IA não respondeu agora. Tente de novo." }, 502);
    }
    console.error(String(e).slice(0, 200));
    return json({ error: "A IA não respondeu agora. Tente de novo." }, 502);
  }
});
