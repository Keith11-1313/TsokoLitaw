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
reset role;
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

select plan(52);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'refunds', 'refunds table exists');
select has_table('public', 'inventory_adjustments', 'inventory adjustments table exists');
select has_table('public', 'mutation_rate_limit_buckets', 'distributed mutation rate-limit table exists');
select has_column('public', 'profiles', 'is_active', 'profiles track whether account access is active');
select has_column('public', 'profiles', 'deactivated_at', 'profiles record when access was deactivated');
select has_column('public', 'orders', 'checkout_idempotency_key', 'orders store a customer checkout idempotency key');
select has_column('public', 'daily_inventory', 'product_id', 'daily inventory tracks shared product pieces');
select has_sequence('public', 'order_number_sequence', 'orders use a concurrency-safe kiosk number sequence');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  'orders has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'payments has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.manual_refund_destinations'::regclass),
  'manual refund destinations have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.mutation_rate_limit_buckets'::regclass),
  'mutation rate-limit buckets have RLS enabled'
);

select ok(has_table_privilege('anon', 'public.products', 'SELECT'), 'anon can read public products');
select ok(not has_table_privilege('anon', 'public.orders', 'SELECT'), 'anon cannot read orders');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon cannot read profiles');
select ok(not has_table_privilege('authenticated', 'public.payment_webhook_events', 'INSERT'), 'authenticated clients cannot insert webhook events');
select ok(not has_table_privilege('authenticated', 'public.business_settings', 'UPDATE'), 'authenticated clients cannot update settings directly');
select ok(not has_table_privilege('authenticated', 'public.mutation_rate_limit_buckets', 'SELECT'), 'authenticated clients cannot read rate-limit buckets');

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'authenticated users can update their full name subject to RLS'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated users cannot update their role'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'is_active', 'UPDATE'),
  'authenticated users cannot reactivate their profile'
);

select ok(
  not has_function_privilege('authenticated', 'public.promote_admin_by_email(text)', 'EXECUTE'),
  'authenticated users cannot invoke admin bootstrap'
);
select ok(
  has_function_privilege('service_role', 'public.promote_admin_by_email(text)', 'EXECUTE'),
  'service role can invoke controlled admin bootstrap'
);
select ok(
  not has_function_privilege('authenticated', 'public.deactivate_due_account(uuid)', 'EXECUTE'),
  'authenticated users cannot invoke due-account deactivation'
);
select ok(
  has_function_privilege('service_role', 'public.deactivate_due_account(uuid)', 'EXECUTE'),
  'service role can invoke due-account deactivation'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_mutation_rate_limit(text[],integer,integer)',
    'EXECUTE'
  ),
  'authenticated users cannot invoke distributed mutation rate limiting'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.consume_mutation_rate_limit(text[],integer,integer)',
    'EXECUTE'
  ),
  'service role can invoke distributed mutation rate limiting'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.prune_mutation_rate_limit_buckets()',
    'EXECUTE'
  ),
  'authenticated users cannot prune distributed rate-limit buckets'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.prune_mutation_rate_limit_buckets()',
    'EXECUTE'
  ),
  'service role can prune distributed rate-limit buckets'
);
select is(
  (select allowed from public.consume_mutation_rate_limit(array[repeat('a', 64)], 2, 3600)),
  true,
  'the first request is allowed by the distributed rate limiter'
);
select is(
  (select remaining_requests from public.consume_mutation_rate_limit(array[repeat('a', 64)], 2, 3600)),
  0,
  'the second request consumes the final available request'
);
select is(
  (select allowed from public.consume_mutation_rate_limit(array[repeat('a', 64)], 2, 3600)),
  false,
  'the distributed rate limiter rejects requests above the configured maximum'
);
select ok(
  not has_function_privilege('authenticated', 'public.expire_pending_orders()', 'EXECUTE'),
  'authenticated users cannot expire pending orders directly'
);
select ok(
  has_function_privilege('service_role', 'public.expire_pending_orders()', 'EXECUTE'),
  'service role can expire pending orders'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_pending_order(uuid,uuid,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text)',
    'EXECUTE'
  ),
  'authenticated users cannot invoke the atomic order writer directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_pending_order(uuid,uuid,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text)',
    'EXECUTE'
  ),
  'service role can invoke the atomic order writer'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.upsert_daily_inventory(uuid,date,uuid,integer,boolean,text)',
    'EXECUTE'
  ),
  'authenticated users cannot write inventory directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_daily_inventory(uuid,date,uuid,integer,boolean,text)',
    'EXECUTE'
  ),
  'service role can invoke controlled inventory updates'
);
select ok(
  has_function_privilege('anon', 'public.get_public_pickup_settings()', 'EXECUTE'),
  'anonymous checkout can read only the customer-safe Pickup rules'
);
select ok(
  has_function_privilege('anon', 'public.get_public_stocked_pickup_dates()', 'EXECUTE'),
  'anonymous checkout can discover which Pickup dates have sellable pieces without reading inventory balances'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.upsert_pickup_schedule(uuid,uuid,date,public.pickup_availability_mode,boolean,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated clients cannot write Pickup schedules directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_pickup_schedule(uuid,uuid,date,public.pickup_availability_mode,boolean,text,jsonb)',
    'EXECUTE'
  ),
  'service role can invoke controlled Pickup schedule writes'
);
select ok(
  not has_function_privilege('authenticated', 'public.upsert_pickup_location(uuid,uuid,text,text,boolean)', 'EXECUTE'),
  'authenticated clients cannot write Pickup locations directly'
);
select ok(
  has_function_privilege('service_role', 'public.upsert_pickup_location(uuid,uuid,text,text,boolean)', 'EXECUTE'),
  'service role can invoke controlled Pickup location writes'
);
select ok(
  not has_function_privilege('authenticated', 'public.set_pickup_date_open(uuid,uuid,boolean)', 'EXECUTE'),
  'authenticated clients cannot publish Pickup dates directly'
);
select ok(
  has_function_privilege('service_role', 'public.set_pickup_date_open(uuid,uuid,boolean)', 'EXECUTE'),
  'service role can invoke controlled Pickup publication changes'
);
select ok(
  not has_function_privilege(
    'authenticated', 'public.update_pickup_settings(uuid,integer,time,integer,time,time)', 'EXECUTE'
  ),
  'authenticated clients cannot update Pickup rules directly'
);
select ok(
  has_function_privilege(
    'service_role', 'public.update_pickup_settings(uuid,integer,time,integer,time,time)', 'EXECUTE'
  ),
  'service role can invoke controlled Pickup rule updates'
);

select * from finish();
rollback;
