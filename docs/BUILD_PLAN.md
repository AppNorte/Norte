# NORTE — Plano de Construção

## Fase 1 — UI
- implementar layout base;
- menu com 5 abas;
- onboarding;
- Hoje;
- Rotina;
- Leitura;
- Família;
- Meu dia;
- Assistente.

## Fase 2 — Persistência local
- salvar preferências;
- marcar tarefas;
- progresso de leitura;
- registros familiares;
- histórico básico.

## Fase 3 — Supabase
- Auth;
- schema;
- RLS;
- sincronização;
- migração do localStorage.

## Fase 4 — IA
- rota server-side;
- provider configurável;
- ferramentas;
- confirmações;
- logs.

## Fase 5 — PWA/Notificações
- manifest;
- ícones;
- instalação na tela inicial;
- lembretes configuráveis.

## Fase 6 — Qualidade
- testes;
- acessibilidade;
- performance;
- erros/offline;
- telemetria mínima e opcional.


---

# V2 — Plano

- [x] V1 (Fases 1, 2, 4 parcial e 5 parcial) publicada.
- [x] Etapa 1 — Base: menu Hoje/Finanças/Casa/Rotina/Mais, Assistente flutuante, login e sincronização com Supabase (`app_state` em JSONB por usuário, último a salvar vence).
- [x] Etapa 2 — Finanças completas.
- [x] Etapa 3 — Casa / Despensa.
- [x] Etapa 4 — Fé e força.
- [x] Etapa 5 — Perfil + IA personalizada.
- [x] Etapa 6 — Metas, hábitos, humor, revisão semanal.

Próximos (V2.x): lembretes por notificação (push), recuperação de senha, gráficos de evolução mensal das finanças, importação de extrato (OFX/CSV), compartilhar finanças/despensa com a família.
