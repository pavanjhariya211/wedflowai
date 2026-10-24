-- AI attempts contain no brief, wedding data, model output or credentials.
create table public.planner_ai_attempts (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index on public.planner_ai_attempts(user_id,created_at);
alter table public.planner_ai_attempts enable row level security;
revoke all on public.planner_ai_attempts from public,anon,authenticated;
create function public.wf_claim_planner_ai(p_wedding uuid,p_workspace uuid) returns void
language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null or not public.wf_can_edit(p_workspace) or not exists(
 select 1 from public.workspaces where id=p_workspace and wedding_id=p_wedding)
 then raise exception 'Access denied' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,194));
 delete from public.planner_ai_attempts where user_id=auth.uid() and created_at<now()-interval '2 days';
 if exists(select 1 from public.planner_ai_attempts where user_id=auth.uid() and created_at>now()-interval '30 seconds')
 or (select count(*) from public.planner_ai_attempts where user_id=auth.uid() and created_at>now()-interval '1 day')>=20
 then raise exception 'Please try later' using errcode='54000'; end if;
 insert into public.planner_ai_attempts(user_id) values(auth.uid());
 end;
$$;
revoke all on function public.wf_claim_planner_ai(uuid,uuid) from public,anon;
grant execute on function public.wf_claim_planner_ai(uuid,uuid) to authenticated;
