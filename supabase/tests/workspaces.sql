set local plpgsql.check_asserts=on;
-- Runs under database.py's BEGIN/ROLLBACK. Synthetic accounts never send email.
insert into auth.users(id,email) values
 ('9b000000-0000-4000-8000-000000000001','owner-a@example.invalid'),
 ('9b000000-0000-4000-8000-000000000002','owner-b@example.invalid'),
 ('9b000000-0000-4000-8000-000000000003','viewer@example.invalid'),
 ('9b000000-0000-4000-8000-000000000004','outsider@example.invalid');
create temporary table wf_test_state(key text primary key,value text);
grant all on wf_test_state to authenticated;
create function pg_temp.expect_error(statement text, expected_code text) returns void language plpgsql as $$
 begin
 begin execute statement;
 exception when others then
  if sqlstate=expected_code then return; end if;
  raise exception 'Wrong error: %, expected %',sqlstate,expected_code;
 end;
 raise exception 'Expected error % but operation succeeded: %',expected_code,statement;
 end;
$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000001","email":"owner-a@example.invalid","role":"authenticated"}',true);
select public.wf_create_wedding('9b100000-0000-4000-8000-000000000001','Privacy test','2027-12-12','2026-10-19','Bhopal',100000,'separate','multi','Owner A');
-- Idempotent retry must not create a duplicate workspace set.
select public.wf_create_wedding('9b100000-0000-4000-8000-000000000001','Privacy test','2027-12-12','2026-10-19','Bhopal',100000,'separate','multi','Owner A');
insert into wf_test_state select 'a',id::text from public.workspaces where wedding_id='9b100000-0000-4000-8000-000000000001' and name='Family A';
insert into wf_test_state select 'b',id::text from public.workspaces where wedding_id='9b100000-0000-4000-8000-000000000001' and name='Family B';
insert into wf_test_state select 'shared',id::text from public.workspaces where wedding_id='9b100000-0000-4000-8000-000000000001' and kind='shared';
do $$ begin
 assert (select count(*)=3 from public.workspaces where wedding_id='9b100000-0000-4000-8000-000000000001'),'Idempotent separate setup';
 assert not public.wf_can_read((select value::uuid from wf_test_state where key='b')),'Admin cannot read other family';
end $$;
select public.wf_save_ceremony('9b200000-0000-4000-8000-000000000001','9b100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='a'),'Private A','2027-12-11','2027-12-11',true,null,null,'',null);
select public.wf_save_ceremony('9b200000-0000-4000-8000-000000000002','9b100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='shared'),'Shared reception','2027-12-12','2027-12-12',true,null,null,'',null);
insert into wf_test_state values('invite_b',public.wf_invite((select value::uuid from wf_test_state where key='b'),'owner-b@example.invalid','admin'));
insert into wf_test_state values('invite_viewer',public.wf_invite((select value::uuid from wf_test_state where key='a'),'viewer@example.invalid','viewer'));
insert into wf_test_state values('revoked',public.wf_invite((select value::uuid from wf_test_state where key='a'),'outsider@example.invalid','member'));
select public.wf_revoke_invite(id) from public.invitations where email='outsider@example.invalid';
insert into wf_test_state values('expired',public.wf_invite((select value::uuid from wf_test_state where key='a'),'outsider@example.invalid','member'));
reset role;
update public.invitations set expires_at=now()-interval '1 second' where token_hash=encode(sha256(convert_to((select value from wf_test_state where key='expired'),'UTF8')),'hex');
set local role authenticated;
-- Accepting an older invitation must not demote an existing last admin.
select public.wf_accept_invite(public.wf_invite((select value::uuid from wf_test_state where key='a'),'owner-a@example.invalid','viewer'),'Owner A');
do $$ begin assert (select role='admin' from public.workspace_memberships where workspace_id=(select value::uuid from wf_test_state where key='a') and user_id=auth.uid()),'Invite acceptance cannot demote an existing admin'; end $$;
select pg_temp.expect_error($q$update public.weddings set title='Unauthorized direct write'$q$,'42501');
select pg_temp.expect_error($q$select public.wf_change_member((select value::uuid from wf_test_state where key='a'),'9b000000-0000-4000-8000-000000000001',null)$q$,'23514');
select public.wf_update_wedding('9b100000-0000-4000-8000-000000000001',1,'Updated wedding','2027-12-12','2026-10-19','Bhopal',100000,'multi');
select pg_temp.expect_error($q$select public.wf_update_wedding('9b100000-0000-4000-8000-000000000001',1,'Stale edit','2027-12-12','2026-10-19','Bhopal',100000,'multi')$q$,'40001');

-- Another family has NO access before invitation acceptance.
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000002","email":"owner-b@example.invalid","role":"authenticated"}',true);
do $$ begin assert (select count(*)=0 from public.weddings where id='9b100000-0000-4000-8000-000000000001'),'No pre-acceptance access'; end $$;
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='invite_viewer'),'Wrong recipient')$q$,'42501');
select public.wf_accept_invite((select value from wf_test_state where key='invite_b'),'Owner B');
select public.wf_accept_invite((select value from wf_test_state where key='invite_b'),'Owner B');
do $$ begin
 assert (select count(*)=1 from public.weddings where id='9b100000-0000-4000-8000-000000000001'),'Accepted membership';
 assert (select count(*)=1 from public.ceremonies where wedding_id='9b100000-0000-4000-8000-000000000001'),'Only shared ceremony visible';
 assert not public.wf_can_read((select value::uuid from wf_test_state where key='a')),'Cross-family read denied';
 assert (select count(*)=0 from public.activity_events where workspace_id=(select value::uuid from wf_test_state where key='a')),'No private audit leakage';
end $$;
select public.wf_save_ceremony('9b200000-0000-4000-8000-000000000003','9b100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='b'),'Private B timed','2027-12-11','2027-12-11',false,'2027-12-11 10:00+05:30','2027-12-11 11:00+05:30','',null);
select pg_temp.expect_error($q$select public.wf_save_ceremony('9b200000-0000-4000-8000-000000000004','9b100000-0000-4000-8000-000000000002',(select value::uuid from wf_test_state where key='b'),'Wrong wedding','2027-12-11','2027-12-11',true,null,null,'',null)$q$,'42501');
select pg_temp.expect_error($q$select public.wf_delete_ceremony('9b200000-0000-4000-8000-000000000001',1)$q$,'42501');
select pg_temp.expect_error($q$select public.wf_change_member((select value::uuid from wf_test_state where key='a'),'9b000000-0000-4000-8000-000000000001','viewer')$q$,'42501');
select public.wf_create_wedding('9b100000-0000-4000-8000-000000000002','Shared setup','2027-12-12','2026-10-19','',null,'shared','single','Owner B');
do $$ begin assert (select count(*)=1 from public.workspaces where wedding_id='9b100000-0000-4000-8000-000000000002'),'Shared setup has one workspace'; end $$;

select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000001","email":"owner-a@example.invalid","role":"authenticated"}',true);
do $$ begin
 assert (select count(*)=0 from public.ceremonies where id='9b200000-0000-4000-8000-000000000003'),'Wedding admin cannot bypass family B';
 assert (select count(*)=0 from public.weddings where id='9b100000-0000-4000-8000-000000000002'),'Unrelated wedding isolation';
end $$;
select pg_temp.expect_error($q$select public.wf_invite((select value::uuid from wf_test_state where key='b'),'outsider@example.invalid','admin')$q$,'42501');
-- Explicit sharing keeps one record and cannot be performed by the other family.
select pg_temp.expect_error($q$select public.wf_share_ceremony('9b200000-0000-4000-8000-000000000003',1)$q$,'42501');
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000002","email":"owner-b@example.invalid","role":"authenticated"}',true);
select public.wf_share_ceremony('9b200000-0000-4000-8000-000000000003',1);
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000001","email":"owner-a@example.invalid","role":"authenticated"}',true);
do $$ begin
 assert (select count(*)=1 from public.ceremonies where id='9b200000-0000-4000-8000-000000000003' and workspace_id=(select value::uuid from wf_test_state where key='shared')),'Canonical shared ceremony, no copy';
end $$;
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000002","email":"owner-b@example.invalid","role":"authenticated"}',true);
select pg_temp.expect_error($q$select public.wf_unshare_ceremony('9b200000-0000-4000-8000-000000000003',2,(select value::uuid from wf_test_state where key='a'))$q$,'42501');
select public.wf_unshare_ceremony('9b200000-0000-4000-8000-000000000003',2,(select value::uuid from wf_test_state where key='b'));
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000001","email":"owner-a@example.invalid","role":"authenticated"}',true);
do $$ begin assert (select count(*)=0 from public.ceremonies where id='9b200000-0000-4000-8000-000000000003'),'Withdrawal restores family isolation'; end $$;
select public.wf_save_ceremony('9b200000-0000-4000-8000-000000000001','9b100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='a'),'Private A edited','2027-12-11','2027-12-11',true,null,null,'',1);
select pg_temp.expect_error($q$select public.wf_delete_ceremony('9b200000-0000-4000-8000-000000000001',1)$q$,'40001');
select pg_temp.expect_error($q$select public.wf_save_ceremony('9b200000-0000-4000-8000-000000000001','9b100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='shared'),'Leaking edit','2027-12-11','2027-12-11',true,null,null,'',2)$q$,'P0001');

select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000003","email":"viewer@example.invalid","role":"authenticated"}',true);
select public.wf_accept_invite((select value from wf_test_state where key='invite_viewer'),'Viewer');
do $$ begin
 assert public.wf_can_read((select value::uuid from wf_test_state where key='a')),'Viewer may read own family';
 assert not public.wf_can_edit((select value::uuid from wf_test_state where key='a')),'Viewer cannot edit';
 assert not public.wf_can_edit((select value::uuid from wf_test_state where key='shared')),'Viewer cannot edit shared overview';
end $$;
select pg_temp.expect_error($q$select public.wf_invite((select value::uuid from wf_test_state where key='a'),'outsider@example.invalid','member')$q$,'42501');
select pg_temp.expect_error($q$select public.wf_change_member((select value::uuid from wf_test_state where key='a'),'9b000000-0000-4000-8000-000000000003','admin')$q$,'42501');
select pg_temp.expect_error($q$select public.wf_delete_ceremony('9b200000-0000-4000-8000-000000000001',2)$q$,'42501');

select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000001","email":"owner-a@example.invalid","role":"authenticated"}',true);
select public.wf_change_member((select value::uuid from wf_test_state where key='a'),'9b000000-0000-4000-8000-000000000003',null);
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000003","email":"viewer@example.invalid","role":"authenticated"}',true);
do $$ begin
 assert not public.wf_member('9b100000-0000-4000-8000-000000000001'),'Revocation removes wedding membership';
 assert (select count(*)=0 from public.ceremonies where wedding_id='9b100000-0000-4000-8000-000000000001'),'Revocation hides ceremonies';
 assert (select count(*)=0 from public.activity_events where wedding_id='9b100000-0000-4000-8000-000000000001'),'Revocation hides audit';
end $$;
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='invite_viewer'),'Viewer')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"9b000000-0000-4000-8000-000000000004","email":"outsider@example.invalid","role":"authenticated"}',true);
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='revoked'),'Outsider')$q$,'42501');
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='expired'),'Outsider')$q$,'42501');
set local role anon;
select pg_temp.expect_error($q$select * from public.weddings$q$,'42501');
select pg_temp.expect_error($q$select public.wf_create_wedding(gen_random_uuid(),'Bad','2027-12-12','2026-10-19','',null,'shared','single','Anon')$q$,'42501');
reset role;
