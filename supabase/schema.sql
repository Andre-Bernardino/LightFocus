-- ============================================================
-- LightFocus — schema para o Supabase
-- Rode este SQL no SQL Editor do seu projeto Supabase.
-- ============================================================

-- Enums do domínio
do $$ begin
  create type public.task_priority as enum ('baixa', 'media', 'alta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('pendente', 'em_andamento', 'concluida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_energy as enum ('baixa', 'media', 'alta');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Tabela: tasks
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority public.task_priority not null default 'media',
  status public.task_status not null default 'pendente',
  energy public.task_energy not null default 'media',
  estimated_minutes integer not null default 15 check (estimated_minutes between 1 and 480),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  due_at timestamptz,
  recurrence_series_id uuid not null,
  recurrence_frequency text not null default 'none' check (recurrence_frequency in ('none', 'weekly', 'monthly')),
  recurrence_weekdays integer[] not null default '{}',
  recurrence_day_of_month integer check (recurrence_day_of_month between 1 and 31)
);

grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

alter table public.tasks enable row level security;

drop policy if exists "tasks acesso publico" on public.tasks;
drop policy if exists "tasks do usuario" on public.tasks;
create policy "tasks do usuario"
on public.tasks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists tasks_user_created_at_idx
  on public.tasks(user_id, created_at desc);

-- ------------------------------------------------------------
-- Tabela: task_steps (micro-passos)
-- ------------------------------------------------------------
create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0
);

create index if not exists task_steps_task_id_idx on public.task_steps(task_id);

grant select, insert, update, delete on public.task_steps to authenticated;
grant all on public.task_steps to service_role;

alter table public.task_steps enable row level security;

drop policy if exists "task_steps acesso publico" on public.task_steps;
drop policy if exists "task_steps do usuario" on public.task_steps;
create policy "task_steps do usuario"
on public.task_steps for all
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_steps.task_id and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_steps.task_id and t.user_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- Tabela opcional: check_ins (histórico dos check-ins diários)
-- Hoje o app guarda o check-in no navegador; use esta tabela
-- se quiser histórico no banco.
-- ------------------------------------------------------------
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  energy public.task_energy not null,
  mood text not null,
  available_minutes integer not null,
  priorities text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.check_ins to authenticated;
grant all on public.check_ins to service_role;

alter table public.check_ins enable row level security;

drop policy if exists "check_ins acesso publico" on public.check_ins;
drop policy if exists "check_ins do usuario" on public.check_ins;
create policy "check_ins do usuario"
on public.check_ins for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists check_ins_user_created_at_idx
  on public.check_ins(user_id, created_at desc);
