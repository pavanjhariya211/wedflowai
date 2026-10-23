-- Independent fixtures. database.py wraps every assertion in BEGIN/ROLLBACK.
insert into auth.users(id,email) values
 ('9c000000-0000-4000-8000-000000000001','plan-owner@example.invalid'),
 ('9c000000-0000-4000-8000-000000000002','plan-other@example.invalid'),
 ('9c000000-0000-4000-8000-000000000003','plan-viewer@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"9c000000-0000-4000-8000-000000000001","email":"plan-owner@example.invalid","role":"authenticated"}',true);
select public.wf_create_wedding('9c100000-0000-4000-8000-000000000001','Task test','2027-12-12','2026-10-24','',null,'separate','multi','Planner');
insert into wf_test_state select 'pa',id::text from public.workspaces where wedding_id='9c100000-0000-4000-8000-000000000001' and name='Family A';
insert into wf_test_state select 'pb',id::text from public.workspaces where wedding_id='9c100000-0000-4000-8000-000000000001' and name='Family B';
insert into wf_test_state select 'ps',id::text from public.workspaces where wedding_id='9c100000-0000-4000-8000-000000000001' and kind='shared';
insert into wf_test_state values('pi',public.wf_invite((select value::uuid from wf_test_state where key='pb'),'plan-other@example.invalid','admin'));
insert into wf_test_state values('pv',public.wf_invite((select value::uuid from wf_test_state where key='pa'),'plan-viewer@example.invalid','viewer'));
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Family budget review','category','Budget','owner_id',auth.uid(),'due_date','2027-11-10'),null);
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000002','workspace_id',(select value from wf_test_state where key='ps'),'title','Personal gift','category','Gifts','owner_id',auth.uid(),'personal',true),null);
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000003','workspace_id',(select value from wf_test_state where key='ps'),'title','Shared vendor review','category','Vendors','owner_id',auth.uid(),'template_key','starter:test'),null);
select pg_temp.expect_error($q$select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Stale change','category','Budget','owner_id',auth.uid()),99)$q$,'40001');
select pg_temp.expect_error($q$select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Silent change','category','Budget','owner_id',auth.uid(),'personal',true),1)$q$,'23514');
select pg_temp.expect_error($q$insert into public.planning_tasks(id,wedding_id,workspace_id,title,category,owner_id,created_by) values(gen_random_uuid(),'9c100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='pa'),'Direct write','Budget',auth.uid(),auth.uid())$q$,'42501');
-- Explicit status lifecycle captures old and new fields; dates never auto-shift.
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Family budget review','category','Budget','owner_id',auth.uid(),'due_date','2027-11-10','status','completed'),1);
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Family budget review','category','Budget','owner_id',auth.uid(),'due_date','2027-11-10','status','not_started'),2);
do $$ begin
 assert (select count(*)=3 from public.task_history where task_id='9c200000-0000-4000-8000-000000000001'),'History retained';
 assert (select due_date='2027-11-10' and version=3 from public.planning_tasks where id='9c200000-0000-4000-8000-000000000001'),'No automatic date mutation';
end $$;
select public.wf_task_plan(jsonb_build_array(jsonb_build_object('id','9c200000-0000-4000-8000-000000000004','workspace_id',(select value from wf_test_state where key='pa'),'title','Reviewed suggestion','category','Venue','owner_id',auth.uid(),'template_key','starter:venue')));
select public.wf_task_plan(jsonb_build_array(jsonb_build_object('id','9c200000-0000-4000-8000-000000000004','workspace_id',(select value from wf_test_state where key='pa'),'title','Reviewed suggestion','category','Venue','owner_id',auth.uid(),'template_key','starter:venue')));
do $$ begin assert (select count(*)=1 from public.task_history where task_id='9c200000-0000-4000-8000-000000000004'),'Idempotent bulk retry'; end $$;
select pg_temp.expect_error($q$select public.wf_task_plan(jsonb_build_array(
 jsonb_build_object('id','9c200000-0000-4000-8000-000000000005','workspace_id',(select value from wf_test_state where key='pa'),'title','Valid first','category','Venue','owner_id',auth.uid()),
 jsonb_build_object('id','9c200000-0000-4000-8000-000000000006','workspace_id',(select value from wf_test_state where key='pa'),'title','','category','Venue','owner_id',auth.uid())))$q$,'23514');
do $$ begin assert not exists(select 1 from public.planning_tasks where id='9c200000-0000-4000-8000-000000000005'),'Bulk application is atomic'; end $$;
select set_config('request.jwt.claims','{"sub":"9c000000-0000-4000-8000-000000000002","email":"plan-other@example.invalid","role":"authenticated"}',true);
select public.wf_accept_invite((select value from wf_test_state where key='pi'),'Other family');
do $$ begin
 assert not exists(select 1 from public.planning_tasks where id in ('9c200000-0000-4000-8000-000000000001','9c200000-0000-4000-8000-000000000002')),'Family and personal privacy';
 assert not exists(select 1 from public.task_history where task_id in ('9c200000-0000-4000-8000-000000000001','9c200000-0000-4000-8000-000000000002')),'History privacy';
 assert exists(select 1 from public.planning_tasks where id='9c200000-0000-4000-8000-000000000003'),'Shared task visible';
end $$;
select pg_temp.expect_error($q$select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Unauthorized','category','Budget','owner_id',auth.uid()),3)$q$,'42501');
select public.wf_save_ceremony('9c300000-0000-4000-8000-000000000001','9c100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='pb'),'Private ceremony B','2027-12-12','2027-12-12',true,null,null,'',null);
select set_config('request.jwt.claims','{"sub":"9c000000-0000-4000-8000-000000000001","email":"plan-owner@example.invalid","role":"authenticated"}',true);
select pg_temp.expect_error($q$select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Leak link','category','Budget','owner_id',auth.uid(),'ceremony_ids',jsonb_build_array('9c300000-0000-4000-8000-000000000001')),3)$q$,'42501');
select pg_temp.expect_error($q$select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Invalid owner','category','Budget','owner_id','9c000000-0000-4000-8000-000000000002'),3)$q$,'23514');
select set_config('request.jwt.claims','{"sub":"9c000000-0000-4000-8000-000000000003","email":"plan-viewer@example.invalid","role":"authenticated"}',true);
select public.wf_accept_invite((select value from wf_test_state where key='pv'),'Viewer');
do $$ begin
 assert exists(select 1 from public.planning_tasks where id='9c200000-0000-4000-8000-000000000001'),'Viewer can read family task';
 assert not exists(select 1 from public.planning_tasks where id='9c200000-0000-4000-8000-000000000002'),'Viewer cannot read personal task';
end $$;
select pg_temp.expect_error($q$select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Viewer edit','category','Budget','owner_id',auth.uid()),3)$q$,'42501');
-- Canonical task links survive family-to-shared ceremony sharing. Withdrawal hides
-- the private link from a broader task, even for a user with access to both scopes.
select set_config('request.jwt.claims','{"sub":"9c000000-0000-4000-8000-000000000001","email":"plan-owner@example.invalid","role":"authenticated"}',true);
select public.wf_save_ceremony('9c300000-0000-4000-8000-000000000002','9c100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='pa'),'Linked A','2027-12-12','2027-12-12',true,null,null,'',null);
select public.wf_save_ceremony('9c300000-0000-4000-8000-000000000003','9c100000-0000-4000-8000-000000000001',(select value::uuid from wf_test_state where key='pa'),'Linked B','2027-12-12','2027-12-12',true,null,null,'',null);
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Two ceremony task','category','Budget','owner_id',auth.uid(),'ceremony_ids',jsonb_build_array('9c300000-0000-4000-8000-000000000002','9c300000-0000-4000-8000-000000000003')),3);
select public.wf_share_ceremony('9c300000-0000-4000-8000-000000000002',1);
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000001','workspace_id',(select value from wf_test_state where key='pa'),'title','Two ceremony task','category','Budget','owner_id',auth.uid(),'status','completed','ceremony_ids',jsonb_build_array('9c300000-0000-4000-8000-000000000002','9c300000-0000-4000-8000-000000000003')),4);
select public.wf_task_save(jsonb_build_object('id','9c200000-0000-4000-8000-000000000003','workspace_id',(select value from wf_test_state where key='ps'),'title','Shared task','category','Vendors','owner_id',auth.uid(),'ceremony_ids',jsonb_build_array('9c300000-0000-4000-8000-000000000002')),1);
select public.wf_unshare_ceremony('9c300000-0000-4000-8000-000000000002',2,(select value::uuid from wf_test_state where key='pa'));
do $$ begin
 assert (select count(*)=2 from public.task_ceremonies where task_id='9c200000-0000-4000-8000-000000000001'),'Two links to one canonical family task';
 assert not exists(select 1 from public.task_ceremonies where task_id='9c200000-0000-4000-8000-000000000003'),'Withdrawn private ceremony ID hidden from shared task';
end $$;
set local role anon;
select pg_temp.expect_error($q$select * from public.planning_tasks$q$,'42501');
select pg_temp.expect_error($q$select public.wf_task_plan('[]'::jsonb)$q$,'42501');
reset role;
