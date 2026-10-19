create function public.wf_unshare_ceremony(p_id uuid,p_version integer,p_workspace uuid) returns void
language plpgsql security definer set search_path='' as $$
 declare c public.ceremonies;
 begin
 select * into c from public.ceremonies where id=p_id for update;
 if not found or not public.wf_can_read(c.workspace_id) or
 not (c.created_by=auth.uid() or public.wf_admin(c.wedding_id)) or not public.wf_can_manage(p_workspace)
 then raise exception 'Access denied' using errcode='42501'; end if;
 if c.version<>p_version then raise exception 'This ceremony changed. Refresh first.' using errcode='40001'; end if;
 if not exists(select 1 from public.workspaces where id=c.workspace_id and kind='shared') or
 not exists(select 1 from public.workspaces where id=p_workspace and wedding_id=c.wedding_id and kind='family')
 then raise exception 'Select your permitted family workspace' using errcode='23514'; end if;
 update public.ceremonies set workspace_id=p_workspace,version=version+1 where id=p_id;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(c.wedding_id,c.workspace_id,auth.uid(),'ceremony_access_removed',p_id),
 (c.wedding_id,p_workspace,auth.uid(),'ceremony_made_family_only',p_id);
 end;
$$;
revoke all on function public.wf_unshare_ceremony(uuid,integer,uuid) from public,anon;
grant execute on function public.wf_unshare_ceremony(uuid,integer,uuid) to authenticated;
