-- Keep family task links usable when a ceremony is shared; hide withdrawn links from broader task scopes.
create or replace function public.wf_task_save(p_task jsonb,p_version integer default null) returns uuid
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
  if not exists(select 1 from public.ceremonies where id=cid and wedding_id=next.wedding_id and (workspace_id=target or exists(select 1 from public.workspaces s where s.id=workspace_id and s.kind='shared')) and public.wf_can_read(workspace_id))
  then raise exception 'Choose a ceremony visible in this scope' using errcode='42501'; end if;
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

drop policy task_ceremony_read on public.task_ceremonies;
create policy task_ceremony_read on public.task_ceremonies for select to authenticated using(
 public.wf_task_read(task_id) and exists(
  select 1 from public.ceremonies c join public.workspaces s on s.id=c.workspace_id
  join public.planning_tasks t on t.id=task_id where c.id=ceremony_id and public.wf_can_read(c.workspace_id)
  and (c.workspace_id=t.workspace_id or s.kind='shared')));
