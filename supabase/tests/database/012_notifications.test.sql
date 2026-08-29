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
select set_config('search_path', (
  select quote_ident(pg_namespace.nspname) || ',public'
  from pg_extension join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
  where pg_extension.extname = 'pgtap'
), true);
select plan(14);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  'db000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'notification-owner@example.test',
  '{"provider":"google","providers":["google"]}', '{"name":"Notification Owner"}',
  now(), now()
);

insert into public.pickup_locations (id, name)
values ('db100000-0000-4000-8000-000000000001', 'Notification test location');
insert into public.pickup_dates (id, pickup_date, availability_mode)
values ('db200000-0000-4000-8000-000000000001', '2099-08-01', 'MADE_TO_ORDER');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('db300000-0000-4000-8000-000000000001', 'db200000-0000-4000-8000-000000000001', '10:00', '11:00');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at
) values (
  'db400000-0000-4000-8000-000000000001', 'TL-N001',
  'db000000-0000-4000-8000-000000000001', 'PENDING_PAYMENT', 'PENDING',
  'Notification Owner', 'notification-owner@example.test', '2099-08-01',
  'db300000-0000-4000-8000-000000000001', 'db100000-0000-4000-8000-000000000001',
  '10:00 AM–11:00 AM', 'Notification test location', 40, 40, 'notification-test', now()
);

select is((select count(*) from public.notification_deliveries), 0::bigint, 'pending payment does not queue a confirmation');

update public.orders
set status = 'CONFIRMED', payment_status = 'PAID'
where id = 'db400000-0000-4000-8000-000000000001';

select is((select count(*) from public.notification_deliveries), 1::bigint, 'confirmed paid order queues one email');
select is((select event_type from public.notification_deliveries), 'order.confirmed', 'confirmation event is typed');
select is((select recipient_email from public.notification_deliveries), 'notification-owner@example.test', 'order email snapshot is the recipient');
select is((select idempotency_key from public.notification_deliveries), 'order.confirmed:db400000-0000-4000-8000-000000000001', 'event has a stable idempotency key');
select is((select status from public.notification_deliveries), 'PENDING', 'new delivery begins pending');

update public.orders set updated_at = now() where id = 'db400000-0000-4000-8000-000000000001';
select is((select count(*) from public.notification_deliveries), 1::bigint, 'unrelated updates do not duplicate the email');

update public.orders set status = 'PREPARING' where id = 'db400000-0000-4000-8000-000000000001';
select is((select count(*) from public.notification_deliveries), 1::bigint, 'later fulfillment does not duplicate confirmation');

update public.orders set status = 'READY_FOR_PICKUP' where id = 'db400000-0000-4000-8000-000000000001';
select is((select count(*) from public.notification_deliveries), 2::bigint, 'ready transition queues one additional email');
select is((select count(*) from public.notification_deliveries where event_type = 'order.ready_for_pickup'), 1::bigint, 'ready event is typed');
select is((select idempotency_key from public.notification_deliveries where event_type = 'order.ready_for_pickup'), 'order.ready_for_pickup:db400000-0000-4000-8000-000000000001', 'ready event has a stable idempotency key');

update public.orders set updated_at = now() where id = 'db400000-0000-4000-8000-000000000001';
select is((select count(*) from public.notification_deliveries), 2::bigint, 'unrelated ready-order updates do not duplicate email');

select ok(
  not has_function_privilege('authenticated', 'public.enqueue_transactional_order_email()', 'EXECUTE'),
  'customers cannot call the notification trigger function'
);
select ok(
  (select count(*) = 1 from pg_indexes where schemaname = 'public' and indexname = 'notification_deliveries_retry_idx'),
  'retry queue index exists'
);

select * from finish();
rollback;
