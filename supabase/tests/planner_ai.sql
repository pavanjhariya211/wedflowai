insert into auth.users(id,email) values
 ('9d000000-0000-4000-8000-000000000001','ai-owner@example.invalid'),
 ('9d000000-0000-4000-8000-000000000002','ai-viewer@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"9d000000-0000-4000-8000-000000000001","email":"ai-owner@example.invalid","role":"authenticated"}',true);
select public.wf_create_wedding('9d100000-0000-4000-8000-000000000001','AI quota fixture','2027-12-12','2026-10-24','',null,'shared','single','Planner');
insert into wf_test_state select 'ai-space',id::text from public.workspaces where wedding_id='9d100000-0000-4000-8000-000000000001' and kind='shared';
insert into wf_test_state values('ai-invite',public.wf_invite((select value::uuid from wf_test_state where key='ai-space'),'ai-viewer@example.invalid','viewer'));
select pg_temp.expect_error($q$select public.wf_claim_planner_ai('9d100000-0000-4000-8000-000000000002',(select value::uuid from wf_test_state where key='ai-space'))$q$,'42501');
select public.wf_claim_planner_ai('9d100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='ai-space'));
select pg_temp.expect_error($q$select public.wf_claim_planner_ai('9d100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='ai-space'))$q$,'54000');
select pg_temp.expect_error($q$select * from public.planner_ai_attempts$q$,'42501');
-- Exercise daily quota independently of the cooldown, without exposing counters to app roles.
reset role;
update public.planner_ai_attempts set created_at=now()-interval '1 hour' where user_id='9d000000-0000-4000-8000-000000000001';
insert into public.planner_ai_attempts(user_id,created_at)
select '9d000000-0000-4000-8000-000000000001',now()-interval '1 hour' from generate_series(1,19);
set local role authenticated;
select pg_temp.expect_error($q$select public.wf_claim_planner_ai('9d100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='ai-space'))$q$,'54000');
select set_config('request.jwt.claims','{"sub":"9d000000-0000-4000-8000-000000000002","email":"ai-viewer@example.invalid","role":"authenticated"}',true);
select public.wf_accept_invite((select value from wf_test_state where key='ai-invite'),'Viewer');
select pg_temp.expect_error($q$select public.wf_claim_planner_ai('9d100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='ai-space'))$q$,'42501');
set local role anon;
select pg_temp.expect_error($q$select public.wf_claim_planner_ai('9d100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='ai-space'))$q$,'42501');
reset role;
