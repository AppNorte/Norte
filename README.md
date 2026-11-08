# NORTE

PWA mobile-first de desenvolvimento pessoal: um novo rumo na vida.
Menu: **Hoje · Finanças · Casa · Rotina · Mais**, com o **Assistente NORTE** como botão flutuante.
Em "Mais": Leitura, Família, Meu dia, Assistente, Conta e nuvem, Ajustes.

## Publicação (igual DaylinTech e Biamarques)

- Site: **https://appnorte.github.io/Norte/** (GitHub Pages, conta AppNorte). Cada push na `main` publica sozinho (`.github/workflows/pages.yml` → `npm run build:pages`).
- Nuvem: Supabase **vcpnnlfakhlfshxcoxsu** (conta AppNorte). URL e chave *publishable* em `src/lib/publicConfig.ts` (públicas; nunca a secret/service_role).
- Funções de servidor em `supabase/functions/` (Edge Functions, Deno): `nfce` (Sefaz, chamada com `x-region: sa-east-1`), `receipt`, `assistant`, `daily` (IA, desligadas até existir o segredo `ANTHROPIC_API_KEY` no projeto; o app usa o modo local).
- Deploy de uma função: `POST https://api.supabase.com/v1/projects/<ref>/functions/deploy?slug=<nome>` (multipart: metadata + index.ts), com um token de acesso do Supabase.
- `npm run build` continua gerando a versão com servidor (rotas `/api`), se um dia precisar de Vercel.

## Nuvem (Supabase), opcional mas recomendado

1. Crie um projeto grátis em supabase.com.
2. Em **SQL Editor → New query**, cole o conteúdo de `supabase/setup.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Na Vercel (**Settings → Environment Variables**), crie `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` e faça **Redeploy**.
5. No Supabase, em **Authentication → URL Configuration**, coloque o endereço do app em **Site URL** (para o link de confirmação de e-mail).

Sem essas variáveis o app funciona normalmente, salvando só no aparelho.
A sincronização guarda o estado inteiro do usuário em `app_state` (JSONB, com RLS). No primeiro login em um aparelho, a nuvem vence e a cópia local vira backup em `norte:backup`. Depois disso, vence a alteração mais recente.

## Finanças

Contas com saldo, receitas, despesas e transferências (pagas ou pendentes), cartões de crédito (limite, fechamento, vencimento, fatura por mês e pagamento), compras parceladas, lançamentos fixos mensais, categorias com orçamento, previsão do fim do mês e contas a pagar e receber. Valores sempre em centavos (`src/lib/finance/logic.ts`).

### Nota fiscal na despesa

Em "Novo lançamento" (despesa): **Ler QR Code** (câmera ao vivo), **Tirar foto**, **Galeria** ou arrastar a imagem.
- QR Code da NFC-e: lê a chave, o estado, a data (e o valor, no formato offline). O servidor (`/api/nfce`, só domínios `.gov.br`) abre a página pública da Sefaz e extrai loja, total e itens. O layout varia por estado, então é "melhor esforço": se falhar, a nota e o link ficam salvos.
- Sem QR legível e com IA ligada: `/api/receipt` lê a foto (visão) e preenche loja, valor, data e itens.
- Itens da nota podem ir direto para a despensa.
- Fotos ficam no IndexedDB do aparelho (`src/lib/files.ts`) e ainda não entram no backup nem na nuvem.
- `vercel.json` fixa as funções em São Paulo (`gru1`): as Sefaz costumam bloquear acessos de fora do Brasil.

## Casa / Despensa

Estoque por local (despensa, geladeira, freezer…), categoria automática pelo nome, aviso do que está acabando e vencendo, lista de compras com preço, e "Concluir compra", que soma na despensa, guarda o histórico de preços e (opcional) lança o gasto em Finanças.

## Fé e força, Perfil e IA

- Mensagem do dia: com `AI_PROVIDER=anthropic` e consentimento em **Meu perfil**, é escrita pela IA para o usuário (`/api/daily`); sem isso, vem da coleção local (`src/lib/faith/messages.ts`), escolhida pelos desafios do perfil.
- Gratidão diária (com sequência), pedidos de oração/intenções, favoritas.
- Meu perfil: sobre mim, sonhos, valores, desafios, fé (ou sem religião) e tom. O perfil só vai para a IA com consentimento. "O que o NORTE sabe sobre você" lista o que foi confirmado e pode ser apagado.

## Metas e hábitos

Humor e energia do dia, hábitos por dia da semana com sequência, metas com passos, resumo e revisão da semana e conquistas.

## Assistente

Também entende finanças ("gastei 50 no mercado"), lista de compras ("coloca leite e pão na lista"), perfil ("lembre que…") e ânimo ("estou ansioso"). Toda alteração continua pedindo **Confirmar**.

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
