-- Phase 2: additive development schema. All writes use validated transactional RPCs.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(btrim(display_name)) between 1 and 80)
);
create table public.weddings (
 id uuid primary key, title text not null check(length(btrim(title)) between 1 and 120),
 main_date date not null, planning_start date not null, city text check(length(city)<=120),
 budget_paise bigint check(budget_paise between 0 and 999999999999),
 sharing_mode text not null check(sharing_mode in ('shared','separate')),
 format text not null check(format in ('single','multi')),
 timezone text not null default 'Asia/Kolkata' check(timezone='Asia/Kolkata'),
 creator_id uuid not null references public.profiles(id),
 version integer not null default 1, created_at timestamptz not null default now(),
 check(planning_start<=main_date)
);
create table public.wedding_memberships (
 wedding_id uuid references public.weddings(id) on delete cascade,
 user_id uuid references public.profiles(id), role text not null check(role in ('admin','member')),
 primary key(wedding_id,user_id)
);
create table public.workspaces (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 80), kind text not null check(kind in ('shared','family')),
 unique(id,wedding_id)
);
create table public.workspace_memberships (
 workspace_id uuid references public.workspaces(id) on delete cascade,
 user_id uuid references public.profiles(id), role text not null check(role in ('admin','member','viewer')),
 primary key(workspace_id,user_id)
);
create table public.ceremonies (
 id uuid primary key, wedding_id uuid not null references public.weddings(id) on delete cascade,
 workspace_id uuid not null, title text not null check(length(btrim(title)) between 1 and 120),
 start_date date not null, end_date date not null, all_day boolean not null default true,
 starts_at timestamptz, ends_at timestamptz, venue text check(length(venue)<=180),
 version integer not null default 1, created_by uuid not null references public.profiles(id),
 foreign key(workspace_id,wedding_id) references public.workspaces(id,wedding_id),
 check(end_date>=start_date),
 check((all_day and starts_at is null and ends_at is null) or
       (not all_day and starts_at is not null and ends_at is not null and ends_at>=starts_at
        and (starts_at at time zone 'Asia/Kolkata')::date=start_date
        and (ends_at at time zone 'Asia/Kolkata')::date=end_date))
);
create table public.invitations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 email text not null check(length(email)<=254 and email like '%_@_%._%'),
 role text not null check(role in ('admin','member','viewer')),
 token_hash text not null unique, created_by uuid not null references public.profiles(id),
 expires_at timestamptz not null default (now()+interval '7 days'),
 accepted_at timestamptz, revoked_at timestamptz
);
create table public.activity_events (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), action text not null, entity_id uuid not null,
 created_at timestamptz not null default now()
);
create index on public.wedding_memberships(user_id);
create index on public.workspace_memberships(user_id);
create index on public.workspaces(wedding_id);
create index on public.ceremonies(wedding_id,start_date);
create index on public.invitations(workspace_id);
create index on public.activity_events(wedding_id,created_at);

create function public.wf_member(wid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.wedding_memberships where wedding_id=wid and user_id=auth.uid());
$$;
create function public.wf_admin(wid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.wedding_memberships where wedding_id=wid and user_id=auth.uid() and role='admin');
$$;
create function public.wf_can_read(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspaces s where s.id=sid and public.wf_member(s.wedding_id)
 and (s.kind='shared' or exists(select 1 from public.workspace_memberships m where m.workspace_id=sid and m.user_id=auth.uid())));
$$;
create function public.wf_can_edit(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspaces s where s.id=sid and public.wf_member(s.wedding_id) and (
 exists(select 1 from public.workspace_memberships m where m.workspace_id=sid and m.user_id=auth.uid() and m.role in ('admin','member'))
 or (s.kind='shared' and (public.wf_admin(s.wedding_id) or exists(
 select 1 from public.workspace_memberships m join public.workspaces w on w.id=m.workspace_id
 where w.wedding_id=s.wedding_id and m.user_id=auth.uid() and m.role in ('admin','member'))))));
$$;
create function public.wf_can_manage(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspaces s where s.id=sid and public.wf_member(s.wedding_id) and (
 (s.kind='shared' and public.wf_admin(s.wedding_id)) or exists(
 select 1 from public.workspace_memberships m where m.workspace_id=sid and m.user_id=auth.uid() and m.role='admin')));
$$;
create function public.wf_profile(p_name text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.profiles(id,display_name) values(auth.uid(),btrim(p_name))
 on conflict(id) do update set display_name=excluded.display_name;
 end;
$$;
create function public.wf_create_wedding(p_id uuid,p_title text,p_date date,p_start date,p_city text,
 p_budget bigint,p_mode text,p_format text,p_name text,p_family_a text default 'Family A',p_family_b text default 'Family B')
 returns uuid language plpgsql security definer set search_path='' as $$
 declare shared_id uuid; family_id uuid;
 begin
 perform public.wf_profile(p_name);
 -- Serialize idempotent retries with the same client-generated ID.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from public.weddings where id=p_id) then
  if not exists(select 1 from public.weddings where id=p_id and creator_id=auth.uid()) then
   raise exception 'Access denied' using errcode='42501'; end if;
  return p_id;
 end if;
 insert into public.weddings(id,title,main_date,planning_start,city,budget_paise,sharing_mode,format,creator_id)
 values(p_id,btrim(p_title),p_date,p_start,nullif(btrim(p_city),''),p_budget,p_mode,p_format,auth.uid());
 insert into public.wedding_memberships values(p_id,auth.uid(),'admin');
 insert into public.workspaces(wedding_id,name,kind) values(p_id,'Shared wedding overview','shared') returning id into shared_id;
 if p_mode='shared' then
  insert into public.workspace_memberships values(shared_id,auth.uid(),'admin');
 else
  insert into public.workspaces(wedding_id,name,kind) values(p_id,btrim(p_family_a),'family') returning id into family_id;
  insert into public.workspace_memberships values(family_id,auth.uid(),'admin');
  insert into public.workspaces(wedding_id,name,kind) values(p_id,btrim(p_family_b),'family');
 end if;
 insert into public.activity_events(wedding_id,actor_id,action,entity_id) values(p_id,auth.uid(),'wedding_created',p_id);
 return p_id;
 end;
$$;
create function public.wf_update_wedding(p_id uuid,p_version integer,p_title text,p_date date,p_start date,p_city text,p_budget bigint,p_format text)
 returns void language plpgsql security definer set search_path='' as $$
 begin
 if not public.wf_admin(p_id) then raise exception 'Access denied' using errcode='42501'; end if;
 update public.weddings set title=btrim(p_title),main_date=p_date,planning_start=p_start,
 city=nullif(btrim(p_city),''),budget_paise=p_budget,format=p_format,version=version+1 where id=p_id and version=p_version;
 if not found then raise exception 'This wedding changed. Refresh before saving.' using errcode='40001'; end if;
 insert into public.activity_events(wedding_id,actor_id,action,entity_id) values(p_id,auth.uid(),'wedding_updated',p_id);
 end;
$$;
create function public.wf_save_ceremony(p_id uuid,p_wedding uuid,p_workspace uuid,p_title text,p_start date,p_end date,
 p_all_day boolean,p_starts_at timestamptz,p_ends_at timestamptz,p_venue text,p_version integer default null)
 returns void language plpgsql security definer set search_path='' as $$
 declare old_scope uuid;
 begin
 if not public.wf_can_edit(p_workspace) or not exists(select 1 from public.workspaces where id=p_workspace and wedding_id=p_wedding)
 then raise exception 'Access denied' using errcode='42501'; end if;
 if p_version is null then
  insert into public.ceremonies(id,wedding_id,workspace_id,title,start_date,end_date,all_day,starts_at,ends_at,venue,created_by)
  values(p_id,p_wedding,p_workspace,btrim(p_title),p_start,p_end,p_all_day,p_starts_at,p_ends_at,nullif(btrim(p_venue),''),auth.uid());
 else
  select workspace_id into old_scope from public.ceremonies where id=p_id and wedding_id=p_wedding for update;
  if old_scope is null or not public.wf_can_edit(old_scope) then raise exception 'Access denied' using errcode='42501'; end if;
  -- Visibility cannot be broadened implicitly by an ordinary edit.
  if old_scope<>p_workspace then raise exception 'Create a separate explicitly shared ceremony instead'; end if;
  update public.ceremonies set title=btrim(p_title),start_date=p_start,end_date=p_end,all_day=p_all_day,
  starts_at=p_starts_at,ends_at=p_ends_at,venue=nullif(btrim(p_venue),''),version=version+1 where id=p_id and version=p_version;
  if not found then raise exception 'This ceremony changed. Refresh before saving.' using errcode='40001'; end if;
 end if;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(p_wedding,p_workspace,auth.uid(),'ceremony_saved',p_id);
 end;
$$;
create function public.wf_delete_ceremony(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
 declare c public.ceremonies;
 begin
 select * into c from public.ceremonies where id=p_id for update;
 if not found or not public.wf_can_edit(c.workspace_id) then raise exception 'Access denied' using errcode='42501'; end if;
 if c.version<>p_version then raise exception 'This ceremony changed. Refresh first.' using errcode='40001'; end if;
 delete from public.ceremonies where id=p_id;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(c.wedding_id,c.workspace_id,auth.uid(),'ceremony_deleted',p_id);
 end;
$$;
create function public.wf_invite(p_workspace uuid,p_email text,p_role text) returns text language plpgsql security definer set search_path='' as $$
 declare token text; s public.workspaces;
 begin
 select * into s from public.workspaces where id=p_workspace for update;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 -- Wedding creator can bootstrap an empty family's FIRST admin, without access to its contents.
 if not public.wf_can_manage(p_workspace) and not (public.wf_admin(s.wedding_id) and s.kind='family' and p_role='admin'
 and not exists(select 1 from public.workspace_memberships where workspace_id=p_workspace))
 then raise exception 'Access denied' using errcode='42501'; end if;
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
 insert into public.invitations(workspace_id,email,role,token_hash,created_by)
 values(p_workspace,lower(btrim(p_email)),p_role,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(s.wedding_id,s.id,auth.uid(),'invitation_created',s.id);
 return token;
 end;
$$;
create function public.wf_accept_invite(p_token text,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
 declare i public.invitations; wid uuid; sid uuid;
 begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select workspace_id into sid from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 perform 1 from public.workspaces where id=sid for update;
 select * into i from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or i.revoked_at is not null or i.expires_at<=now() or i.email<>lower(coalesce(auth.jwt()->>'email',''))
 then raise exception 'Invitation is invalid, expired or belongs to another email' using errcode='42501'; end if;
 select wedding_id into wid from public.workspaces where id=i.workspace_id for update;
 if i.accepted_at is not null then
  if exists(select 1 from public.workspace_memberships where workspace_id=i.workspace_id and user_id=auth.uid()) then return wid; end if;
  raise exception 'Invitation already used' using errcode='42501';
 end if;
 perform public.wf_profile(p_name);
 insert into public.wedding_memberships values(wid,auth.uid(),'member') on conflict do nothing;
 insert into public.workspace_memberships values(i.workspace_id,auth.uid(),i.role)
 on conflict(workspace_id,user_id) do nothing;
 update public.invitations set accepted_at=now() where id=i.id;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(wid,i.workspace_id,auth.uid(),'invitation_accepted',i.id);
 return wid;
 end;
$$;
create function public.wf_revoke_invite(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
 declare i public.invitations; sid uuid;
 begin
 select workspace_id into sid from public.invitations where id=p_id;
 perform 1 from public.workspaces where id=sid for update;
 select * into i from public.invitations where id=p_id for update;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 -- Lock the workspace before checking authority, matching membership mutations.
 perform 1 from public.workspaces where id=i.workspace_id for update;
 if not public.wf_can_manage(i.workspace_id) and not (i.created_by=auth.uid() and public.wf_admin((select wedding_id from public.workspaces where id=i.workspace_id))) then raise exception 'Access denied' using errcode='42501'; end if;
 update public.invitations set revoked_at=now() where id=p_id;
 end;
$$;
create function public.wf_change_member(p_workspace uuid,p_user uuid,p_role text default null)
 returns void language plpgsql security definer set search_path='' as $$
 declare wid uuid; old_role text;
 begin
 select wedding_id into wid from public.workspaces where id=p_workspace for update;
 if wid is null or not public.wf_member(wid) then raise exception 'Access denied' using errcode='42501'; end if;
 if not public.wf_can_manage(p_workspace) and not (p_user=auth.uid() and p_role is null)
 then raise exception 'Access denied' using errcode='42501'; end if;
 select role into old_role from public.workspace_memberships where workspace_id=p_workspace and user_id=p_user;
 if old_role is null then raise exception 'Membership no longer exists' using errcode='40001'; end if;
 if old_role='admin' and coalesce(p_role,'')<>'admin' and not exists(
 select 1 from public.workspace_memberships where workspace_id=p_workspace and user_id<>p_user and role='admin')
 then raise exception 'Keep at least one workspace admin' using errcode='23514'; end if;
 if p_role is null then
  delete from public.workspace_memberships where workspace_id=p_workspace and user_id=p_user;
  -- Revoke unaccepted invitations for the removed account to prevent re-entry.
  update public.invitations set revoked_at=now() where workspace_id=p_workspace and accepted_at is null
    and email=(select lower(email) from auth.users where id=p_user);
  if not exists(select 1 from public.workspace_memberships m join public.workspaces s on s.id=m.workspace_id
   where m.user_id=p_user and s.wedding_id=wid) then
    delete from public.wedding_memberships where wedding_id=wid and user_id=p_user and role<>'admin';
  end if;
 else
  update public.workspace_memberships set role=p_role where workspace_id=p_workspace and user_id=p_user;
 end if;
 insert into public.activity_events(wedding_id,workspace_id,actor_id,action,entity_id)
 values(wid,p_workspace,auth.uid(),'membership_changed',p_user);
 end;
$$;
create function public.wf_workspace_access(p_wedding uuid)
 returns table(id uuid,name text,kind text,can_edit boolean,can_manage boolean,bootstrap boolean)
 language sql stable security definer set search_path='' as $$
 select s.id,s.name,s.kind,public.wf_can_edit(s.id),public.wf_can_manage(s.id),
 (s.kind='family' and public.wf_admin(s.wedding_id) and not exists(select 1 from public.workspace_memberships where workspace_id=s.id))
 from public.workspaces s where s.wedding_id=p_wedding and public.wf_member(p_wedding) order by s.kind desc,s.name;
$$;

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.ceremonies enable row level security;
alter table public.invitations enable row level security;
alter table public.activity_events enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or exists(
 select 1 from public.wedding_memberships m where m.user_id=profiles.id and public.wf_member(m.wedding_id)));
create policy wedding_read on public.weddings for select to authenticated using(public.wf_member(id));
create policy wedding_members_read on public.wedding_memberships for select to authenticated using(public.wf_member(wedding_id));
-- Names identify sharing destinations; reading workspace metadata never grants its contents.
create policy workspace_names on public.workspaces for select to authenticated using(public.wf_member(wedding_id));
create policy workspace_members_read on public.workspace_memberships for select to authenticated using(public.wf_can_read(workspace_id));
create policy ceremony_read on public.ceremonies for select to authenticated using(public.wf_can_read(workspace_id));
create policy invite_read on public.invitations for select to authenticated using(public.wf_can_manage(workspace_id) or (created_by=auth.uid() and public.wf_admin((select wedding_id from public.workspaces where id=workspace_id))));
create policy activity_read on public.activity_events for select to authenticated using(public.wf_member(wedding_id) and
 (workspace_id is null or public.wf_can_read(workspace_id)));
revoke all on public.profiles,public.weddings,public.wedding_memberships,public.workspaces,
 public.workspace_memberships,public.ceremonies,public.invitations,public.activity_events from anon,authenticated;
grant select on public.profiles,public.weddings,public.wedding_memberships,public.workspaces,
 public.workspace_memberships,public.ceremonies,public.activity_events to authenticated;
grant select(id,workspace_id,email,role,created_by,expires_at,accepted_at,revoked_at) on public.invitations to authenticated;
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'wf\_%' escape '\' loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
