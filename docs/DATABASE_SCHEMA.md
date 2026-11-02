# NORTE — Modelo de Dados

## Entidades

### profiles
- id UUID PK
- display_name text
- sleep_time time
- wake_time_current time
- wake_time_goal time
- created_at timestamptz
- updated_at timestamptz

### routine_templates
- id UUID PK
- user_id UUID FK
- period enum(morning, evening)
- title text
- time_of_day time nullable
- sort_order int
- days_of_week int[]
- active boolean

### routine_completions
- id UUID PK
- user_id UUID FK
- routine_template_id UUID FK
- date date
- completed_at timestamptz

### priorities
- id UUID PK
- user_id UUID FK
- title text
- date date
- sort_order int
- status enum(pending, done, skipped)

### bible_plans
- id UUID PK
- user_id UUID FK
- title text
- book text
- total_units int
- current_unit int
- active boolean

### bible_readings
- id UUID PK
- user_id UUID FK
- bible_plan_id UUID FK
- unit_label text
- date date
- completed_at timestamptz nullable

### books
- id UUID PK
- user_id UUID FK
- title text
- author text nullable
- total_pages int nullable
- current_page int default 0
- pages_per_day int default 10
- status enum(current, queued, completed)

### reflections
- id UUID PK
- user_id UUID FK
- source_type enum(bible, book, free)
- source_id UUID nullable
- text text
- created_at timestamptz

### family_members
- id UUID PK
- user_id UUID FK
- name text
- relationship text
- sort_order int

### family_moments
- id UUID PK
- user_id UUID FK
- family_member_id UUID nullable
- title text
- notes text nullable
- planned_at timestamptz nullable
- occurred_at timestamptz nullable
- status enum(planned, completed, cancelled)

### agenda_items
- id UUID PK
- user_id UUID FK
- title text
- start_at timestamptz nullable
- end_at timestamptz nullable
- category text
- status enum(pending, done, cancelled)

### assistant_messages
- id UUID PK
- user_id UUID FK
- role enum(user, assistant, tool)
- content text
- created_at timestamptz

### assistant_actions
- id UUID PK
- user_id UUID FK
- action_type text
- payload jsonb
- status enum(proposed, confirmed, executed, rejected, failed)
- created_at timestamptz
- executed_at timestamptz nullable

## Segurança

- RLS por `auth.uid()` em todas as tabelas pessoais.
- Chaves de IA nunca no cliente.
- Logs de ações de IA sem armazenar segredos.
