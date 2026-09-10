-- ============================================================
-- LightFocus — login por e-mail/senha
-- Rode este SQL no SQL Editor do seu projeto Supabase DEPOIS do schema.sql.
-- Ele liga cada tarefa a um usuário e fecha o acesso público.
-- ============================================================

-- 1) Coluna de dono nas tarefas
alter table public.tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists tasks_user_id_idx on public.tasks(user_id);

-- Se você já tinha tarefas sem dono, escolha uma das opções:
--   a) apagar: delete from public.tasks where user_id is null;
--   b) adotar (troque pelo seu id de usuário):
--      update public.tasks set user_id = 'SEU-USER-ID' where user_id is null;

-- 2) Tarefas: só o dono vê e altera
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;

drop policy if exists "tasks acesso publico" on public.tasks;
drop policy if exists "tasks do usuario" on public.tasks;
create policy "tasks do usuario"
on public.tasks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 3) Passos: seguem o dono da tarefa
revoke all on public.task_steps from anon;
grant select, insert, update, delete on public.task_steps to authenticated;

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

-- 4) Check-ins (opcional): também por usuário
alter table public.check_ins
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists check_ins_user_created_at_idx
  on public.check_ins(user_id, created_at desc);

revoke all on public.check_ins from anon;
grant select, insert, update, delete on public.check_ins to authenticated;
grant all on public.check_ins to service_role;

drop policy if exists "check_ins acesso publico" on public.check_ins;
drop policy if exists "check_ins do usuario" on public.check_ins;
create policy "check_ins do usuario"
on public.check_ins for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
