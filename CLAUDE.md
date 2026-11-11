# Instruções para Claude Code — Projeto NORTE

Você está trabalhando no aplicativo **NORTE**.

Leia nesta ordem antes de alterar código:

1. `docs/PRODUCT_SPEC.md`
2. `docs/SCREEN_SPECS.md`
3. `docs/USER_FLOWS.md`
4. `docs/DESIGN_SYSTEM.md`
5. `docs/DATABASE_SCHEMA.md`
6. `docs/AI_ASSISTANT_SPEC.md`
7. `docs/ACCEPTANCE_TESTS.md`
8. os mockups em `mockups/`

## Objetivo

Construir uma PWA mobile-first de desenvolvimento pessoal: NORTE é um novo rumo na vida.

V3 (decisão do dono do produto, nov/2026): foco em **Agenda + Finanças**, com tom cristão.
Menu inferior: **Hoje · Agenda · Finanças · Aprender · Mais**. A Agenda lê o Google Agenda pelo
"endereço secreto no formato iCal" (função `calendar` do Supabase). Rotina, Casa, Leitura, Família,
Metas e Meu dia saíram do menu e ficam em "Mais → Recursos guardados" (dados preservados; não apagar).

(Histórico) V2: menu inferior com Hoje · Finanças · Casa · Rotina · Mais.
O Assistente NORTE é um botão flutuante (bússola) disponível nas telas principais.
Em "Mais": Leitura, Família, Meu dia, Assistente, Conta/Nuvem e Ajustes (e, nas próximas etapas, Fé, Metas e Perfil).

Existe também a tela secundária `Meu dia` e um onboarding inicial. Ver `docs/PRODUCT_SPEC.md` (seção V2).

## Regras obrigatórias

- Siga o escopo e a ordem da V2 em `docs/PRODUCT_SPEC.md` e `docs/BUILD_PLAN.md`; não invente módulos fora dele.
- Finanças são pessoais (controle de entradas, saídas, contas e cartões). Não transforme o app em ERP, CRM ou app da DaylinTech.
- Valores em dinheiro sempre em centavos inteiros; formatação pt-BR (R$).
- Preserve o design premium, calmo e minimalista dos mockups.
- Priorize Android mobile e telas estreitas, mas mantenha responsividade desktop.
- O menu principal deve ter: Hoje, Agenda, Finanças, Aprender, Mais (+ Assistente flutuante).
- A IA deve operar por ferramentas autorizadas; não pode alterar banco diretamente.
- Toda ação destrutiva ou de alteração importante feita pela IA deve pedir confirmação.
- API keys somente no servidor / variáveis de ambiente.
- Não use dados sensíveis do histórico do usuário além do que estiver explicitamente no `seed.example.json`.
- Datas, horários e conteúdos de exemplo devem ser editáveis; não devem ficar hardcoded como regra do produto.
- A V1 deve continuar útil mesmo se a IA estiver indisponível.

## Estratégia de implementação

1. Primeiro, faça os layouts funcionarem exatamente e a navegação estar sólida.
2. Depois, implemente estado local com persistência.
3. Só então conecte Supabase.
4. Depois conecte a IA.
5. Por fim, notificações/PWA e testes.

## Critério de qualidade

O usuário deve abrir o app e entender em menos de 10 segundos:

- o que precisa fazer agora;
- o que falta na rotina;
- o que ler hoje;
- se há algo importante com a família;
- como falar com o Assistente NORTE.
