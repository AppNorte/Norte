-- NORTE — limite diário do Conselheiro com IA (só o servidor lê e escreve: RLS ligado e sem políticas).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
