begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
select set_config('search_path', (select quote_ident(n.nspname) || ',public' from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgtap'), true);
select plan(33);

insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cancel-admin@example.test','{"provider":"google","providers":["google"]}','{"name":"Admin"}',now(),now()),
('f1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cancel-owner@example.test','{"provider":"google","providers":["google"]}','{"name":"Owner"}',now(),now());
update public.profiles set role='admin' where id='f1000000-0000-4000-8000-000000000001';
insert into public.pickup_locations(id,name) values ('f2000000-0000-4000-8000-000000000001','Cancellation test');
insert into public.pickup_dates(id,pickup_date,availability_mode) values ('f3000000-0000-4000-8000-000000000001','2099-05-01','HYBRID');
insert into public.pickup_windows(id,pickup_date_id,start_time,end_time) values ('f4000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','09:00','10:00');
insert into public.orders(id,order_number,user_id,status,payment_status,payment_method,customer_name,customer_email,pickup_date,pickup_window_id,pickup_location_id,pickup_window_snapshot,pickup_location_snapshot,subtotal,total,terms_version,terms_accepted_at,created_at)
select ('f5000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,'TL-CANCEL-' || i,
'f1000000-0000-4000-8000-000000000002',
case when i=2 then 'PENDING_PAYMENT' when i=3 then 'PREPARING' when i=4 then 'COMPLETED' when i=5 then 'PENDING_PAYMENT' when i=6 then 'CANCELLED' when i=7 then 'EXPIRED' else 'READY_FOR_PICKUP' end::public.order_status,
case when i=4 then 'PAID' when i=5 then 'UNDER_REVIEW' when i in (6,7) then 'FAILED' else 'PENDING' end::public.payment_status,
case when i=2 then 'paymongo' when i=5 then 'manual_gcash' else 'pay_at_counter' end,
'Owner','cancel-owner@example.test','2099-05-01','f4000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','9–10 AM','Test',40,40,'test',now(),
case when i=1 then '2099-05-01T09:00:00+08:00' else '2099-04-29T09:00:00+08:00' end::timestamptz
from generate_series(1,8) i;
insert into public.payments(order_id,provider,provider_checkout_id,amount,status)
select id,payment_method,case when payment_method='paymongo' then 'cs_cancel_exact' end,total,payment_status from public.orders where order_number like 'TL-CANCEL-%';
insert into public.order_items(order_id,product_id,variant_id,product_name_snapshot,variant_name_snapshot,piece_count_snapshot,unit_price_snapshot,quantity,line_subtotal)
select id,'10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000004','Test','Test',4,40,1,40 from public.orders where order_number like 'TL-CANCEL-%';
insert into public.daily_inventory(product_id,pickup_date,stock_total,stock_reserved) values ('10000000-0000-4000-8000-000000000001','2099-05-01',100,4);
insert into public.loyalty_rewards(user_id,reward_type,threshold,source_order_id,status,redeemed_at,redeemed_order_id) values ('f1000000-0000-4000-8000-000000000002','FREE_4_PIECE',7,'f5000000-0000-4000-8000-000000000004','redeemed',now(),'f5000000-0000-4000-8000-000000000001');

select ok(not has_function_privilege('anon','public.prepare_admin_order_cancellation(uuid,uuid,public.order_status)','execute'),'anonymous preparation denied');
select ok(not has_function_privilege('authenticated','public.cancel_admin_unpaid_order(uuid,uuid,public.order_status,text,text)','execute'),'browser finalization denied');
select ok(has_function_privilege('service_role','public.cancel_admin_unpaid_order(uuid,uuid,public.order_status,text,text)','execute'),'service role explicit grant');
select throws_ok($$select * from public.prepare_admin_order_cancellation('f1000000-0000-4000-8000-000000000002','f5000000-0000-4000-8000-000000000001','READY_FOR_PICKUP')$$,'P0001','Active administrator access is required','customer actor denied');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','READY_FOR_PICKUP','  ')$$,'P0001','Cancellation requires a reason between 3 and 500 characters','blank reason denied');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','CONFIRMED','No show')$$,'P0001','Order status changed','stale fulfillment state denied');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000004','COMPLETED','No show')$$,'P0001','Order is no longer eligible for unpaid cancellation','completed paid order protected');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000005','PENDING_PAYMENT','No show')$$,'P0001','Order is no longer eligible for unpaid cancellation','review payment protected');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000006','CANCELLED','No show')$$,'P0001','Order is no longer eligible for unpaid cancellation','unrelated cancelled order protected');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000007','EXPIRED','No show')$$,'P0001','Order is no longer eligible for unpaid cancellation','expired order protected');
select is((select checkout_id from public.prepare_admin_order_cancellation('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002','PENDING_PAYMENT')),'cs_cancel_exact','prepare returns exact reference');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002','PENDING_PAYMENT','Requested')$$,'P0001','Attached PayMongo checkout must be expired first','attached provider must expire first');
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002','PENDING_PAYMENT','Requested','cs_wrong')$$,'P0001','Attached PayMongo checkout must be expired first','different provider reference rejected');
select is(public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002','PENDING_PAYMENT','Requested','cs_cancel_exact'),true,'provider-expired pending order cancels');
select is(public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','READY_FOR_PICKUP','  No show  '),true,'unpaid counter no-show cancels');
select is((select stock_reserved from public.daily_inventory where pickup_date='2099-05-01'),0,'same-day Hybrid reservation released even on a different cancellation date');
select is((select status::text from public.loyalty_rewards where redeemed_order_id is null and user_id='f1000000-0000-4000-8000-000000000002'),'earned','reward restored atomically');
select is((select metadata->>'reason' from public.admin_audit_logs where entity_id='f5000000-0000-4000-8000-000000000001' and action='order.admin_cancelled'),'No show','trimmed reason audited');
select is((select status::text from public.payments where order_id='f5000000-0000-4000-8000-000000000001'),'FAILED','payment fails on unpaid cancellation');
select is(public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','READY_FOR_PICKUP','No show'),false,'retry idempotent');
select is((select count(*)::integer from public.admin_audit_logs where entity_id='f5000000-0000-4000-8000-000000000001' and action='order.admin_cancelled'),1,'retry does not repeat audit');
select is((select count(*)::integer from public.notification_deliveries where order_id='f5000000-0000-4000-8000-000000000001' and event_type='order.cancelled'),1,'existing cancellation event queues once');
select is(public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000003','PREPARING','Requested'),true,'unpaid preparation cancellable');
select is((select stock_reserved from public.daily_inventory where pickup_date='2099-05-01'),0,'future Hybrid placement does not release other stock');
update public.orders set payment_status='PAID' where id='f5000000-0000-4000-8000-000000000008';
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000008','READY_FOR_PICKUP','Requested')$$,'P0001','Order is no longer eligible for unpaid cancellation','payment winning race blocks cancellation');
update public.orders set payment_status='PENDING' where id='f5000000-0000-4000-8000-000000000008';
update public.payments set status='PAID' where order_id='f5000000-0000-4000-8000-000000000008';
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000008','READY_FOR_PICKUP','Requested')$$,'P0001','Payment is no longer pending','independent paid payment protected');
update public.profiles set is_active=false, deactivated_at=now() where id='f1000000-0000-4000-8000-000000000001';
select throws_ok($$select * from public.prepare_admin_order_cancellation('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000008','READY_FOR_PICKUP')$$,'P0001','Active administrator access is required','inactive admin denied');
select is((select count(*)::integer from public.admin_audit_logs where action='order.admin_cancelled'),3,'only successful cancellations audited');
update public.profiles set is_active=true, deactivated_at=null where id='f1000000-0000-4000-8000-000000000001';
update public.payments set status='PENDING' where order_id='f5000000-0000-4000-8000-000000000008';
update public.orders set status='CONFIRMED' where id='f5000000-0000-4000-8000-000000000008';
update public.pickup_dates set availability_mode='READY_STOCK' where id='f3000000-0000-4000-8000-000000000001';
select throws_ok($$select public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000008','CONFIRMED','No show')$$,'P0001','Reserved inventory is inconsistent','inconsistent reservation aborts cancellation');
select is((select status::text from public.orders where id='f5000000-0000-4000-8000-000000000008'),'CONFIRMED','failed stock release rolls back order');
select is((select status::text from public.payments where order_id='f5000000-0000-4000-8000-000000000008'),'PENDING','failed stock release preserves pending payment');
update public.daily_inventory set stock_reserved=4 where pickup_date='2099-05-01';
select is(public.cancel_admin_unpaid_order('f1000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000008','CONFIRMED','No show'),true,'received unpaid counter order can cancel');
select is((select stock_reserved from public.daily_inventory where pickup_date='2099-05-01'),0,'Ready-stock reservation released');
select * from finish();
rollback;
