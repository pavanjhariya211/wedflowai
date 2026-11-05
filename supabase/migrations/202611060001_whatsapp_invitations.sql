-- One-use, revocable WhatsApp invitations. Existing email invites remain valid.
alter table public.invitations alter column email drop not null;
alter table public.invitations add column channel text not null default 'email'
 check(channel in ('email','whatsapp'));
alter table public.invitations add column accepted_by uuid references public.profiles(id);
alter table public.invitations add constraint invitations_channel_recipient check(
 (channel='email' and email is not null) or (channel='whatsapp' and email is null));
grant select(channel) on public.invitations to authenticated;

create function public.wf_invite_whatsapp(p_workspace uuid,p_role text) returns text
language plpgsql security definer set search_path='' as $$
 declare token text; s public.workspaces;
 begin
 select * into s from public.workspaces where id=p_workspace for update;
 if not found or auth.uid() is null then raise exception 'Access denied' using errcode='42501'; end if;
 if p_role is null or p_role not in ('admin','member','viewer') then raise exception 'Invalid invitation role' using errcode='23514'; end if;
 if not public.wf_can_manage(p_workspace) and not (public.wf_admin(s.wedding_id) and s.kind='family' and p_role='admin'
 and not exists(select 1 from public.workspace_memberships where workspace_id=p_workspace))
 then raise exception 'Access denied' using errcode='42501'; end if;
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
 insert into public.invitations(workspace_id,email,role,channel,token_hash,created_by)
 values(p_workspace,null,p_role,'whatsapp',encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(s.wedding_id,s.id,auth.uid(),'whatsapp_invitation_created',s.id);
 return token;
 end;
$$;
revoke all on function public.wf_invite_whatsapp(uuid,text) from public,anon;
grant execute on function public.wf_invite_whatsapp(uuid,text) to authenticated;

create or replace function public.wf_accept_invite(p_token text,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
 declare i public.invitations; wid uuid; sid uuid;
 begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select workspace_id into sid from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 perform 1 from public.workspaces where id=sid for update;
 select * into i from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or i.revoked_at is not null or i.expires_at<=now()
 or (i.channel='email' and i.email<>lower(coalesce(auth.jwt()->>'email','')))
 then raise exception 'Invitation is invalid, expired or unavailable' using errcode='42501'; end if;
 select wedding_id into wid from public.workspaces where id=i.workspace_id for update;
 if i.accepted_at is not null then
  if (i.channel='email' or i.accepted_by=auth.uid()) and exists(
   select 1 from public.workspace_memberships where workspace_id=i.workspace_id and user_id=auth.uid()) then return wid; end if;
  raise exception 'Invitation already used' using errcode='42501';
 end if;
 perform public.wf_profile(p_name);
 insert into public.wedding_memberships values(wid,auth.uid(),'member') on conflict do nothing;
 insert into public.workspace_memberships values(i.workspace_id,auth.uid(),i.role) on conflict do nothing;
 update public.invitations set accepted_at=now(),accepted_by=auth.uid() where id=i.id;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(wid,i.workspace_id,auth.uid(),'invitation_accepted',i.id);
 return wid;
 end;
$$;
