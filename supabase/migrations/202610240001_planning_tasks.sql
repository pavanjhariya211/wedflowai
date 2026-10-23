-- Phase 3 core: explicit task planning; no implicit dates, sharing or generation.
create table public.planning_tasks (
 id uuid primary key, wedding_id uuid not null references public.weddings(id) on delete cascade,
 workspace_id uuid not null, title text not null check(length(btrim(title)) between 1 and 160),
 category text not null check(length(btrim(category)) between 1 and 80),
 notes text not null default '' check(length(notes)<=4000),
 planned_start date, due_date date, status text not null default 'not_started'
 check(status in ('not_started','in_progress','blocked','completed','cancelled','archived')),
 priority text not null default 'normal' check(priority in ('low','normal','high')),
 owner_id uuid not null references public.profiles(id), personal boolean not null default false,
 created_by uuid not null references public.profiles(id), template_key text check(length(template_key)<=80),
 date_kind text not null default 'planned' check(date_kind in ('planned','confirmed')),
 version integer not null default 1, created_at timestamptz not null default now(),
 foreign key(workspace_id,wedding_id) references public.workspaces(id,wedding_id),
 check(planned_start is null or due_date is null or due_date>=planned_start)
);
create index on public.planning_tasks(wedding_id,due_date);
create unique index planning_template_once on public.planning_tasks(workspace_id,
 (case when personal then created_by else '00000000-0000-0000-0000-000000000000'::uuid end),template_key)
 where template_key is not null;
create table public.task_ceremonies (
 task_id uuid not null references public.planning_tasks(id) on delete cascade,
 ceremony_id uuid not null references public.ceremonies(id) on delete cascade,
 primary key(task_id,ceremony_id)
);
create table public.task_history (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.planning_tasks(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), old_values jsonb, new_values jsonb,
 created_at timestamptz not null default now()
);
create function public.wf_task_read(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.planning_tasks t where t.id=p_id and public.wf_can_read(t.workspace_id)
 and (not t.personal or t.owner_id=auth.uid()));
$$;
create function public.wf_task_save(p_task jsonb,p_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
 declare old public.planning_tasks; next public.planning_tasks; cid uuid; target uuid;
 begin
 target:=(p_task->>'workspace_id')::uuid;
 -- Membership mutation functions lock this same workspace row.
 perform 1 from public.workspaces where id=target for update;
 if auth.uid() is null or not public.wf_can_edit(target) then raise exception 'Access denied' using errcode='42501'; end if;
 select * into old from public.planning_tasks where id=(p_task->>'id')::uuid for update;
 if found then
  if not public.wf_task_read(old.id) or old.workspace_id<>target then raise exception 'Access denied' using errcode='42501'; end if;
  if p_version is null or old.version<>p_version then raise exception 'Refresh first' using errcode='40001'; end if;
 elsif p_version is not null then raise exception 'Task no longer exists' using errcode='40001'; end if;
 select s.wedding_id into next.wedding_id from public.workspaces s where s.id=target;
 next.id:=(p_task->>'id')::uuid; next.workspace_id:=target;
 next.title:=btrim(p_task->>'title'); next.category:=btrim(p_task->>'category');
 next.notes:=coalesce(p_task->>'notes',''); next.planned_start:=nullif(p_task->>'planned_start','')::date;
 next.due_date:=nullif(p_task->>'due_date','')::date; next.owner_id:=(p_task->>'owner_id')::uuid;
 next.personal:=coalesce((p_task->>'personal')::boolean,false);
 next.status:=coalesce(p_task->>'status','not_started'); next.priority:=coalesce(p_task->>'priority','normal');
 next.date_kind:=coalesce(p_task->>'date_kind','planned');
 next.template_key:=coalesce(old.template_key,nullif(p_task->>'template_key',''));
 next.created_by:=coalesce(old.created_by,auth.uid()); next.version:=coalesce(old.version,0)+1; next.created_at:=coalesce(old.created_at,now());
 -- Existing visibility cannot silently change through an edit.
 if old.id is not null and old.personal<>next.personal then raise exception 'Visibility cannot change through edit' using errcode='23514'; end if;
 if next.personal and next.owner_id<>auth.uid() then raise exception 'Personal tasks belong to you' using errcode='42501'; end if;
 if not exists(select 1 from public.wedding_memberships where wedding_id=next.wedding_id and user_id=next.owner_id)
 or not exists(select 1 from public.workspace_memberships m join public.workspaces s on s.id=m.workspace_id
 where m.user_id=next.owner_id and m.role in ('admin','member') and s.wedding_id=next.wedding_id
 and (s.id=target or exists(select 1 from public.workspaces where id=target and kind='shared')))
 then raise exception 'Choose an accepted editor in this workspace' using errcode='23514'; end if;
 if jsonb_typeof(coalesce(p_task->'ceremony_ids','[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_task->'ceremony_ids','[]'::jsonb))>50
 then raise exception 'Invalid ceremony list' using errcode='23514'; end if;
 for cid in select value::uuid from jsonb_array_elements_text(coalesce(p_task->'ceremony_ids','[]'::jsonb)) loop
  if not exists(select 1 from public.ceremonies where id=cid and wedding_id=next.wedding_id and workspace_id=target and public.wf_can_read(workspace_id))
  then raise exception 'Choose a ceremony in the same visibility scope' using errcode='42501'; end if;
 end loop;
 insert into public.planning_tasks select (next).* on conflict(id) do update set
 title=excluded.title,category=excluded.category,notes=excluded.notes,planned_start=excluded.planned_start,due_date=excluded.due_date,
 status=excluded.status,priority=excluded.priority,owner_id=excluded.owner_id,date_kind=excluded.date_kind,version=excluded.version;
 delete from public.task_ceremonies where task_id=next.id;
 insert into public.task_ceremonies(task_id,ceremony_id) select next.id,value::uuid
 from jsonb_array_elements_text(coalesce(p_task->'ceremony_ids','[]'::jsonb)) on conflict do nothing;
 insert into public.task_history(task_id,actor_id,old_values,new_values)
 values(next.id,auth.uid(),case when old.id is null then null else to_jsonb(old) end,to_jsonb(next));
 return next.id;
 end;
$$;
-- Apply a reviewed preview atomically, and safely accept the same request retry.
create function public.wf_task_plan(p_tasks jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare item jsonb; existing public.planning_tasks;
 begin
 if jsonb_typeof(p_tasks)<>'array' or jsonb_array_length(p_tasks) not between 1 and 60
 then raise exception 'Select 1 to 60 tasks' using errcode='23514'; end if;
 for item in select value from jsonb_array_elements(p_tasks) order by value->>'workspace_id',value->>'id' loop
  perform pg_advisory_xact_lock(hashtextextended(item->>'id',0));
  select * into existing from public.planning_tasks where id=(item->>'id')::uuid;
  if found then
   if existing.created_by<>auth.uid() or not public.wf_task_read(existing.id) or not public.wf_can_edit(existing.workspace_id)
   then raise exception 'Access denied' using errcode='42501'; end if;
  else perform public.wf_task_save(item,null); end if;
 end loop;
 end;
$$;
alter table public.planning_tasks enable row level security;
alter table public.task_ceremonies enable row level security;
alter table public.task_history enable row level security;
create policy planning_read on public.planning_tasks for select to authenticated
 using(public.wf_can_read(workspace_id) and (not personal or owner_id=auth.uid()));
create policy task_ceremony_read on public.task_ceremonies for select to authenticated
 using(public.wf_task_read(task_id) and exists(select 1 from public.ceremonies c where c.id=ceremony_id and public.wf_can_read(c.workspace_id)));
create policy task_history_read on public.task_history for select to authenticated using(public.wf_task_read(task_id));
revoke all on public.planning_tasks,public.task_ceremonies,public.task_history from public,anon,authenticated;
grant select on public.planning_tasks,public.task_ceremonies,public.task_history to authenticated;
revoke all on function public.wf_task_read(uuid),public.wf_task_save(jsonb,integer),public.wf_task_plan(jsonb) from public,anon;
grant execute on function public.wf_task_read(uuid),public.wf_task_save(jsonb,integer),public.wf_task_plan(jsonb) to authenticated;
