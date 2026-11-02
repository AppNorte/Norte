# NORTE

PWA mobile-first de organização pessoal: **Hoje, Rotina, Leitura, Família e Assistente NORTE**, além de **Meu dia** e do onboarding.

Especificação em `docs/` e referências visuais em `mockups/`.

## Rodar

```bash
npm install
npm run dev          # http://localhost:3000
```

Produção e testes:

```bash
npm run build && npm start
npm run lint
npm run typecheck
npm run test:e2e     # com o app rodando; BASE_URL=http://localhost:3000 por padrão
```

O `test:e2e` percorre os critérios de `docs/ACCEPTANCE_TESTS.md`, salva capturas em `screenshots/` e confere se nenhuma chave de API foi parar no bundle do navegador.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`.

| Variável | Uso |
|---|---|
| `AI_PROVIDER` | `mock` (padrão, funciona sem internet), `anthropic` ou `openai` |
| `ANTHROPIC_API_KEY` | só no servidor; modelo padrão `claude-opus-5-5` (troque com `ANTHROPIC_MODEL`) |
| `OPENAI_API_KEY` | só no servidor; modelo via `OPENAI_MODEL` |
| `NEXT_PUBLIC_SUPABASE_*` | reservado para a Fase 3 (ainda não usado) |

Se o provedor de IA falhar ou estiver sem chave, o servidor responde com o modo local. Sem rede, o navegador também responde no modo local, então o app nunca depende da IA.

## Como está organizado

```
src/
  app/
    page.tsx               Splash (quem já configurou vai direto para Hoje)
    onboarding/            "Monte seu NORTE"
    (app)/                 Telas com menu inferior de 5 abas
      hoje/ rotina/ leitura/ familia/ meu-dia/ assistente/
    api/assistant/         Rota do assistente (servidor). Escolhe mock/anthropic/openai
    manifest.ts            Manifest PWA
  components/              Hero (topo com montanhas em SVG), Compass (logo), UI, editores
  store/
    StoreProvider.tsx      Estado + persistência em localStorage ("norte:v1")
    logic.ts               Regras puras: seletores, mutações e execução de ações da IA
  lib/
    seed.ts                Estado inicial a partir de seed.example.json + onboarding
    assistant/             mock (regras locais), prompt, provedores e validação
supabase/schema.sql        Schema com RLS (inclui campos usados pela V1)
```

### Assistente: segurança

- A IA **só propõe** ações (`propose_action`) dentro de uma lista fechada de tipos, que espelha as ferramentas de `docs/AI_ASSISTANT_SPEC.md`.
- O cliente mostra **Confirmar / Agora não**. Só depois da confirmação a ação é executada localmente, por `executeAction` em `store/logic.ts`.
- O contexto enviado à IA é só o estado do próprio app (rotina, prioridades, leitura, família e agenda do dia).
- Chaves ficam apenas no servidor (`server-only`).

## Decisões tomadas na V1

- **Topo:** gradiente com silhueta de montanhas em SVG, como permite o `DESIGN_SYSTEM.md`. Nenhuma imagem dos mockups é usada como fundo.
- **Plano progressivo:** recua 30 min por semana, do horário em que o usuário acorda hoje até o horário-meta. Pode ser recomeçado em Ajustes.
- **Família:** meta semanal leve (padrão 3, editável). Um momento sem pessoa conta como "Momento em família" ou "Momento espiritual".
- **Conteúdo:** os dados de exemplo vêm só do `seed.example.json`. O que não está lá (livros da biblioteca, tarefas da família) começa vazio, com convite para adicionar.
- **Hoje contextual:** antes das 18h mostra "Sua manhã"; à noite, "Sua noite".
- **Ajustes:** toque no logo NORTE no topo de qualquer tela para editar nome, horários, frase do topo, versículos, meta da família ou apagar os dados.
- **Meu dia:** acessado tocando na data, na tela Hoje.
- **Voz no Assistente:** o microfone aparece como no mockup, mas desativado. Voz entra depois, segundo o `PRODUCT_SPEC.md`.

## Próximos passos

1. **Fase 3, Supabase:** Auth, sincronização e migração do `localStorage`. O schema já está em `supabase/schema.sql`.
2. **Fase 5:** lembretes configuráveis (notificações).
3. **Fase 6:** acessibilidade com leitor de tela real, telemetria opcional.
