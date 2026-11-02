create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  sleep_time time,
  wake_time_current time,
  wake_time_goal time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('morning','evening')),
  title text not null,
  time_of_day time,
  sort_order int not null default 0,
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  active boolean not null default true
);

create table if not exists routine_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_template_id uuid not null references routine_templates(id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  unique(user_id, routine_template_id, date)
);

create table if not exists priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  sort_order int not null default 0,
  status text not null default 'pending' check(status in ('pending','done','skipped'))
);

create table if not exists bible_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  book text not null,
  total_units int not null,
  current_unit int not null default 1,
  active boolean not null default true
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  total_pages int,
  current_page int not null default 0,
  pages_per_day int not null default 10,
  status text not null default 'queued' check(status in ('current','queued','completed'))
);

create unique index if not exists one_current_book_per_user on books(user_id) where status='current';

create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check(source_type in ('bible','book','free')),
  source_id uuid,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text not null,
  sort_order int not null default 0
);

create table if not exists family_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_member_id uuid references family_members(id) on delete set null,
  title text not null,
  notes text,
  planned_at timestamptz,
  occurred_at timestamptz,
  status text not null default 'planned' check(status in ('planned','completed','cancelled'))
);

create table if not exists agenda_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  category text,
  status text not null default 'pending' check(status in ('pending','done','cancelled'))
);

create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('user','assistant','tool')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists assistant_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'proposed' check(status in ('proposed','confirmed','executed','rejected','failed')),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

alter table profiles enable row level security;
alter table routine_templates enable row level security;
alter table routine_completions enable row level security;
alter table priorities enable row level security;
alter table bible_plans enable row level security;
alter table books enable row level security;
alter table reflections enable row level security;
alter table family_members enable row level security;
alter table family_moments enable row level security;
alter table agenda_items enable row level security;
alter table assistant_messages enable row level security;
alter table assistant_actions enable row level security;

-- Simple owner policies
create policy "profiles_own" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "routine_templates_own" on routine_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routine_completions_own" on routine_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "priorities_own" on priorities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bible_plans_own" on bible_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books_own" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reflections_own" on reflections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "family_members_own" on family_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "family_moments_own" on family_moments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agenda_items_own" on agenda_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assistant_messages_own" on assistant_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assistant_actions_own" on assistant_actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- V1 — campos usados pelo app local (alinha com docs/DATABASE_SCHEMA.md)
-- ============================================================

create table if not exists bible_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bible_plan_id uuid not null references bible_plans(id) on delete cascade,
  unit_label text not null,
  date date not null,
  completed_at timestamptz
);
alter table bible_readings enable row level security;
create policy "bible_readings_own" on bible_readings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Registro diário de páginas lidas (permite desfazer e histórico do livro)
create table if not exists book_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  date date not null,
  from_page int not null,
  to_page int not null
);
alter table book_logs enable row level security;
create policy "book_logs_own" on book_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Preferências do onboarding e do plano progressivo
alter table profiles add column if not exists plan_start_date date;
alter table profiles add column if not exists focus_areas text[] not null default '{}';
alter table profiles add column if not exists header_phrase text;
alter table profiles add column if not exists show_verses boolean not null default true;
alter table profiles add column if not exists weekly_family_goal int not null default 3;

-- Ícone e tipo do item de rotina ("wake" = acordar)
alter table routine_templates add column if not exists icon text;
alter table routine_templates add column if not exists kind text not null default 'normal';

-- Categoria do momento em família (pessoa / família toda / espiritual)
alter table family_moments add column if not exists category text not null default 'person'
  check (category in ('person','family','spiritual'));
