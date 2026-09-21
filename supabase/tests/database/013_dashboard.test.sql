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

select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    'da000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'dashboard-admin@example.test',
    '{"provider":"google","providers":["google"]}', '{"name":"Dashboard Admin"}', now(), now()
  ),
  (
    'da000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'dashboard-buyer@example.test',
    '{"provider":"google","providers":["google"]}', '{"name":"Dashboard Buyer"}', now(), now()
  );

update public.profiles set role = 'admin'
where id = 'da000000-0000-4000-8000-000000000001';

insert into public.pickup_locations (id, name)
values ('da100000-0000-4000-8000-000000000001', 'Dashboard location');
insert into public.pickup_dates (id, pickup_date)
values ('da200000-0000-4000-8000-000000000001', '2099-06-10');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('da300000-0000-4000-8000-000000000001', 'da200000-0000-4000-8000-000000000001', '10:00', '11:00');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, discount_total, total, terms_version,
  terms_accepted_at, created_at, completed_at
) values
  (
    'da400000-0000-4000-8000-000000000001', 'TL-9401',
    'da000000-0000-4000-8000-000000000002', 'COMPLETED', 'PAID',
    'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10',
    'da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001',
    '10:00 AM–11:00 AM', 'Dashboard location', 50, 0, 50, 'dashboard-test',
    '2099-05-01 09:00+08', '2099-05-01 09:00+08', '2099-05-01 11:00+08'
  ),
  (
    'da400000-0000-4000-8000-000000000002', 'TL-9402',
    'da000000-0000-4000-8000-000000000002', 'PAID', 'PAID',
    'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10',
    'da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001',
    '10:00 AM–11:00 AM', 'Dashboard location', 100, 0, 100, 'dashboard-test',
    '2099-06-02 09:00+08', '2099-06-02 09:00+08', null
  ),
  (
    'da400000-0000-4000-8000-000000000003', 'TL-9403',
    'da000000-0000-4000-8000-000000000002', 'PAID', 'PAID',
    'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10',
    'da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001',
    '10:00 AM–11:00 AM', 'Dashboard location', 40, 40, 0, 'dashboard-test',
    '2099-06-03 09:00+08', '2099-06-03 09:00+08', null
  );

insert into public.payments (order_id, provider, amount, status, paid_at) values
  ('da400000-0000-4000-8000-000000000001', 'paymongo', 50, 'PAID', '2099-05-01 10:00+08'),
  ('da400000-0000-4000-8000-000000000002', 'paymongo', 100, 'PAID', '2099-06-02 10:00+08'),
  ('da400000-0000-4000-8000-000000000003', 'loyalty', 0, 'PAID', '2099-06-03 10:00+08');

create temporary table dashboard_result as
select public.get_admin_dashboard_summary(
  'da000000-0000-4000-8000-000000000001',
  '2099-06-01 00:00+08', '2099-06-08 00:00+08',
  '2099-05-25 00:00+08', '2099-06-01 00:00+08'
) as summary;

select is((summary->'current'->>'paidSales')::numeric, 100::numeric, 'paid sales use confirmed payment time') from dashboard_result;
select is((summary->'current'->>'paidOrders')::integer, 2, 'paid orders include zero-total loyalty orders') from dashboard_result;
select is((summary->'current'->>'averageOrderValue')::numeric, 100::numeric, 'average order value excludes zero-total orders') from dashboard_result;
select is((summary->'current'->>'purchasingCustomers')::integer, 1, 'purchasing customers are distinct identified buyers') from dashboard_result;
select is((summary->'current'->>'repeatCustomers')::integer, 1, 'returning buyers require an earlier paid order') from dashboard_result;
select is((summary->'current'->>'repeatCustomerRate')::numeric, 100::numeric, 'repeat-buyer share uses current purchasing customers') from dashboard_result;
select is(jsonb_array_length(summary->'dailySales'), 7, 'daily sales include zero-filled Manila calendar days') from dashboard_result;
select is((select sum((point->>'paidOrders')::integer) from dashboard_result, jsonb_array_elements(summary->'dailySales') point), 2::bigint, 'daily paid-order totals match the period') from dashboard_result;
select is((select sum((point->>'count')::integer) from dashboard_result, jsonb_array_elements(summary->'orderOutcomes') point), 2::bigint, 'order outcomes cover the full creation cohort') from dashboard_result;
select throws_ok(
  $$ select public.get_admin_dashboard_summary(
    'da000000-0000-4000-8000-000000000002',
    '2099-06-01 00:00+08', '2099-06-08 00:00+08',
    '2099-05-25 00:00+08', '2099-06-01 00:00+08'
  ) $$,
  'P0001', 'Active Admin access is required',
  'non-Admin callers cannot request dashboard aggregates'
);

select * from finish();
rollback;
