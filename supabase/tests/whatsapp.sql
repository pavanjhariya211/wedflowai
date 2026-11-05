-- database.py runs these synthetic fixtures in a rolled-back transaction.
reset role;
insert into auth.users(id,email) values
 ('7e110000-0000-4000-8000-000000000001','wa-owner@example.invalid'),
 ('7e110000-0000-4000-8000-000000000002','wa-first@example.invalid'),
 ('7e110000-0000-4000-8000-000000000003','wa-second@example.invalid');
grant select on wf_test_state to anon;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"7e110000-0000-4000-8000-000000000001","email":"wa-owner@example.invalid","role":"authenticated"}',true);
select public.wf_create_wedding('7e120000-0000-4000-8000-000000000001','WhatsApp test','2027-12-12','2026-11-01','Indore',null,'separate','single','Owner');
insert into wf_test_state select 'wa_a',id::text from public.workspaces where wedding_id='7e120000-0000-4000-8000-000000000001' and name='Family A';
insert into wf_test_state select 'wa_b',id::text from public.workspaces where wedding_id='7e120000-0000-4000-8000-000000000001' and name='Family B';
insert into wf_test_state values('wa_bootstrap',public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_b'),'admin'));
insert into wf_test_state values('wa_link',public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_a'),'viewer'));
insert into wf_test_state values('wa_revoked',public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_a'),'member'));
insert into wf_test_state values('wa_expired',public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_a'),'member'));
reset role;
insert into wf_test_state select 'wa_revoked_id',id::text from public.invitations where token_hash=encode(sha256(convert_to((select value from wf_test_state where key='wa_revoked'),'UTF8')),'hex');
set local role authenticated;
select public.wf_revoke_invite((select value::uuid from wf_test_state where key='wa_revoked_id'));
select pg_temp.expect_error($q$select public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_b'),'member')$q$,'42501');
select pg_temp.expect_error($q$select public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_a'),'owner')$q$,'23514');
reset role;
do $$ begin
 assert (select email is null and channel='whatsapp' from public.invitations where token_hash=encode(sha256(convert_to((select value from wf_test_state where key='wa_link'),'UTF8')),'hex')),'No placeholder recipient email';
end $$;
reset role;
update public.invitations set expires_at=now()-interval '1 second' where token_hash=encode(sha256(convert_to((select value from wf_test_state where key='wa_expired'),'UTF8')),'hex');
set local role anon;
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='wa_link'),'Anonymous')$q$,'42501');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"7e110000-0000-4000-8000-000000000002","email":"wa-first@example.invalid","role":"authenticated"}',true);
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='wa_revoked'),'First')$q$,'42501');
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='wa_expired'),'First')$q$,'42501');
select public.wf_accept_invite((select value from wf_test_state where key='wa_link'),'First');
select public.wf_accept_invite((select value from wf_test_state where key='wa_link'),'First retry');
do $$ begin
 assert not public.wf_can_edit((select value::uuid from wf_test_state where key='wa_a')),'Viewer cannot edit';
 assert not public.wf_can_read((select value::uuid from wf_test_state where key='wa_b')),'Other family remains private';
end $$;
select pg_temp.expect_error($q$select public.wf_invite_whatsapp((select value::uuid from wf_test_state where key='wa_a'),'member')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"7e110000-0000-4000-8000-000000000003","email":"wa-second@example.invalid","role":"authenticated"}',true);
select pg_temp.expect_error($q$select public.wf_accept_invite((select value from wf_test_state where key='wa_link'),'Second')$q$,'42501');
do $$ begin
 assert not public.wf_can_read((select value::uuid from wf_test_state where key='wa_a')),'Consumed link grants no second membership';
end $$;
reset role;

set local role authenticated;
select public.wf_accept_invite((select value from wf_test_state where key='wa_bootstrap'),'Other family admin');
do $$ begin assert public.wf_can_manage((select value::uuid from wf_test_state where key='wa_b')),'Explicit bootstrap grants family admin'; end $$;
select set_config('request.jwt.claims','{"sub":"7e110000-0000-4000-8000-000000000001","email":"wa-owner@example.invalid","role":"authenticated"}',true);
do $$ begin assert not public.wf_can_read((select value::uuid from wf_test_state where key='wa_b')),'Wedding creator gains no other-family access'; end $$;
reset role;
