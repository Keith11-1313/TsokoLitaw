begin;
create temporary sequence fixture_ids start 10000000000;
create function pg_temp.fixture_id(legacy text) returns bigint language sql immutable as 'select (''x''||left(legacy,8))::bit(32)::bigint*1000000+right(legacy,12)::bigint';
create extension if not exists pgtap with schema extensions;
set local role postgres;
do $$
declare pgtap_schema text;
begin
  select pg_namespace.nspname into pgtap_schema
  from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
  where pg_extension.extname = 'pgtap';
  execute format('grant usage on schema %I to %I', pgtap_schema, session_user);
end;
$$;
select set_config(
  'search_path',
  (select quote_ident(pg_namespace.nspname) || ',public'
   from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
   where pg_extension.extname = 'pgtap'),
  true
);
select plan(12);

insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('e1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','counter-admin@example.test','{"provider":"google","providers":["google"]}','{"name":"Counter Admin"}',now(),now()),
  ('e1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','counter-customer@example.test','{"provider":"google","providers":["google"]}','{"name":"Counter Customer"}',now(),now());
update public.profiles set role='staff' where id=(select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001');
insert into public.pickup_locations(id,name) values ('3791650816000001','Counter test');
insert into public.pickup_dates(id,pickup_date) values ('3808428032000001','2099-05-01');
insert into public.pickup_windows(id,pickup_date_id,start_time,end_time)
values ('3825205248000001','3808428032000001','09:00','10:00');
insert into public.orders(
  id,order_number,user_id,status,payment_status,payment_method,customer_name,customer_email,
  pickup_date,pickup_window_id,pickup_location_id,pickup_window_snapshot,pickup_location_snapshot,
  subtotal,total,terms_version,terms_accepted_at,payment_expires_at
) values (
  '3841982464000001','TL-COUNTER-1',(select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000002'),
  'CONFIRMED','PENDING','pay_at_counter','Counter Customer','counter-customer@example.test','2099-05-01',
  '3825205248000001','3791650816000001',
  '9:00 AM–10:00 AM','Counter test',75,75,'test',now(),null
);
insert into public.payments(order_id,provider,amount)
values ('3841982464000001','pay_at_counter',75);

select ok(not has_function_privilege('authenticated','public.record_counter_payment(bigint,bigint)','execute'),'customer cannot record counter payment');
select ok(has_function_privilege('service_role','public.record_counter_payment(bigint,bigint)','execute'),'service role can record counter payment');
select is(public.transition_order_status((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001'),'3841982464000001','CONFIRMED','PREPARING'),'PREPARING'::public.order_status,'unpaid counter order can enter preparation');
select is(public.transition_order_status((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001'),'3841982464000001','PREPARING','READY_FOR_PICKUP'),'READY_FOR_PICKUP'::public.order_status,'unpaid counter order can become ready');
select throws_ok($$select public.transition_order_status((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001'),'3841982464000001','READY_FOR_PICKUP','COMPLETED')$$,'P0001','Only paid orders can enter fulfillment','unpaid counter order cannot complete');
select throws_ok($$select public.record_counter_payment((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000002'),'3841982464000001')$$,'P0001','Active staff access is required','customer identity cannot confirm payment');
select is(public.record_counter_payment((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001'),'3841982464000001'),true,'admin records exact counter payment');
select is((select payment_status::text from public.orders where id='3841982464000001'),'PAID','order payment becomes paid');
select is((select status::text from public.payments where order_id='3841982464000001'),'PAID','payment row becomes paid');
select is((select count(*)::int from public.admin_audit_logs where entity_id='3841982464000001' and action='payment.counter_recorded'),1,'counter payment creates an audit entry');
select is(public.record_counter_payment((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001'),'3841982464000001'),false,'duplicate confirmation is idempotent');
select is(public.transition_order_status((select id from public.profiles where auth_user_id='e1000000-0000-4000-8000-000000000001'),'3841982464000001','READY_FOR_PICKUP','COMPLETED'),'COMPLETED'::public.order_status,'paid counter order can complete');

select * from finish();
rollback;
