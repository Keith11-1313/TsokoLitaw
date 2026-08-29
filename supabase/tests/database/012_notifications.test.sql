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
select plan(37);

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

select has_table('public', 'notification_webhook_events', 'delivery webhook event ledger exists');
select has_function(
  'public',
  'process_resend_delivery_event',
  array['text', 'text', 'text', 'timestamp with time zone'],
  'Resend delivery event processor exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.process_resend_delivery_event(text,text,text,timestamp with time zone)',
    'EXECUTE'
  ),
  'customers cannot process Resend delivery events'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.process_resend_delivery_event(text,text,text,timestamp with time zone)',
    'EXECUTE'
  ),
  'trusted server code can process Resend delivery events'
);

update public.notification_deliveries
set status = 'SENT', provider_message_id = 'email_notification_test'
where event_type = 'order.confirmed';

select ok(
  public.process_resend_delivery_event(
    'evt_sent', 'email_notification_test', 'email.sent', '2099-08-01 01:00:00+00'
  ),
  'first signed event is processed'
);
select is(
  (select status from public.notification_deliveries where event_type = 'order.confirmed'),
  'SENT',
  'sent event retains sent state'
);
select is(
  (select count(*) from public.notification_webhook_events where provider_event_id = 'evt_sent'),
  1::bigint,
  'provider event is recorded once'
);
select ok(
  public.process_resend_delivery_event(
    'evt_sent', 'email_notification_test', 'email.sent', '2099-08-01 01:00:00+00'
  ),
  'processed duplicate provider event is safely acknowledged'
);
select is(
  (select count(*) from public.notification_webhook_events where provider_event_id = 'evt_sent'),
  1::bigint,
  'duplicate does not create another ledger row'
);

select ok(
  public.process_resend_delivery_event(
    'evt_delivered', 'email_notification_test', 'email.delivered', '2099-08-01 01:02:00+00'
  ),
  'delivered event is processed'
);
select is(
  (select status from public.notification_deliveries where event_type = 'order.confirmed'),
  'DELIVERED',
  'delivery status advances to delivered'
);
select is(
  (select delivered_at from public.notification_deliveries where event_type = 'order.confirmed'),
  '2099-08-01 01:02:00+00'::timestamptz,
  'delivered timestamp comes from the provider event'
);

select ok(
  public.process_resend_delivery_event(
    'evt_delayed_older', 'email_notification_test', 'email.delivery_delayed', '2099-08-01 01:01:00+00'
  ),
  'an older out-of-order event is safely acknowledged'
);
select is(
  (select status from public.notification_deliveries where event_type = 'order.confirmed'),
  'DELIVERED',
  'older delayed event cannot downgrade delivered state'
);
select is(
  (select provider_event_at from public.notification_deliveries where event_type = 'order.confirmed'),
  '2099-08-01 01:02:00+00'::timestamptz,
  'newest provider event time is retained'
);

select ok(
  public.process_resend_delivery_event(
    'evt_bounced', 'email_notification_test', 'email.bounced', '2099-08-01 01:03:00+00'
  ),
  'newer bounce event is processed'
);
select is(
  (select status from public.notification_deliveries where event_type = 'order.confirmed'),
  'BOUNCED',
  'newer bounce becomes the current delivery state'
);
select is(
  (select last_event_type from public.notification_deliveries where event_type = 'order.confirmed'),
  'email.bounced',
  'last provider event type is retained for operations'
);

select ok(
  not public.process_resend_delivery_event(
    'evt_unknown_message', 'email_missing', 'email.failed', '2099-08-01 01:04:00+00'
  ),
  'event arriving before its provider message is saved remains pending'
);
select ok(
  (select processed_at is null from public.notification_webhook_events where provider_event_id = 'evt_unknown_message'),
  'early event remains available for sender reconciliation'
);

update public.notification_deliveries
set status = 'SENT', provider_message_id = 'email_missing'
where event_type = 'order.ready_for_pickup';
select ok(
  public.process_resend_delivery_event(
    'evt_unknown_message', 'email_missing', 'email.failed', '2099-08-01 01:04:00+00'
  ),
  'the same event is reconciled after the provider message ID is saved'
);
select is(
  (select status from public.notification_deliveries where event_type = 'order.ready_for_pickup'),
  'FAILED',
  'reconciled event updates the matching delivery'
);
select ok(
  (select processed_at is not null from public.notification_webhook_events where provider_event_id = 'evt_unknown_message'),
  'reconciled event is marked processed'
);

select * from finish();
rollback;
