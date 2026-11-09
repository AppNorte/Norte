-- NORTE — avisos no celular (Web Push). Rode depois do setup.sql.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  keys jsonb not null,
  prefs jsonb not null default '{}'::jsonb,
  tz text not null default 'America/Sao_Paulo',
  last_sent date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_own_all" on public.push_subscriptions;
create policy "push_own_all" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create extension if not exists pg_cron;
create extension if not exists pg_net;
-- O agendamento (cron.schedule) é criado à parte, com o segredo CRON_SECRET (não fica no repositório):
-- select cron.schedule('norte-notify', '*/15 * * * *', $$ select net.http_post(
--   url := 'https://<ref>.supabase.co/functions/v1/notify',
--   headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
--   body := '{}'::jsonb) $$);
