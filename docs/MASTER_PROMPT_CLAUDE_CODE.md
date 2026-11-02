# Prompt mestre para iniciar no Claude Code

Quero que você desenvolva o aplicativo **NORTE** usando este repositório como fonte da verdade.

Antes de codificar, leia:
- CLAUDE.md
- docs/PRODUCT_SPEC.md
- docs/SCREEN_SPECS.md
- docs/USER_FLOWS.md
- docs/DESIGN_SYSTEM.md
- docs/DATABASE_SCHEMA.md
- docs/AI_ASSISTANT_SPEC.md
- docs/ACCEPTANCE_TESTS.md
- todas as imagens em mockups/

Objetivo imediato: entregar uma V1 mobile-first fiel aos mockups, sem inventar novos módulos.

Ordem de execução:
1. auditar o código atual;
2. corrigir/organizar a estrutura;
3. implementar navegação de 5 abas;
4. finalizar onboarding;
5. finalizar Hoje;
6. finalizar Rotina;
7. finalizar Leitura;
8. finalizar Família;
9. finalizar Meu dia;
10. finalizar Assistente em modo mock;
11. persistir dados localmente;
12. só depois conectar Supabase;
13. depois integrar IA real server-side.

Não faça tudo em um único passo. Ao final de cada etapa:
- rode lint/build/testes;
- informe arquivos alterados;
- descreva o que está funcionando;
- liste o próximo passo.

Regras:
- nunca colocar chave de IA no frontend;
- não remover telas já aprovadas;
- não trocar a identidade visual sem necessidade;
- não adicionar financeiro, CRM, DaylinTech, estoque ou mapas na V1;
- usar os mockups como referência visual, não como imagens de fundo da UI;
- manter textos e horários configuráveis;
- usar português do Brasil.
