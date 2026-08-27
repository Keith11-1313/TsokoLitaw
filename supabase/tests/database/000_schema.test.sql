begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'refunds', 'refunds table exists');
select has_table('public', 'inventory_adjustments', 'inventory adjustments table exists');

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

select ok(has_table_privilege('anon', 'public.products', 'SELECT'), 'anon can read public products');
select ok(not has_table_privilege('anon', 'public.orders', 'SELECT'), 'anon cannot read orders');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon cannot read profiles');
select ok(not has_table_privilege('authenticated', 'public.payment_webhook_events', 'INSERT'), 'authenticated clients cannot insert webhook events');
select ok(not has_table_privilege('authenticated', 'public.business_settings', 'UPDATE'), 'authenticated clients cannot update settings directly');

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'authenticated users can update their full name subject to RLS'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated users cannot update their role'
);

select ok(
  not has_function_privilege('authenticated', 'public.promote_admin_by_email(text)', 'EXECUTE'),
  'authenticated users cannot invoke admin bootstrap'
);
select ok(
  has_function_privilege('service_role', 'public.promote_admin_by_email(text)', 'EXECUTE'),
  'service role can invoke controlled admin bootstrap'
);

select * from finish();
rollback;
