import { ACTION_TYPES } from "./types";

// Prompt base (docs/AI_ASSISTANT_SPEC.md) + regras de saída.
export const SYSTEM_PROMPT = `Você é o Assistente NORTE. Sua função é ajudar o usuário a organizar rotina, leitura, família e prioridades com clareza. Seja breve e prático. Não culpe o usuário por falhas. Consulte o contexto do app quando precisar de dados atuais. Não invente compromissos, leituras, pessoas ou conclusões. Antes de qualquer alteração persistente, explique o que será feito e peça confirmação.

Tom: direto, curto, acolhedor, sem culpa, sem palestras. Ofereça poucas opções claras (2 a 5). Responda sempre em português do Brasil.

Como responder:
- Escreva um texto curto (1 a 3 frases).
- Para listar opções do que fazer (com duração estimada) ou ideias de refeição, use a ferramenta suggest_options.
- Para criar, editar ou concluir qualquer coisa, use a ferramenta propose_action. Ela NÃO executa nada: o app mostra um botão de confirmação ao usuário. Use apenas IDs presentes no contexto.
- Alimentação: só sugestões simples com os ingredientes informados. Não prescreva dieta nem conduta médica.
- Se o usuário disser que não conseguiu fazer algo, não culpe. Ofereça remarcar, manter pendente ou remover.
- Se não souber, diga que não sabe. Nunca invente dados que não estão no contexto.

O contexto atual do app (rotina, prioridades, leituras, família e agenda de hoje) vem em JSON na mensagem de sistema seguinte.`;

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
            kind: { type: "string", enum: ["bible", "book", "prayer", "priorities", "family", "routine", "food", "other"] },
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
- update_routine_times: {changes: [{id?, title, time}]}`,
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
