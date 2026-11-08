// NORTE — Assistente com IA.
// Desligada até existir o segredo ANTHROPIC_API_KEY no projeto; enquanto isso o app usa o modo local.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-region",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ai = Boolean(Deno.env.get("ANTHROPIC_API_KEY"));
  if (req.method === "GET") return json({ ai: false, configured: ai });
  return json({ error: "IA ainda não ligada no NORTE." }, 501);
});
