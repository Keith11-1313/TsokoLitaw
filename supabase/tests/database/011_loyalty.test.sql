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
select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('da000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'loyalty-admin@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Loyalty Admin"}', now(), now()),
  ('da000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'loyalty-customer@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Loyalty Customer"}', now(), now());

update public.profiles set role = 'admin' where id = 'da000000-0000-4000-8000-000000000001';
insert into public.pickup_locations (id, name) values ('da100000-0000-4000-8000-000000000001', 'Loyalty test location');
insert into public.pickup_dates (id, pickup_date, availability_mode) values ('da200000-0000-4000-8000-000000000001', '2099-06-01', 'MADE_TO_ORDER');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time) values ('da300000-0000-4000-8000-000000000001', 'da200000-0000-4000-8000-000000000001', '10:00', '11:00');
insert into public.pickup_window_locations (pickup_window_id, pickup_location_id) values ('da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at
)
select
  ('da400000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  'TL-94' || lpad(value::text, 2, '0'),
  'da000000-0000-4000-8000-000000000002',
  'READY_FOR_PICKUP', 'PAID', 'Loyalty Customer', 'loyalty-customer@example.test',
  '2099-06-01', 'da300000-0000-4000-8000-000000000001',
  'da100000-0000-4000-8000-000000000001', '10:00 AM–11:00 AM',
  'Loyalty test location', 40, 40, 'loyalty-test', now()
from generate_series(1, 7) value;

select public.transition_order_status(
  'da000000-0000-4000-8000-000000000001',
  ('da400000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  'READY_FOR_PICKUP', 'COMPLETED'
)
from generate_series(1, 7) value;

select is((select completed_order_count from public.loyalty_accounts where user_id = 'da000000-0000-4000-8000-000000000002'), 7, 'seven completed orders are counted exactly once');
select is((select count(*) from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002'), 1::bigint, 'the seventh completion earns one reward');
select is((select status from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002'), 'earned'::public.loyalty_reward_status, 'new rewards begin available');
select is((select source_order_id from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002'), 'da400000-0000-4000-8000-000000000007'::uuid, 'the threshold-completing order is the reward source');

select is((
  select created_total from public.create_pending_order(
    'da000000-0000-4000-8000-000000000002', 'da500000-0000-4000-8000-000000000001',
    'da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001',
    'Loyalty Customer', null, null,
    '[{"product_id":"10000000-0000-4000-8000-000000000001","product_name":"Chocolate-Filled Litaw","variant_id":"11000000-0000-4000-8000-000000000004","variant_name":"Box of 4","piece_count":4,"base_unit_price":40,"extra_coating_total":0,"quantity":1,"line_subtotal":40,"coatings":[{"id":"12000000-0000-4000-8000-000000000001","name":"Cocoa","piece_count":4,"additional_price":0,"is_included_type":true}],"addon":null}]'::jsonb,
    40, 40, 0, 'loyalty-test',
    (select id from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002')
  )
), 0::numeric, 'one reward discounts one base 4-piece box');
select is((select status from public.orders where checkout_idempotency_key = 'da500000-0000-4000-8000-000000000001'), 'CONFIRMED'::public.order_status, 'a zero-total reward order skips hosted payment and is confirmed');
select is((select provider from public.payments where order_id = (select id from public.orders where checkout_idempotency_key = 'da500000-0000-4000-8000-000000000001')), 'loyalty', 'a zero-total reward order records its settlement');
select is((select status from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002'), 'redeemed'::public.loyalty_reward_status, 'the reward is atomically bound to the created order');

select throws_ok(
  $$select * from public.create_pending_order(
    'da000000-0000-4000-8000-000000000002', 'da500000-0000-4000-8000-000000000002',
    'da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001',
    'Loyalty Customer', null, null,
    '[{"product_id":"10000000-0000-4000-8000-000000000001","product_name":"Chocolate-Filled Litaw","variant_id":"11000000-0000-4000-8000-000000000004","variant_name":"Box of 4","piece_count":4,"base_unit_price":40,"extra_coating_total":0,"quantity":1,"line_subtotal":40,"coatings":[{"id":"12000000-0000-4000-8000-000000000001","name":"Cocoa","piece_count":4,"additional_price":0,"is_included_type":true}],"addon":null}]'::jsonb,
    40, 40, 0, 'loyalty-test',
    (select id from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002')
  )$$,
  'P0001', 'The selected loyalty reward is unavailable',
  'a redeemed reward cannot be used for a second order'
);

update public.orders set status = 'CANCELLED' where checkout_idempotency_key = 'da500000-0000-4000-8000-000000000001';
select is((select status from public.loyalty_rewards where user_id = 'da000000-0000-4000-8000-000000000002'), 'earned'::public.loyalty_reward_status, 'cancelling the redeemed order restores the reward');

select * from finish();
rollback;
