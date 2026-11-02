# NORTE — Implantação

## Desenvolvimento

```bash
npm install
npm run dev
```

## Produção recomendada

1. Criar projeto Supabase.
2. Executar `supabase/schema.sql`.
3. Configurar variáveis do `.env.example`.
4. Testar RLS.
5. Configurar provedor de IA no backend.
6. Fazer deploy em plataforma compatível com Next.js.
7. Habilitar PWA e testar instalação no Android.

## Variáveis

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente servidor, se realmente necessário)
- `AI_PROVIDER`
- `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`

Nunca exponha chaves secretas no frontend.
