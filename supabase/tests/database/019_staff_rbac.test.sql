begin;
create temporary sequence fixture_ids start 10000000000;
create function pg_temp.fixture_id(legacy text) returns bigint language sql immutable as 'select (''x''||left(legacy,8))::bit(32)::bigint*1000000+right(legacy,12)::bigint';
create extension if not exists pgtap with schema extensions;
set local search_path=extensions,public;
select no_plan();
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data)
select ('bb200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '00000000-0000-0000-0000-000000000000','authenticated','authenticated','rbac-'||n||'@example.test','{"name":"RBAC"}'
from generate_series(1,4)n;
update public.profiles set role='admin' where id=(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001');
update public.profiles set role='staff' where id=(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002');

select throws_ok($$select public.transition_order_status((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),nextval('fixture_ids'),'CONFIRMED','PREPARING')$$,'P0001','Active staff access is required','Admin cannot fulfill');
select throws_ok($$select public.record_counter_payment((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),nextval('fixture_ids'))$$,'P0001','Active staff access is required','Admin cannot record money');
select throws_ok($$select public.review_manual_payment((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),nextval('fixture_ids'),true,'')$$,'P0001','Active staff access is required','Admin cannot approve GCash');
select throws_ok($$select * from public.prepare_admin_order_cancellation((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),nextval('fixture_ids'),'CONFIRMED')$$,'P0001','Active staff access is required','Admin cannot prepare cancellation');
select throws_ok($$select public.cancel_admin_unpaid_order((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),nextval('fixture_ids'),'CONFIRMED','No show')$$,'P0001','Active staff access is required','Admin cannot finalize cancellation');
select throws_ok($$select public.update_pickup_settings((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),1,'17:00','07:00','19:00')$$,'P0001','Active administrator access is required','Staff cannot change schedules');
select throws_ok($$select public.update_catalog_product((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),'1','Test',10,true)$$,'P0001','Active administrator access is required','Staff cannot edit catalog');
select throws_ok($$select public.count_admin_customers((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),null)$$,'P0001','Active Admin access required','Staff cannot read directory');
select throws_ok($$select public.assign_account_role((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000003'),'customer','admin')$$,'P0001','Active administrator access is required','Staff cannot assign roles');
select throws_ok($$select public.assign_account_role((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),'admin','staff')$$,'P0001','You cannot change your own role','Admin cannot switch to Staff');
select is(public.assign_account_role((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000003'),'customer','staff'),true,'Admin assigns Staff');
select is((select role::text from public.profiles where id=(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000003')),'staff','role persisted');
select is((select count(*) from public.admin_audit_logs where action='account.role_changed'),1::bigint,'role assignment audited');
select throws_ok($$select public.assign_account_role((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000003'),'customer','admin')$$,'P0001','Account role changed; refresh first','stale roles denied');
select is(public.count_admin_customers((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),null),1::bigint,'Staff and Admin excluded from customer counts');
select ok(not has_function_privilege('authenticated','public.assign_account_role(bigint,bigint,public.profile_role,public.profile_role)','execute'),'browser cannot assign roles');
select ok(not has_function_privilege('anon','public.get_staff_pickup_overview(bigint)','execute'),'anonymous cannot read staff projection');
select ok(not has_function_privilege('authenticated','public.require_staff_actor(bigint)','execute'),'actor helper private');

insert into public.pickup_dates(id,pickup_date) values('3139502080000001','2099-10-20');
insert into public.pickup_windows(id,pickup_date_id,start_time,end_time) values('3139567616000001','3139502080000001','09:00','12:00');
insert into public.orders(id,order_number,user_id,customer_name,customer_email,pickup_date,pickup_window_id,pickup_location_id,pickup_window_snapshot,pickup_location_snapshot,subtotal,total,terms_version,terms_accepted_at,payment_method,payment_status)
values('3139633152000001','RBAC-TEST',(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000004'),'RBAC','rbac-4@example.test','2099-10-20','3139567616000001','1','9–12','Test',40,40,'test',now(),'manual_gcash','UNDER_REVIEW');
insert into public.manual_payment_submissions(order_id,receipt_path,reported_reference,reported_amount,reported_paid_at,reported_recipient,status)
values('3139633152000001','rbac-test/receipt.png','1234567890123',40,now(),'Test','UNDER_REVIEW');
select throws_ok($$select public.assign_account_role((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000004'),'customer','staff')$$,'P0001','Resolve personal orders before changing roles','active customer cannot become Staff');
select set_config('request.jwt.claim.sub','bb200000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from public.manual_payment_submissions where order_id='3139633152000001'),0::bigint,'Admin cannot read private receipts');
select is((select count(*) from public.orders where id='3139633152000001'),1::bigint,'Admin retains read-only order reporting');
reset role;

select set_config('request.jwt.claim.sub','bb200000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is(public.is_staff(),true,'Staff session recognized');
select is((select count(*) from public.manual_payment_submissions where order_id='3139633152000001'),1::bigint,'Staff may review operational receipts');
select is((select count(*) from public.profiles where id=(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000004')),0::bigint,'Staff cannot browse other customer profiles');
select is(public.is_admin(),false,'Staff never inherits Admin');
select is(public.is_active_customer(),false,'Staff is not Customer');
select throws_ok($$select public.request_account_deletion()$$,'P0001','Business accounts require controlled removal','Staff cannot request customer deletion');
with changed as(update public.profiles set full_name='Escalation' where id=(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002') returning id)
select is((select count(*) from changed),0::bigint,'Staff cannot use self-profile edits');
reset role;
select throws_ok($$select public.submit_order_review((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),nextval('fixture_ids'),5,'test')$$,'P0001','Active customer access is required','Staff cannot submit customer review');
select throws_ok($$select * from public.prepare_paymongo_checkout(nextval('fixture_ids'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'))$$,'P0001','Active customer access is required','Staff cannot pay as customer');
update public.profiles set is_active=false,deactivated_at=now() where id=(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002');
select throws_ok($$select public.record_counter_payment((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),nextval('fixture_ids'))$$,'P0001','Active staff access is required','inactive Staff denied');
select throws_ok($$select public.assign_account_role((select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000001'),(select id from public.profiles where auth_user_id='bb200000-0000-4000-8000-000000000002'),'staff','customer')$$,'P0001','Active account without pending deletion is required','inactive target denied');
select * from finish();
rollback;
