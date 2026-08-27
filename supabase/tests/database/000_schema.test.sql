begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'refunds', 'refunds table exists');
select has_table('public', 'inventory_adjustments', 'inventory adjustments table exists');
select has_column('public', 'profiles', 'is_active', 'profiles track whether account access is active');
select has_column('public', 'profiles', 'deactivated_at', 'profiles record when access was deactivated');
select has_column('public', 'orders', 'checkout_idempotency_key', 'orders store a customer checkout idempotency key');
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

select * from finish();
rollback;
