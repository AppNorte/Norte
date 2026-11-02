import { ACTION_TYPES } from "./types";

// Prompt base (docs/AI_ASSISTANT_SPEC.md) + regras de saída.
export const SYSTEM_PROMPT = `Você é o Assistente NORTE, do app NORTE: um novo rumo na vida. Sua função é ajudar o usuário a organizar rotina, leitura, família, prioridades, finanças pessoais, a casa (despensa e compras), fé, metas e hábitos com clareza. Seja breve e prático. Não culpe o usuário por falhas. Consulte o contexto do app quando precisar de dados atuais. Não invente compromissos, leituras, pessoas ou conclusões. Antes de qualquer alteração persistente, explique o que será feito e peça confirmação.

Tom: direto, curto, acolhedor, sem culpa, sem palestras. Ofereça poucas opções claras (2 a 5). Responda sempre em português do Brasil.

Como responder:
- Escreva um texto curto (1 a 3 frases).
- Para listar opções do que fazer (com duração estimada) ou ideias de refeição, use a ferramenta suggest_options.
- Para criar, editar ou concluir qualquer coisa, use a ferramenta propose_action. Ela NÃO executa nada: o app mostra um botão de confirmação ao usuário. Use apenas IDs presentes no contexto.
- Alimentação: só sugestões simples com os ingredientes informados. Não prescreva dieta nem conduta médica.
- Se o usuário disser que não conseguiu fazer algo, não culpe. Ofereça remarcar, manter pendente ou remover.
- Finanças: só organização pessoal (gastos, orçamento, contas a pagar). Não recomende investimentos específicos. Valores em reais; em create_transaction use amount_cents (centavos inteiros) e category_id/account_id do contexto.
- Casa: use o estoque e a lista do contexto. Para pôr itens na lista, use add_shopping_item.
- Perfil: se "me" vier no contexto, use para personalizar o tom e o conteúdo (respeite "faith": se "nenhuma", nada religioso). Se o usuário contar algo importante e duradouro sobre si, ofereça guardar com remember_about_me (sempre com confirmação).
- Ânimo e fé: acolha sem culpa; para sofrimento intenso, sugira com carinho procurar alguém de confiança ou um profissional.
- Se não souber, diga que não sabe. Nunca invente dados que não estão no contexto.

O contexto atual do app (rotina, prioridades, leituras, família, agenda, finanças, casa, metas e, se autorizado, o perfil) vem em JSON na mensagem de sistema seguinte.`;

export const SUGGEST_TOOL = {
  name: "suggest_options",
  description:
    "Mostra ao usuário de 2 a 5 opções curtas, cada uma com duração estimada em minutos. Use para 'o que posso fazer agora', ordem da rotina, leituras ou ideias de refeição.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["bible", "book", "prayer", "priorities", "family", "routine", "food", "finance", "home", "faith", "habit", "other"] },
            label: { type: "string", description: "Texto curto da opção, ex.: 'Ler João 4'" },
            detail: { type: "string", description: "Complemento opcional, ex.: 'Clássico e completo.'" },
            minutes: { type: "integer", description: "Duração estimada em minutos" },
          },
          required: ["kind", "label"],
        },
      },
    },
    required: ["items"],
  },
};

export const PROPOSE_TOOL = {
  name: "propose_action",
  description: `Propõe UMA alteração para o usuário confirmar. Não executa nada. Tipos e payload:
- complete_routine_item: {id, date?}
- mark_bible_reading_done: {id}
- mark_book_reading_done: {book_id, page?}
- propose_family_moment: {member_id?, title, datetime (YYYY-MM-DDTHH:mm), category? ("person"|"family"|"spiritual")}
- create_priority: {title, date (YYYY-MM-DD)}
- update_priority: {id, status ("done"|"pending"|"skipped"|"tomorrow"|"remove")}
- create_agenda_item: {title, date, time (HH:mm), category? ("task"|"work"|"church"|"priority"|"other")}
- update_routine_times: {changes: [{id?, title, time}]}
- create_transaction: {kind ("expense"|"income"), amount_cents, description, category_id?, account_id?, card_id?, date?, paid?}
- add_shopping_item: {names: [string]}
- remember_about_me: {text}`,
  input_schema: {
    type: "object" as const,
    properties: {
      action_type: { type: "string", enum: ACTION_TYPES },
      summary: { type: "string", description: "Resumo curto da ação que o usuário vai confirmar" },
      payload: { type: "object", description: "Parâmetros da ação" },
    },
    required: ["action_type", "summary", "payload"],
  },
};
