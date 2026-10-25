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

select plan(33);

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
where id = (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000001');

insert into public.pickup_locations (id, name)
values ('3658481664000001', 'Dashboard location');
insert into public.pickup_dates (id, pickup_date)
values ('3659530240000001', '2099-06-10');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('3660578816000001', '3659530240000001', '10:00', '11:00');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, discount_total, total, terms_version,
  terms_accepted_at, created_at, completed_at
) values
  (
    '3661627392000001', 'TL-9401',
    (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'), 'COMPLETED', 'PAID',
    'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10',
    '3660578816000001', '3658481664000001',
    '10:00 AM–11:00 AM', 'Dashboard location', 50, 0, 50, 'dashboard-test',
    '2099-05-01 09:00+08', '2099-05-01 09:00+08', '2099-05-01 11:00+08'
  ),
  (
    '3661627392000002', 'TL-9402',
    (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'), 'PAID', 'PAID',
    'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10',
    '3660578816000001', '3658481664000001',
    '10:00 AM–11:00 AM', 'Dashboard location', 100, 0, 100, 'dashboard-test',
    '2099-06-02 09:00+08', '2099-06-02 09:00+08', null
  ),
  (
    '3661627392000003', 'TL-9403',
    (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'), 'PAID', 'PAID',
    'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10',
    '3660578816000001', '3658481664000001',
    '10:00 AM–11:00 AM', 'Dashboard location', 40, 40, 0, 'dashboard-test',
    '2099-06-03 09:00+08', '2099-06-03 09:00+08', null
  );

insert into public.payments (order_id, provider, amount, status, paid_at) values
  ('3661627392000001', 'paymongo', 50, 'PAID', '2099-05-01 10:00+08'),
  ('3661627392000002', 'paymongo', 100, 'PAID', '2099-06-02 10:00+08'),
  ('3661627392000003', 'loyalty', 0, 'PAID', '2099-06-03 10:00+08');

insert into public.order_items (
  id, order_id, product_id, variant_id, product_name_snapshot, variant_name_snapshot,
  piece_count_snapshot, unit_price_snapshot, quantity, line_subtotal
) values
  ('3662675968000001', '3661627392000001', '1', '1', 'Chocolate-Filled Litaw', 'TsokoMini (4 pcs)', 4, 50, 1, 50),
  ('3662675968000002', '3661627392000002', '1', '1', 'Chocolate-Filled Litaw', 'TsokoMini (4 pcs)', 4, 50, 2, 100),
  ('3662675968000003', '3661627392000003', '1', '3', 'Chocolate-Filled Litaw', 'TsokoMuch (8 pcs)', 8, 40, 1, 40);

insert into public.order_item_addons (
  order_item_id, addon_id, addon_name_snapshot, unit_price_snapshot, quantity, line_total, is_complimentary
) values (
  '3662675968000002', '1',
  'Sea salt cream', 18, 1, 18, false
);

insert into public.order_item_coatings (
  order_item_id, coating_id, coating_name_snapshot, piece_count, additional_price_snapshot
) values
  ('3662675968000002', '1', 'Cocoa', 4, 5),
  ('3662675968000003', '2', 'Milk', 8, 5);

update public.orders
set status = 'COMPLETED', completed_at = '2099-06-02 12:00+08'
where id = '3661627392000002';

insert into public.reviews (
  user_id, order_id, display_name_snapshot, rating, comment, is_visible, created_at
) values (
  (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'), '3661627392000002',
  'Dashboard Buyer', 5, 'Dashboard test review', true, '2099-06-04 10:00+08'
);

create temporary table dashboard_result as
select public.get_admin_dashboard_summary(
  (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000001'),
  '2099-06-01 00:00+08', '2099-06-08 00:00+08',
  '2099-05-25 00:00+08', '2099-06-01 00:00+08'
) as summary;

select is((summary->'current'->>'paidSales')::numeric, 100::numeric, 'paid sales use confirmed payment time') from dashboard_result;
select is((summary->'current'->>'paidOrders')::integer, 2, 'paid orders include zero-total loyalty orders') from dashboard_result;
select is((summary->'current'->>'averageOrderValue')::numeric, 100::numeric, 'average order value excludes zero-total orders') from dashboard_result;
select is((summary->'current'->>'purchasingCustomers')::integer, 1, 'purchasing customers are distinct identified buyers') from dashboard_result;
select is((summary->'current'->>'repeatCustomers')::integer, 1, 'returning buyers require an earlier paid order') from dashboard_result;
select is((summary->'current'->>'repeatCustomerRate')::numeric, 100::numeric, 'repeat-buyer share uses current purchasing customers') from dashboard_result;
select is((summary->'current'->>'boxesSold')::integer, 3, 'boxes sold use paid order item quantities') from dashboard_result;
select is((summary->'current'->>'piecesSold')::integer, 16, 'pieces sold use immutable piece snapshots') from dashboard_result;
select is((summary->'current'->>'extraSales')::numeric, 36::numeric, 'paid extra sales account for boxes ordered') from dashboard_result;
select is((select sum((point->>'boxes')::integer) from dashboard_result, jsonb_array_elements(summary->'boxMix') point), 3::bigint, 'box mix covers paid boxes in the period') from dashboard_result;
select is((select sum((point->>'paidOrders')::integer) from dashboard_result, jsonb_array_elements(summary->'paymentMix') point), 2::bigint, 'payment mix covers confirmed payments in the period') from dashboard_result;
select is(jsonb_array_length(summary->'dailySales'), 7, 'daily sales include zero-filled Manila calendar days') from dashboard_result;
select is((select sum((point->>'paidOrders')::integer) from dashboard_result, jsonb_array_elements(summary->'dailySales') point), 2::bigint, 'daily paid-order totals match the period') from dashboard_result;
select is((select sum((point->>'count')::integer) from dashboard_result, jsonb_array_elements(summary->'orderOutcomes') point), 2::bigint, 'order outcomes cover the full creation cohort') from dashboard_result;
select throws_ok(
  $$ select public.get_admin_dashboard_summary(
    (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'),
    '2099-06-01 00:00+08', '2099-06-08 00:00+08',
    '2099-05-25 00:00+08', '2099-06-01 00:00+08'
  ) $$,
  'P0001', 'Active Admin access is required',
  'non-Admin callers cannot request dashboard aggregates'
);

create temporary table dashboard_decisions as
select public.get_admin_dashboard_decisions(
  (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000001'),
  '2099-06-01 00:00+08', '2099-06-08 00:00+08',
  '2099-05-25 00:00+08', '2099-06-01 00:00+08'
) as summary;

select is((summary->'currentDecisionMetrics'->>'completionRate')::numeric, 0::numeric, 'future-pickup orders do not lower matured completion rate') from dashboard_decisions;
select is((summary->'currentDecisionMetrics'->>'averageFulfillmentHours')::numeric, 2::numeric, 'fulfillment time runs from payment to completion') from dashboard_decisions;
select is((summary->'currentDecisionMetrics'->>'eligibleOrders')::integer, 0, 'only pickup dates before today enter the matured completion cohort') from dashboard_decisions;
select is((summary->'currentDecisionMetrics'->>'durationSampleSize')::integer, 1, 'payment-to-completion duration exposes its sample size') from dashboard_decisions;
select is((summary->'funnel'->>'created')::integer, 2, 'funnel starts from one creation cohort') from dashboard_decisions;
select is((summary->'funnel'->>'paid')::integer, 2, 'funnel paid stage follows the same creation cohort') from dashboard_decisions;
select is((summary->'funnel'->>'completed')::integer, 1, 'funnel completed stage follows the same creation cohort') from dashboard_decisions;
select is(jsonb_typeof(summary->'inventoryByDate'), 'array', 'dashboard returns date-specific inventory projections') from dashboard_decisions;
select is(jsonb_typeof(summary->'recentOrders'), 'array', 'dashboard returns a bounded recent-order projection') from dashboard_decisions;
select ok((summary->>'generatedAt') is not null, 'dashboard includes a freshness timestamp') from dashboard_decisions;
select is((select sum((point->>'pieces')::integer) from dashboard_decisions, jsonb_array_elements(summary->'coatingMix') point), 16::bigint, 'coating mix counts paid pieces') from dashboard_decisions;
select is((summary->'reviews'->>'count')::integer, 1, 'review metrics follow the reporting period') from dashboard_decisions;
select is((summary->'reviews'->>'averageRating')::numeric, 5::numeric, 'review metrics include average rating') from dashboard_decisions;
select is((summary->'reviewOperations'->>'visible')::integer, 1, 'review operations include all visible reviews') from dashboard_decisions;
select is((summary->'reviewOperations'->>'featured')::integer, 0, 'review operations include all featured reviews') from dashboard_decisions;

insert into public.orders (
  id, order_number, user_id, checkout_idempotency_key, status, payment_status,
  customer_name, customer_email, pickup_date, pickup_window_id, pickup_location_id,
  pickup_window_snapshot, pickup_location_snapshot, subtotal, discount_total, total,
  terms_version, terms_accepted_at, created_at
) values
  ('3663724544000001', 'TL-9998', (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'), 'da700000-0000-4000-8000-000000000001', 'PENDING_PAYMENT', 'PENDING', 'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10', '3660578816000001', '3658481664000001', '10:00 AM–11:00 AM', 'Dashboard location', 50, 0, 50, 'dashboard-test', '2099-06-04 09:00+08', '2099-06-04 09:00+08'),
  ('3663724544000002', 'TL-9999', (select id from public.profiles where auth_user_id='da000000-0000-4000-8000-000000000002'), 'da700000-0000-4000-8000-000000000002', 'PENDING_PAYMENT', 'PENDING', 'Dashboard Buyer', 'dashboard-buyer@example.test', '2099-06-10', '3660578816000001', '3658481664000001', '10:00 AM–11:00 AM', 'Dashboard location', 50, 0, 50, 'dashboard-test', '2099-06-04 09:00+08', '2099-06-04 09:01+08');

select is((select order_number from public.orders where id = '3663724544000001'), 'TL040699001', 'first checkout receives the first daily order number');
select is((select order_number from public.orders where id = '3663724544000002'), 'TL040699002', 'daily order numbers increment atomically');
select is((select last_value from public.daily_order_counters where order_date = '2099-06-04'), 2, 'daily order counter records the allocated suffix');

select * from finish();
rollback;
