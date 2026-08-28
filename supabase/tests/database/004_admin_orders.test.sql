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
select plan(13);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    'c1000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase11-admin@example.test',
    '{"provider":"google","providers":["google"]}', '{"name":"Phase 11 Admin"}',
    now(), now()
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase11-customer@example.test',
    '{"provider":"google","providers":["google"]}', '{"name":"Phase 11 Customer"}',
    now(), now()
  );

update public.profiles set role = 'admin'
where id = 'c1000000-0000-4000-8000-000000000001';

insert into public.pickup_locations (id, name)
values ('c2000000-0000-4000-8000-000000000001', 'Phase 11 test location');
insert into public.pickup_dates (id, pickup_date)
values ('c3000000-0000-4000-8000-000000000001', '2099-04-01');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values (
  'c4000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000001',
  '10:00', '11:00'
);

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at
) values (
  'c5000000-0000-4000-8000-000000000001', 'TL-9201',
  'c1000000-0000-4000-8000-000000000002', 'CONFIRMED', 'PAID',
  'Phase 11 Customer', 'phase11-customer@example.test', '2099-04-01',
  'c4000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  '10:00 AM–11:00 AM', 'Phase 11 test location', 40, 40, 'phase11-test', now()
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.transition_order_status(uuid,uuid,public.order_status,public.order_status)',
    'EXECUTE'
  ),
  'authenticated clients cannot transition fulfillment directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.transition_order_status(uuid,uuid,public.order_status,public.order_status)',
    'EXECUTE'
  ),
  'service role can invoke the controlled fulfillment transition'
);

select is(
  public.transition_order_status(
    'c1000000-0000-4000-8000-000000000001',
    'c5000000-0000-4000-8000-000000000001',
    'CONFIRMED', 'PREPARING'
  ),
  'PREPARING'::public.order_status,
  'received order can enter preparation'
);
select is(
  (select status from public.orders where id = 'c5000000-0000-4000-8000-000000000001'),
  'PREPARING'::public.order_status,
  'preparing status is persisted'
);
select is(
  public.transition_order_status(
    'c1000000-0000-4000-8000-000000000001',
    'c5000000-0000-4000-8000-000000000001',
    'PREPARING', 'READY_FOR_PICKUP'
  ),
  'READY_FOR_PICKUP'::public.order_status,
  'preparing order can become ready for pickup'
);
select is(
  public.transition_order_status(
    'c1000000-0000-4000-8000-000000000001',
    'c5000000-0000-4000-8000-000000000001',
    'READY_FOR_PICKUP', 'COMPLETED'
  ),
  'COMPLETED'::public.order_status,
  'ready order can be completed'
);
select ok(
  (select completed_at is not null from public.orders where id = 'c5000000-0000-4000-8000-000000000001'),
  'completion records its timestamp'
);
select is(
  (select count(*)::integer from public.admin_audit_logs
   where entity_id = 'c5000000-0000-4000-8000-000000000001'),
  3,
  'every fulfillment transition creates an audit record'
);
select is(
  (select count(*)::integer from public.admin_audit_logs
   where entity_id = 'c5000000-0000-4000-8000-000000000001'
     and metadata ->> 'from_status' = 'READY_FOR_PICKUP'),
  1,
  'audit metadata records the previous status'
);
select is(
  (select count(*)::integer from public.admin_audit_logs
   where entity_id = 'c5000000-0000-4000-8000-000000000001'
     and metadata ->> 'to_status' = 'COMPLETED'),
  1,
  'audit metadata records the new status'
);
select throws_ok(
  $$select public.transition_order_status(
    'c1000000-0000-4000-8000-000000000001',
    'c5000000-0000-4000-8000-000000000001',
    'COMPLETED', 'PREPARING'
  )$$,
  'P0001', 'That order status transition is not allowed',
  'completed orders cannot move backward'
);
select throws_ok(
  $$select public.transition_order_status(
    'c1000000-0000-4000-8000-000000000002',
    'c5000000-0000-4000-8000-000000000001',
    'COMPLETED', 'PREPARING'
  )$$,
  'P0001', 'Active administrator access is required',
  'customers cannot be supplied as fulfillment administrators'
);
select is(
  (select count(*)::integer from public.admin_audit_logs
   where entity_id = 'c5000000-0000-4000-8000-000000000001'),
  3,
  'rejected transitions do not create audit records'
);

select * from finish();
rollback;
