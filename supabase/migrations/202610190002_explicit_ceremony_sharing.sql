-- Explicit family-admin sharing preserves the canonical ceremony ID.
create unique index workspaces_one_shared_per_wedding on public.workspaces(wedding_id) where kind='shared';
create function public.wf_share_ceremony(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path='' as $$
 declare c public.ceremonies; shared_id uuid;
 begin
 select * into c from public.ceremonies where id=p_id for update;
 if not found or not public.wf_can_manage(c.workspace_id)
 then raise exception 'Only this family workspace admin can share its ceremony' using errcode='42501'; end if;
 if c.version<>p_version then raise exception 'This ceremony changed. Refresh first.' using errcode='40001'; end if;
 if not exists(select 1 from public.workspaces where id=c.workspace_id and kind='family')
 then raise exception 'Ceremony is already shared' using errcode='23514'; end if;
 select id into shared_id from public.workspaces where wedding_id=c.wedding_id and kind='shared';
 if shared_id is null or not public.wf_can_edit(shared_id) then raise exception 'Access denied' using errcode='42501'; end if;
 update public.ceremonies set workspace_id=shared_id,version=version+1 where id=p_id;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(c.wedding_id,shared_id,auth.uid(),'ceremony_shared',p_id);
 end;
$$;
revoke all on function public.wf_share_ceremony(uuid,integer) from public,anon;
grant execute on function public.wf_share_ceremony(uuid,integer) to authenticated;
