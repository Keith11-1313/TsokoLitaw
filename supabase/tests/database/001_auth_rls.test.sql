begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

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

insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('94000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', '09:00', '10:00');

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

reset role;
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

reset role;
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

reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
set local role authenticated;

select ok(public.is_admin(), 'approved admin satisfies the server-side role check');
select is((select count(*) from public.orders), 3::bigint, 'approved admin can read customer orders');
select throws_ok(
  $$select public.request_account_deletion()$$,
  'P0001',
  'Admin accounts require controlled removal',
  'admin cannot self-schedule destructive account deletion'
);

select * from finish();
rollback;
