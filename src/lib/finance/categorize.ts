import type { FinCategory } from "@/lib/types";

function norm(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Palavras do lançamento → nome (normalizado) da categoria padrão.
export const CAT_HINTS: [RegExp, string][] = [
  [/mercado|supermerc|feira|atacad|assai|carrefour|atacadao|hortifruti|sacolao/, "mercado"],
  [/lanche|restaurante|ifood|almoco|jantar|padaria|pizza|hamburg|burger|cafe|lanchonete|mcdonald|bk |subway|rappi/, "alimentacao"],
  [/uber|99app|99 |gasolina|combustivel|posto|shell|ipiranga|petrobras|onibus|metro|estacionamento|pedagio|sem parar|veloe/, "transporte"],
  [/farmacia|drogaria|droga|raia|pacheco|remedio|medico|consulta|exame|dentista|hospital|clinica|unimed|amil/, "saude"],
  [/luz|energia|enel|cemig|light|copel|agua|sabesp|cedae|internet|vivo|claro|tim |oi |gas |telefone/, "contas da casa"],
  [/aluguel|condominio|iptu|imobiliaria/, "moradia"],
  [/igreja|oferta|dizimo|doacao|ministerio/, "igreja e doacoes"],
  [/escola|curso|faculdade|udemy|alura|livraria|material escolar/, "educacao"],
  [/roupa|sapato|tenis|renner|riachuelo|c&a|cea|zara|shein|centauro|netshoes/, "vestuario"],
  [/netflix|spotify|assinatura|amazon prime|prime video|disney|youtube|hbo|max |globoplay|deezer|icloud|google one/, "assinaturas"],
  [/cinema|ingresso|passeio|viagem|hotel|airbnb|show|parque|bar /, "lazer"],
  [/salario|folha|pagamento de salario|proventos|vencimentos/, "salario"],
  [/rendimento|juros|dividend|cdb|tesouro/, "rendimentos"],
  [/freela|pix recebido|transferencia recebida|venda/, "renda extra"],
];

export function guessCategory(text: string, kind: "expense" | "income", categories: { id: string; name: string; kind: string }[]): string | null {
  const t = norm(text);
  const cats = categories.filter((c) => c.kind === kind);
  for (const [re, name] of CAT_HINTS) {
    if (re.test(t)) {
      const c = cats.find((x) => norm(x.name) === name);
      if (c) return c.id;
    }
  }
  return null;
}

export type CategoryLite = Pick<FinCategory, "id" | "name" | "kind">;
