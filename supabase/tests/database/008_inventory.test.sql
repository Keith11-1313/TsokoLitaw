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

select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('99000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inventory-admin@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Inventory Admin"}', now(), now()),
  ('99000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inventory-customer@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Inventory Customer"}', now(), now());

update public.profiles set role = 'admin'
where id = '99000000-0000-4000-8000-000000000001';

insert into public.pickup_dates (id, pickup_date, availability_mode, is_open)
values ('99000000-0000-4000-8000-000000000003', '2099-02-01', 'READY_STOCK', true);

select throws_ok(
  $$ select public.upsert_daily_inventory(
    '99000000-0000-4000-8000-000000000002', '2099-02-01',
    '10000000-0000-4000-8000-000000000001', 10, true, 'unauthorized'
  ) $$,
  'P0001',
  'Active administrator access is required',
  'a customer identity cannot publish inventory'
);

select lives_ok(
  $$ select public.upsert_daily_inventory(
    '99000000-0000-4000-8000-000000000001', '2099-02-01',
    '10000000-0000-4000-8000-000000000001', 10, true, 'opening stock'
  ) $$,
  'an active Admin can publish piece stock'
);

select is(
  (select stock_total from public.daily_inventory where pickup_date = '2099-02-01'),
  10,
  'the exact prepared-piece total is stored'
);

select is(
  (select count(*) from public.inventory_adjustments where reason = 'RESTOCK'),
  1::bigint,
  'opening stock creates a restock adjustment'
);

select lives_ok(
  $$ select public.record_inventory_consumption(
    '99000000-0000-4000-8000-000000000001',
    (select id from public.daily_inventory where pickup_date = '2099-02-01'),
    2, 'WASTE', 'damaged pieces'
  ) $$,
  'an active Admin can record unusable pieces'
);

select is(
  (select stock_sold from public.daily_inventory where pickup_date = '2099-02-01'),
  2,
  'unusable pieces become consumed'
);

select is(
  (select stock_total - stock_reserved - stock_sold from public.daily_inventory where pickup_date = '2099-02-01'),
  8,
  'availability is calculated in individual pieces'
);

select throws_ok(
  $$ select public.record_inventory_consumption(
    '99000000-0000-4000-8000-000000000001',
    (select id from public.daily_inventory where pickup_date = '2099-02-01'),
    9, 'WASTE', 'too many'
  ) $$,
  'P0001',
  'Not enough uncommitted pieces remain',
  'consumption cannot oversell the remaining pieces'
);

select throws_ok(
  $$ select public.upsert_daily_inventory(
    '99000000-0000-4000-8000-000000000001', '2099-02-01',
    '10000000-0000-4000-8000-000000000001', 1, true, 'invalid correction'
  ) $$,
  'P0001',
  'Total stock cannot be lower than committed and consumed pieces',
  'the exact total cannot be reduced below consumed pieces'
);

select is(
  (select count(*) from public.admin_audit_logs where entity_type = 'daily_inventory'),
  2::bigint,
  'inventory publication and consumption are audited'
);

select * from finish();
rollback;
