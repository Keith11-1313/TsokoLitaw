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

select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('9a000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pickup-admin@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Pickup Admin"}', now(), now()),
  ('9a000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pickup-customer@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Pickup Customer"}', now(), now());

update public.profiles set role = 'admin'
where id = '9a000000-0000-4000-8000-000000000001';

select throws_ok(
  $$ select public.upsert_pickup_location(
    '9a000000-0000-4000-8000-000000000002', null,
    'Unauthorized location', 'Should fail', true
  ) $$,
  'P0001',
  'Active administrator access is required',
  'a customer cannot create a Pickup location'
);
select lives_ok(
  $$ select public.upsert_pickup_location(
    '9a000000-0000-4000-8000-000000000001', null,
    'UCC Test Lobby', 'Testing entrance', true
  ) $$,
  'an active Admin can create a Pickup location'
);
select is(
  (select count(*) from public.pickup_locations where name = 'UCC Test Lobby' and is_active),
  1::bigint,
  'the new active Pickup location is persisted'
);

select throws_ok(
  $$ select public.upsert_pickup_schedule(
    '9a000000-0000-4000-8000-000000000002', null, '2099-03-01',
    'READY_STOCK', true, null,
    '[{"start_time":"08:00","end_time":"09:00","location_ids":["14000000-0000-4000-8000-000000000001"]}]'
  ) $$,
  'P0001',
  'Active administrator access is required',
  'a customer cannot publish a pickup schedule'
);

select lives_ok(
  $$ select public.upsert_pickup_schedule(
    '9a000000-0000-4000-8000-000000000001', null, '2099-03-01',
    'READY_STOCK', true, 'school batch',
    '[{"start_time":"08:00","end_time":"09:00","location_ids":["14000000-0000-4000-8000-000000000001","14000000-0000-4000-8000-000000000002"]}]'
  ) $$,
  'an active Admin can publish a pickup schedule'
);

select is(
  (select availability_mode::text from public.pickup_dates where pickup_date = '2099-03-01'),
  'READY_STOCK',
  'the selected availability mode is persisted'
);
select is(
  (select count(*) from public.pickup_windows where pickup_date_id = (select id from public.pickup_dates where pickup_date = '2099-03-01')),
  1::bigint,
  'the schedule window is persisted'
);
select is(
  (select count(*) from public.pickup_window_locations where pickup_window_id = (
    select id from public.pickup_windows where pickup_date_id = (select id from public.pickup_dates where pickup_date = '2099-03-01')
  )),
  2::bigint,
  'the selected locations are persisted'
);
select is(
  (select count(*) from public.admin_audit_logs where action = 'pickup.created'),
  1::bigint,
  'schedule publication is audited'
);

select throws_ok(
  $$ select public.set_pickup_date_open(
    '9a000000-0000-4000-8000-000000000002',
    (select id from public.pickup_dates where pickup_date = '2099-03-01'), false
  ) $$,
  'P0001',
  'Active administrator access is required',
  'a customer cannot close a pickup date'
);
select lives_ok(
  $$ select public.set_pickup_date_open(
    '9a000000-0000-4000-8000-000000000001',
    (select id from public.pickup_dates where pickup_date = '2099-03-01'), false
  ) $$,
  'an active Admin can close a pickup date'
);
select is(
  (select is_open from public.pickup_dates where pickup_date = '2099-03-01'),
  false,
  'the publication state is persisted'
);

select lives_ok(
  $$ select public.update_pickup_settings(
    '9a000000-0000-4000-8000-000000000001', 2, '16:30', 20, '07:30', '18:30'
  ) $$,
  'an active Admin can update pickup rules'
);
select is(
  (select minimum_lead_days from public.get_public_pickup_settings()),
  2,
  'the customer-safe settings reader returns the saved lead time'
);
select is(
  (select count(*) from public.get_public_pickup_inventory() where pickup_date = '2099-03-01'),
  0::bigint,
  'a Ready Stock date is not customer-sellable before pieces are published'
);

select public.upsert_daily_inventory(
  '9a000000-0000-4000-8000-000000000001', '2099-03-01',
  '10000000-0000-4000-8000-000000000001', 20, true, 'lock schedule'
);
select public.set_pickup_date_open(
  '9a000000-0000-4000-8000-000000000001',
  (select id from public.pickup_dates where pickup_date = '2099-03-01'), true
);
select is(
  (select count(*) from public.get_public_pickup_inventory() where pickup_date = '2099-03-01'),
  1::bigint,
  'a Ready Stock date becomes customer-sellable after pieces are published'
);
select is(
  (select available_pieces from public.get_public_pickup_inventory() where pickup_date = '2099-03-01'),
  20,
  'customer stock guidance reports the remaining prepared-piece balance'
);
select throws_ok(
  $$ select public.upsert_pickup_schedule(
    '9a000000-0000-4000-8000-000000000001',
    (select id from public.pickup_dates where pickup_date = '2099-03-01'),
    '2099-03-01', 'READY_STOCK', false, 'changed',
    '[{"start_time":"10:00","end_time":"11:00","location_ids":["14000000-0000-4000-8000-000000000001"]}]'
  ) $$,
  'P0001',
  'Pickup schedule is locked by orders or inventory',
  'a schedule with published inventory cannot be rewritten'
);
select is(
  (select count(*) from public.admin_audit_logs where action in ('pickup.created', 'pickup.closed', 'pickup.published', 'pickup.settings_updated', 'pickup.location_created')),
  5::bigint,
  'successful Pickup mutations are audited'
);

select * from finish();
rollback;
