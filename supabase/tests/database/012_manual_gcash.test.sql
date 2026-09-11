begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select ('b1000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'manual-' || n || '@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Manual Test"}', now(), now()
from generate_series(1,3) n;
update public.profiles set role = 'admin' where id = 'b1000000-0000-4000-8000-000000000003';
insert into public.pickup_locations(id,name) values ('b2000000-0000-4000-8000-000000000001','Manual test');
insert into public.pickup_dates(id,pickup_date) values ('b3000000-0000-4000-8000-000000000001','2099-03-01');
insert into public.pickup_windows(id,pickup_date_id,start_time,end_time) values ('b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','09:00','10:00');
insert into public.orders(id,order_number,user_id,customer_name,customer_email,pickup_date,pickup_window_id,pickup_location_id,pickup_window_snapshot,pickup_location_snapshot,subtotal,total,terms_version,terms_accepted_at,payment_expires_at,payment_method)
select ('b5000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'TL-MANUAL-' || n,
  'b1000000-0000-4000-8000-000000000001','Manual Test','manual-1@example.test','2099-03-01',
  'b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','9 AM–10 AM','Manual test',
  85.50,85.50,'test',now(),now()+interval '15 minutes','manual_gcash'
from generate_series(1,4) n;
insert into public.payments(order_id,provider,amount,manual_qr_payload)
select id,'manual_gcash',total,'test-payload' from public.orders where order_number like 'TL-MANUAL-%';
insert into storage.objects(bucket_id,name)
select 'payment-receipts','b1000000-0000-4000-8000-000000000001/b5000000-0000-4000-8000-' || lpad(n::text,12,'0') || '/b6000000-0000-4000-8000-' || lpad(n::text,12,'0') || '.png'
from generate_series(1,4) n;

select ok(not has_function_privilege('authenticated','public.submit_manual_payment(uuid,uuid,uuid,text,text,numeric,timestamptz,text)','execute'),'customer cannot bypass server receipt validation');
select ok(not has_function_privilege('authenticated','public.review_manual_payment(uuid,uuid,boolean,text)','execute'),'customer cannot approve receipts');
select is((select public from storage.buckets where id='payment-receipts'),false,'receipt bucket private');
select throws_ok($$select public.prepare_paymongo_checkout('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001')$$,'P0001','Payment record is inconsistent with the order','manual order cannot open PayMongo');
select throws_ok($$select public.submit_manual_payment('b1000000-0000-4000-8000-000000000002','b5000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','x','123456789',85.50,now(),'Test recipient')$$,'P0001','Order unavailable','cross-owner receipt denied');

select lives_ok($$select public.submit_manual_payment('b1000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001/b5000000-0000-4000-8000-000000000001/b6000000-0000-4000-8000-000000000001.png','123456789',85.50,now(),'Test recipient')$$,'submit receipt');
select is((select payment_status::text from public.orders where order_number='TL-MANUAL-1'),'UNDER_REVIEW','receipt does not mark paid');
select is((select count(*)::int from public.notification_deliveries where order_id='b5000000-0000-4000-8000-000000000001'),0,'no premature confirmation email');
update public.orders set payment_expires_at=now()-interval '1 minute' where order_number='TL-MANUAL-1';
select public.expire_pending_orders();
select is((select status::text from public.orders where order_number='TL-MANUAL-1'),'PENDING_PAYMENT','review never expires even with stale deadline');
select throws_ok($$select public.cancel_unpaid_order('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001')$$, 'P0001', 'Order is no longer eligible for unpaid cancellation', 'review blocks customer cancellation');
select throws_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001',true,'')$$,'P0001','Active Admin required','customer approval denied');
select lives_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000001',true,'')$$,'Admin approves');
select is((select status::text from public.orders where order_number='TL-MANUAL-1'),'CONFIRMED','approval confirms order');
select is((select payment_status::text from public.orders where order_number='TL-MANUAL-1'),'PAID','approval marks payment paid');
select is((select count(*)::int from public.notification_deliveries where order_id='b5000000-0000-4000-8000-000000000001' and event_type='order.confirmed'),1,'one confirmation queued');
select throws_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000001',true,'')$$,'P0001','This receipt was already reviewed. Refresh the order.','duplicate approval rejected');
select is((select count(*)::int from public.admin_audit_logs where entity_id='b5000000-0000-4000-8000-000000000001'),1,'review audit retained');

select public.submit_manual_payment('b1000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000002','b6000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001/b5000000-0000-4000-8000-000000000002/b6000000-0000-4000-8000-000000000002.png','123456789',85.50,now(),'Test recipient');
select throws_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000002',true,'')$$,'23505',null,'reference cannot pay two orders');
select is((select payment_status::text from public.orders where order_number='TL-MANUAL-2'),'UNDER_REVIEW','duplicate reference failure rolls back entire approval');
select throws_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000002',false,'')$$,'P0001','A rejection reason is required','rejection needs reason');
select lives_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000002',false,'Duplicate receipt. Contact us if you sent another payment.')$$,'Admin rejects');
select is((select payment_status::text from public.orders where order_number='TL-MANUAL-2'),'PENDING','rejection allows correction');
select ok((select payment_expires_at > now() from public.orders where order_number='TL-MANUAL-2'),'correction window set');
select is((select status from public.manual_payment_submissions where id='b6000000-0000-4000-8000-000000000002'),'REJECTED','rejected evidence retained');

select public.submit_manual_payment('b1000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001/b5000000-0000-4000-8000-000000000003/b6000000-0000-4000-8000-000000000003.png','987654321',80.00,now(),'Test recipient');
select throws_ok($$select public.review_manual_payment('b1000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000003',true,'')$$,'P0001','Receipt amount does not match the order total','wrong amount cannot approve');
update public.orders set payment_expires_at=now()-interval '1 minute' where order_number='TL-MANUAL-4';
select public.expire_pending_orders();
select is((select status::text from public.orders where order_number='TL-MANUAL-4'),'EXPIRED','unsubmitted manual order expires normally');

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.manual_payment_submissions),0,'other customer cannot read receipts');
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.manual_payment_submissions),3,'owner can read receipt history');
reset role;
select * from finish();
rollback;
