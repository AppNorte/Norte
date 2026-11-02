-- NORTE — configuração da nuvem (cole tudo no Supabase: SQL Editor → New query → Run)
-- Guarda o estado do app de cada usuário em JSONB. Só o próprio usuário lê e escreve.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;
drop policy if exists "app_state_delete_own" on public.app_state;

create policy "app_state_select_own" on public.app_state for select using (auth.uid() = user_id);
create policy "app_state_insert_own" on public.app_state for insert with check (auth.uid() = user_id);
create policy "app_state_update_own" on public.app_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app_state_delete_own" on public.app_state for delete using (auth.uid() = user_id);
