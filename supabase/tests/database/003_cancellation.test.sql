-- Unpaid cancellation and rejection of paid cancellation; no online refund subsystem.
begin;

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
select plan(14);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  'b1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'refund-owner@example.test',
  '{"provider":"google","providers":["google"]}', '{"name":"Refund Owner"}',
  now(), now()
);
insert into public.pickup_locations (id, name)
values ('b2000000-0000-4000-8000-000000000001', 'Refund test location');
insert into public.pickup_dates (id, pickup_date)
values ('b3000000-0000-4000-8000-000000000001', '2099-03-01');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('b4000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', '10:00', '11:00');

select ok(not has_function_privilege('authenticated', 'public.prepare_order_cancellation(uuid,uuid)', 'EXECUTE'), 'customers cannot call cancellation preparation directly');
select ok(has_function_privilege('service_role', 'public.prepare_order_cancellation(uuid,uuid)', 'EXECUTE'), 'service role can prepare cancellation');
select ok(not has_function_privilege('authenticated', 'public.cancel_unpaid_order(uuid,uuid,text)', 'EXECUTE'), 'customers cannot directly finalize unpaid cancellation');
select ok(has_function_privilege('service_role', 'public.cancel_unpaid_order(uuid,uuid,text)', 'EXECUTE'), 'service role can finalize unpaid cancellation');

insert into public.orders (
  id, order_number, user_id, customer_name, customer_email, pickup_date,
  pickup_window_id, pickup_location_id, pickup_window_snapshot, pickup_location_snapshot,
  subtotal, total, terms_version, terms_accepted_at, payment_expires_at
) values (
  'b5000000-0000-4000-8000-000000000001', 'TL-9101',
  'b1000000-0000-4000-8000-000000000001', 'Refund Owner', 'refund-owner@example.test', '2099-03-01',
  'b4000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
  '10:00 AM–11:00 AM', 'Refund test location', 40, 40, 'refund-test', now(), now() + interval '15 minutes'
);
insert into public.payments (id, order_id, provider_checkout_id, provider_checkout_url, amount)
values ('b6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'cs_refund_9101', 'https://checkout.paymongo.com/cs_refund_9101', 40);

select throws_ok(
  $$select public.cancel_unpaid_order('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',null)$$,
  'P0001', 'Attached PayMongo checkout must be expired first',
  'an attached unpaid checkout cannot be cancelled before provider expiry'
);
select ok(public.cancel_unpaid_order('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','cs_refund_9101'), 'provider-expired unpaid order is cancelled');
select is((select status from public.orders where id = 'b5000000-0000-4000-8000-000000000001'), 'CANCELLED'::public.order_status, 'unpaid order becomes cancelled');
select is((select payment_status from public.orders where id = 'b5000000-0000-4000-8000-000000000001'), 'FAILED'::public.payment_status, 'unpaid order payment state becomes failed');
select is((select status from public.payments where id = 'b6000000-0000-4000-8000-000000000001'), 'FAILED'::public.payment_status, 'unpaid payment row becomes failed');
select is((select count(*) from public.notification_deliveries where order_id = 'b5000000-0000-4000-8000-000000000001' and event_type = 'order.cancelled'), 1::bigint, 'unpaid cancellation queues one email');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email, pickup_date,
  pickup_window_id, pickup_location_id, pickup_window_snapshot, pickup_location_snapshot,
  subtotal, total, terms_version, terms_accepted_at
) values (
  'b5000000-0000-4000-8000-000000000002', 'TL-9102', 'b1000000-0000-4000-8000-000000000001',
  'CONFIRMED', 'PAID', 'Refund Owner', 'refund-owner@example.test', '2099-03-01',
  'b4000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001',
  '10:00 AM–11:00 AM', 'Refund test location', 60, 60, 'refund-test', now()
);
insert into public.payments (id, order_id, provider_payment_id, amount, status, paid_at)
values ('b6000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000002', 'pay_refund_9102', 60, 'PAID', now());

select throws_ok(
  $$select public.prepare_order_cancellation('b5000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001')$$,
  'P0001', 'Paid-order concerns must be settled directly with TsokoLitaw in person',
  'the website cancellation preparation rejects a paid order'
);

select throws_ok($$select public.cancel_unpaid_order('b5000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001',null)$$, 'P0001', null, 'paid order cannot be cancelled directly');
select ok(to_regclass('public.refunds') is null, 'refund subsystem is removed');
select is((select status from public.orders where id = 'b5000000-0000-4000-8000-000000000002'), 'CONFIRMED'::public.order_status, 'paid order remains confirmed');
select * from finish();
rollback;
