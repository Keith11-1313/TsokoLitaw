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
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    'ca000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'customers-admin@example.test',
    '{"provider":"google","providers":["google"]}', '{"name":"Customers Admin"}',
    now(), now()
  ),
  (
    'ca000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'customer-summary@example.test',
    '{"provider":"google","providers":["google"]}', '{"name":"Summary Customer"}',
    now(), now()
  );

update public.profiles set role = 'admin'
where id = 'ca000000-0000-4000-8000-000000000001';

insert into public.pickup_locations (id, name)
values ('ca100000-0000-4000-8000-000000000001', 'Customer summary test location');
insert into public.pickup_dates (id, pickup_date)
values ('ca200000-0000-4000-8000-000000000001', '2099-05-01');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('ca300000-0000-4000-8000-000000000001', 'ca200000-0000-4000-8000-000000000001', '10:00', '11:00');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at,
  completed_at
) values (
  'ca400000-0000-4000-8000-000000000001', 'TL-9301',
  'ca000000-0000-4000-8000-000000000002', 'COMPLETED', 'PAID',
  'Summary Customer', 'customer-summary@example.test', '2099-05-01',
  'ca300000-0000-4000-8000-000000000001',
  'ca100000-0000-4000-8000-000000000001',
  '10:00 AM–11:00 AM', 'Customer summary test location', 40, 40,
  'customers-test', now(), now()
);

update public.loyalty_accounts
set completed_order_count = 1
where user_id = 'ca000000-0000-4000-8000-000000000002';
insert into public.loyalty_rewards (user_id, reward_type, threshold, source_order_id)
values ('ca000000-0000-4000-8000-000000000002', 'FREE_4_PIECE', 7, 'ca400000-0000-4000-8000-000000000001');

select lives_ok(
  $$ select * from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000001', null, 100
  ) $$,
  'an active Admin can read bounded customer summaries'
);
select is(
  (select count(*) from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000001', 'summary', 100
  )),
  1::bigint,
  'customer search matches name or email'
);
select is(
  (select completed_orders from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000001', 'summary', 100
  )),
  1::bigint,
  'the summary counts completed orders'
);
select is(
  (select completed_spend from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000001', 'summary', 100
  )),
  40::numeric,
  'the summary totals completed paid value'
);
select is(
  (select loyalty_completed_orders from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000001', 'summary', 100
  )),
  1,
  'the summary includes loyalty completion progress'
);
select is(
  (select available_rewards from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000001', 'summary', 100
  )),
  1::bigint,
  'the summary includes available loyalty rewards'
);
select throws_ok(
  $$ select * from public.get_admin_customer_summaries(
    'ca000000-0000-4000-8000-000000000002', null, 100
  ) $$,
  'P0001',
  'Active Admin access required',
  'a customer identity cannot read Admin aggregates'
);

select * from finish();
rollback;
