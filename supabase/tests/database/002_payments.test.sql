begin;

create extension if not exists pgtap with schema extensions;
set local role postgres;
do $$
declare
  pgtap_schema text;
begin
  select pg_namespace.nspname into pgtap_schema
  from pg_extension
  join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
  where pg_extension.extname = 'pgtap';
  execute format('grant usage on schema %I to %I', pgtap_schema, session_user);
end;
$$;
set local role postgres;
select set_config(
  'search_path',
  (
    select quote_ident(pg_namespace.nspname) || ',public'
    from pg_extension
    join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
    where pg_extension.extname = 'pgtap'
  ),
  true
);
select plan(27);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  'a1000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'payment-owner@example.test',
  '{"provider":"google","providers":["google"]}', '{"name":"Payment Owner"}',
  now(), now()
);

insert into public.pickup_locations (id, name)
values ('a2000000-0000-4000-8000-000000000001', 'Payment test location');
insert into public.pickup_dates (id, pickup_date)
values ('a3000000-0000-4000-8000-000000000001', '2099-02-01');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values (
  'a4000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000001', '09:00', '10:00'
);

insert into public.orders (
  id, order_number, user_id, customer_name, customer_email, pickup_date,
  pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at,
  payment_expires_at
)
values (
  'a5000000-0000-4000-8000-000000000001', 'TL-9001',
  'a1000000-0000-4000-8000-000000000001', 'Payment Owner',
  'payment-owner@example.test', '2099-02-01',
  'a4000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001', '9:00 AM–10:00 AM',
  'Payment test location', 40, 40, 'payment-test', now(), now() + interval '15 minutes'
);

select ok(
  not has_function_privilege('authenticated', 'public.prepare_paymongo_checkout(uuid,uuid)', 'EXECUTE'),
  'authenticated users cannot initialize provider payments'
);
select ok(
  has_function_privilege('service_role', 'public.prepare_paymongo_checkout(uuid,uuid)', 'EXECUTE'),
  'service role can initialize provider payments'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.process_paymongo_paid_event(text,uuid,text,text,text,numeric,jsonb)',
    'EXECUTE'
  ),
  'authenticated users cannot process provider webhooks'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.process_paymongo_paid_event(text,uuid,text,text,text,numeric,jsonb)',
    'EXECUTE'
  ),
  'service role can process provider webhooks'
);
select ok(
  not has_function_privilege('authenticated', 'public.list_due_paymongo_checkouts(integer)', 'EXECUTE'),
  'authenticated users cannot list overdue provider checkouts'
);
select ok(
  has_function_privilege('service_role', 'public.list_due_paymongo_checkouts(integer)', 'EXECUTE'),
  'service role can list overdue provider checkouts'
);
select ok(
  not has_function_privilege('authenticated', 'public.expire_paymongo_order(uuid,text)', 'EXECUTE'),
  'authenticated users cannot finalize provider checkout expiry'
);
select ok(
  has_function_privilege('service_role', 'public.expire_paymongo_order(uuid,text)', 'EXECUTE'),
  'service role can finalize provider checkout expiry'
);

select is(
  (
    select prepared_order_number
    from public.prepare_paymongo_checkout(
      'a5000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001'
    )
  ),
  'TL-9001',
  'payment initialization returns the trusted order snapshot'
);
select is(
  (select count(*) from public.payments where order_id = 'a5000000-0000-4000-8000-000000000001'),
  1::bigint,
  'payment initialization creates one payment row'
);
select lives_ok(
  $$select public.prepare_paymongo_checkout(
    'a5000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001'
  )$$,
  'payment initialization can be retried safely'
);
select is(
  (select count(*) from public.payments where order_id = 'a5000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a retry does not create a duplicate payment row'
);
select ok(
  public.attach_paymongo_checkout(
    (select id from public.payments where order_id = 'a5000000-0000-4000-8000-000000000001'),
    'cs_test_9001',
    'https://checkout.paymongo.com/cs_test_9001'
  ),
  'the provider checkout is attached once'
);
select is(
  public.attach_paymongo_checkout(
    (select id from public.payments where order_id = 'a5000000-0000-4000-8000-000000000001'),
    'cs_test_9001',
    'https://checkout.paymongo.com/cs_test_9001'
  ),
  false,
  'reattaching the same checkout is idempotent'
);
select throws_ok(
  $$select public.attach_paymongo_checkout(
    (select id from public.payments where order_id = 'a5000000-0000-4000-8000-000000000001'),
    'cs_test_other',
    'https://checkout.paymongo.com/cs_test_other'
  )$$,
  'P0001',
  'A different PayMongo checkout is already attached',
  'a different provider checkout cannot replace the original'
);

select ok(
  public.process_paymongo_paid_event(
    'checkout_session.payment.paid:cs_test_9001:pay_test_9001',
    'a5000000-0000-4000-8000-000000000001', 'TL-9001',
    'cs_test_9001', 'pay_test_9001', 40,
    '{"livemode":false,"checkout_id":"cs_test_9001","payment_id":"pay_test_9001"}'::jsonb
  ),
  'a matching verified payment event is processed'
);
select is(
  (select payment_status from public.orders where id = 'a5000000-0000-4000-8000-000000000001'),
  'PAID'::public.payment_status,
  'the order payment status becomes paid'
);
select is(
  (select status from public.orders where id = 'a5000000-0000-4000-8000-000000000001'),
  'CONFIRMED'::public.order_status,
  'the paid order becomes confirmed'
);
select is(
  (select provider_payment_id from public.payments where order_id = 'a5000000-0000-4000-8000-000000000001'),
  'pay_test_9001',
  'the provider payment reference is retained'
);
select is(
  public.process_paymongo_paid_event(
    'checkout_session.payment.paid:cs_test_9001:pay_test_9001',
    'a5000000-0000-4000-8000-000000000001', 'TL-9001',
    'cs_test_9001', 'pay_test_9001', 40,
    '{"livemode":false,"checkout_id":"cs_test_9001","payment_id":"pay_test_9001"}'::jsonb
  ),
  false,
  'a duplicate provider event is acknowledged without a second transition'
);
select is(
  (select count(*) from public.payment_webhook_events),
  1::bigint,
  'only one webhook event record is retained for duplicate delivery'
);

insert into public.orders (
  id, order_number, user_id, customer_name, customer_email, pickup_date,
  pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at,
  payment_expires_at
)
values (
  'a5000000-0000-4000-8000-000000000002', 'TL-9002',
  'a1000000-0000-4000-8000-000000000001', 'Payment Owner',
  'payment-owner@example.test', '2099-02-01',
  'a4000000-0000-4000-8000-000000000001',
  'a2000000-0000-4000-8000-000000000001', '9:00 AM–10:00 AM',
  'Payment test location', 40, 40, 'payment-test', now(), now() - interval '1 minute'
);
insert into public.payments (
  id, order_id, provider_checkout_id, provider_checkout_url, amount
)
values (
  'a6000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000002',
  'cs_test_9002', 'https://checkout.paymongo.com/cs_test_9002', 40
);

select is(
  public.expire_pending_orders(),
  0,
  'generic expiry does not release an order with an active provider checkout'
);
select is(
  (select count(*) from public.list_due_paymongo_checkouts(100)),
  1::bigint,
  'the provider-bound overdue order is listed for coordinated expiry'
);
select ok(
  public.expire_paymongo_order(
    'a6000000-0000-4000-8000-000000000002',
    'cs_test_9002'
  ),
  'provider-confirmed expiry finalizes the overdue order'
);
select is(
  (select status from public.orders where id = 'a5000000-0000-4000-8000-000000000002'),
  'EXPIRED'::public.order_status,
  'the coordinated expiry marks the order expired'
);
select is(
  (select status from public.payments where id = 'a6000000-0000-4000-8000-000000000002'),
  'FAILED'::public.payment_status,
  'the coordinated expiry marks the unpaid payment failed'
);
select is(
  public.expire_paymongo_order(
    'a6000000-0000-4000-8000-000000000002',
    'cs_test_9002'
  ),
  false,
  'coordinated expiry is idempotent after the first transition'
);

select * from finish();
rollback;
