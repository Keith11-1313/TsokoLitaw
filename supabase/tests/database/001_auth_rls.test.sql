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
select plan(29);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('91000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-owner@example.test', '{"provider":"google","providers":["google"]}', '{"name":"RLS Owner"}', now(), now()),
  ('91000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-other@example.test', '{"provider":"google","providers":["google"]}', '{"name":"RLS Other"}', now(), now()),
  ('91000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@example.test', '{"provider":"google","providers":["google"]}', '{"name":"RLS Admin"}', now(), now()),
  ('91000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-deletion@example.test', '{"provider":"google","providers":["google"]}', '{"name":"RLS Deletion"}', now(), now());

update public.profiles
set role = 'admin'
where id = '91000000-0000-4000-8000-000000000003';

insert into public.pickup_locations (id, name)
values ('92000000-0000-4000-8000-000000000001', 'RLS test location');

insert into public.pickup_dates (id, pickup_date)
values ('93000000-0000-4000-8000-000000000001', '2099-01-01');

update public.pickup_dates
set availability_mode = 'READY_STOCK'
where id = '93000000-0000-4000-8000-000000000001';

insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('94000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '09:00', '10:00');

insert into public.pickup_window_locations (pickup_window_id, pickup_location_id)
values ('94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001');

update public.terms_versions
set is_current = false
where is_current;

insert into public.terms_versions (version, content, effective_at, is_current)
values ('rls-test-v1', 'Test terms', now() - interval '1 day', true);

insert into public.daily_inventory (
  pickup_date,
  product_variant_id,
  stock_total,
  stock_reserved,
  stock_sold
)
values (
  '2099-01-01',
  '11000000-0000-4000-8000-000000000004',
  10,
  0,
  0
);

insert into public.orders (
  id, order_number, user_id, customer_name, customer_email, pickup_date,
  pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at
)
values
  ('95000000-0000-4000-8000-000000000001', 'RLS-OWNER', '91000000-0000-4000-8000-000000000001', 'RLS Owner', 'rls-owner@example.test', '2099-01-01', '94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '9:00 AM–10:00 AM', 'RLS test location', 40, 40, 'rls-test', now()),
  ('95000000-0000-4000-8000-000000000002', 'RLS-OTHER', '91000000-0000-4000-8000-000000000002', 'RLS Other', 'rls-other@example.test', '2099-01-01', '94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '9:00 AM–10:00 AM', 'RLS test location', 40, 40, 'rls-test', now());

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is((select count(*) from public.profiles), 1::bigint, 'customer reads only their own profile');
select is((select count(*) from public.profiles where id = '91000000-0000-4000-8000-000000000002'), 0::bigint, 'customer cannot read another profile');
select is((select count(*) from public.orders), 1::bigint, 'customer reads only their own order');
select is((select count(*) from public.orders where user_id = '91000000-0000-4000-8000-000000000002'), 0::bigint, 'customer cannot read another order');
select ok(not public.is_admin(), 'customer does not satisfy the admin role check');
select throws_ok(
  $$update public.profiles set role = 'admin' where id = '91000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'customer cannot promote their own profile'
);

select throws_ok(
  $$select public.request_account_deletion()$$,
  'P0001',
  'Account deletion is unavailable while orders or refunds are active',
  'customer with an active order cannot schedule deletion'
);

set local role postgres;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);
set local role authenticated;

select lives_ok(
  $$select public.request_account_deletion()$$,
  'eligible customer can schedule account deletion'
);
select ok(
  (
    select deletion_scheduled_for = deletion_requested_at + interval '90 days'
    from public.profiles
    where id = '91000000-0000-4000-8000-000000000004'
  ),
  'account deletion uses an exact 90-day grace period'
);
select is(
  (
    select count(*)
    from public.profiles
    where id = '91000000-0000-4000-8000-000000000002'
      and deletion_scheduled_for is not null
  ),
  0::bigint,
  'customer cannot schedule another account for deletion'
);
select lives_ok(
  $$select public.cancel_account_deletion()$$,
  'customer can cancel account deletion during the grace period'
);
select is(
  (
    select deletion_scheduled_for
    from public.profiles
    where id = '91000000-0000-4000-8000-000000000004'
  ),
  null::timestamptz,
  'cancelling clears the deletion schedule'
);

set local role postgres;
select is(
  (
    select was_created
    from public.create_pending_order(
      '91000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      'RLS Owner',
      null,
      null,
      '[{"product_id":"10000000-0000-4000-8000-000000000001","product_name":"Chocolate-Filled Litaw","variant_id":"11000000-0000-4000-8000-000000000004","variant_name":"Box of 4","piece_count":4,"base_unit_price":40,"extra_coating_total":0,"quantity":1,"line_subtotal":40,"coatings":[{"id":"12000000-0000-4000-8000-000000000001","name":"Cocoa","piece_count":4,"additional_price":0,"is_included_type":true}],"addon":null}]'::jsonb,
      40,
      0,
      40,
      'rls-test-v1'
    )
  ),
  true,
  'service-only writer atomically creates a pending order'
);
select is(
  (
    select was_created
    from public.create_pending_order(
      '91000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      'RLS Owner', null, null,
      '[{"product_id":"10000000-0000-4000-8000-000000000001","product_name":"Chocolate-Filled Litaw","variant_id":"11000000-0000-4000-8000-000000000004","variant_name":"Box of 4","piece_count":4,"base_unit_price":40,"extra_coating_total":0,"quantity":1,"line_subtotal":40,"coatings":[{"id":"12000000-0000-4000-8000-000000000001","name":"Cocoa","piece_count":4,"additional_price":0,"is_included_type":true}],"addon":null}]'::jsonb,
      40, 0, 40, 'rls-test-v1'
    )
  ),
  false,
  'reusing a checkout key returns the existing order'
);
select is(
  (
    select count(*)
    from public.orders
    where checkout_idempotency_key = '96000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'checkout idempotency prevents duplicate order rows'
);
select is(
  (
    select stock_reserved
    from public.daily_inventory
    where pickup_date = '2099-01-01'
      and product_variant_id = '11000000-0000-4000-8000-000000000004'
  ),
  1,
  'pending ready-stock checkout reserves inventory'
);

update public.orders
set payment_expires_at = now() - interval '1 minute'
where checkout_idempotency_key = '96000000-0000-4000-8000-000000000001';

select is(
  public.expire_pending_orders(),
  1,
  'expiration processor handles the overdue pending order'
);
select is(
  (
    select status
    from public.orders
    where checkout_idempotency_key = '96000000-0000-4000-8000-000000000001'
  ),
  'EXPIRED'::public.order_status,
  'overdue unpaid order becomes expired'
);
select is(
  (
    select stock_reserved
    from public.daily_inventory
    where pickup_date = '2099-01-01'
      and product_variant_id = '11000000-0000-4000-8000-000000000004'
  ),
  0,
  'expiration releases ready-stock inventory'
);

select is(
  (
    select was_created
    from public.create_pending_order(
      '91000000-0000-4000-8000-000000000003',
      '96000000-0000-4000-8000-000000000003',
      '94000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      'RLS Admin', null, null,
      '[{"product_id":"10000000-0000-4000-8000-000000000001","product_name":"Chocolate-Filled Litaw","variant_id":"11000000-0000-4000-8000-000000000004","variant_name":"Box of 4","piece_count":4,"base_unit_price":40,"extra_coating_total":0,"quantity":1,"line_subtotal":40,"coatings":[{"id":"12000000-0000-4000-8000-000000000001","name":"Cocoa","piece_count":4,"additional_price":0,"is_included_type":true}],"addon":null}]'::jsonb,
      40, 0, 40, 'rls-test-v1'
    )
  ),
  true,
  'active admin can place their own customer order'
);
select ok(
  (
    select order_number ~ '^TL-[0-9]{4,}$'
    from public.orders
    where checkout_idempotency_key = '96000000-0000-4000-8000-000000000003'
  ),
  'new orders receive a short shared kiosk number'
);

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name,
  customer_email, pickup_date, pickup_window_id, pickup_location_id,
  pickup_window_snapshot, pickup_location_snapshot, subtotal, total,
  terms_version, terms_accepted_at, completed_at
)
values (
  '95000000-0000-4000-8000-000000000003', 'RLS-DEACTIVATED',
  '91000000-0000-4000-8000-000000000004', 'COMPLETED', 'PAID',
  'RLS Deletion', 'rls-deletion@example.test', '2099-01-01',
  '94000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001', '9:00 AM–10:00 AM',
  'RLS test location', 40, 40, 'rls-test', now(), now()
);

update public.profiles
set deletion_requested_at = now() - interval '91 days',
    deletion_scheduled_for = now() - interval '1 day'
where id = '91000000-0000-4000-8000-000000000004';

select ok(
  public.deactivate_due_account('91000000-0000-4000-8000-000000000004'),
  'due eligible customer account is deactivated'
);
select is(
  (select is_active from public.profiles where id = '91000000-0000-4000-8000-000000000004'),
  false,
  'deactivation marks the profile inactive'
);
select ok(
  (select deactivated_at is not null from public.profiles where id = '91000000-0000-4000-8000-000000000004'),
  'deactivation records its timestamp'
);
select is(
  (select user_id from public.orders where order_number = 'RLS-DEACTIVATED'),
  '91000000-0000-4000-8000-000000000004'::uuid,
  'deactivation preserves the order-to-profile relationship'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select is(
  (select count(*) from public.profiles),
  0::bigint,
  'inactive customer cannot read their retained profile'
);

set local role postgres;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;

select ok(public.is_admin(), 'approved admin satisfies the server-side role check');
select is(
  (
    select count(*)
    from public.orders
    where user_id in (
      '91000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000002',
      '91000000-0000-4000-8000-000000000003',
      '91000000-0000-4000-8000-000000000004'
    )
  ),
  5::bigint,
  'approved admin can read customer orders'
);
select throws_ok(
  $$select public.request_account_deletion()$$,
  'P0001',
  'Admin accounts require controlled removal',
  'admin cannot self-schedule destructive account deletion'
);

select * from finish();
rollback;
