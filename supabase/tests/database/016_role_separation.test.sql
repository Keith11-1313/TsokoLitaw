begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set local search_path = extensions, public;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('ac000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'role-admin@example.test', '{"provider":"google"}', '{"name":"Role Admin"}', now(), now()),
('ac000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'role-customer@example.test', '{"provider":"google"}', '{"name":"Role Customer"}', now(), now());
update public.profiles set role = 'admin' where id = 'ac000000-0000-4000-8000-000000000001';

select throws_ok($$select * from public.create_checkout_order('ac000000-0000-4000-8000-000000000001', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'Admin', null, '[]'::jsonb, 40, 0, 40, 'test', null, 'paymongo', null)$$, 'P0001', 'Account is not eligible for checkout', 'Admin cannot create a personal checkout');
select throws_ok($$select * from public.prepare_paymongo_checkout(gen_random_uuid(), 'ac000000-0000-4000-8000-000000000001')$$, 'P0001', 'Active customer access is required', 'Admin cannot start a customer provider payment');
select throws_ok($$select * from public.prepare_order_cancellation(gen_random_uuid(), 'ac000000-0000-4000-8000-000000000001')$$, 'P0001', 'Active customer access is required', 'Admin cannot start customer cancellation');
select throws_ok($$select public.cancel_unpaid_order(gen_random_uuid(), 'ac000000-0000-4000-8000-000000000001')$$, 'P0001', 'Active customer access is required', 'Admin cannot cancel as a customer');
select throws_ok($$select public.submit_manual_payment('ac000000-0000-4000-8000-000000000001', gen_random_uuid(), gen_random_uuid(), 'test', 'test', 40, now(), 'test')$$, 'P0001', 'Active customer access is required', 'Admin cannot submit a customer receipt');
select throws_ok($$select public.submit_order_review('ac000000-0000-4000-8000-000000000001', gen_random_uuid(), 5, 'test')$$, 'P0001', 'Active customer access is required', 'Admin cannot submit a customer review');
select is(public.count_admin_customers('ac000000-0000-4000-8000-000000000001', null), 1::bigint, 'customer count excludes Admin identities');

-- Simulate a historical order predating role separation; do not drop its financial record.
insert into public.pickup_locations (id, name) values ('ac100000-0000-4000-8000-000000000001', 'Role test location');
insert into public.pickup_dates (id, pickup_date) values ('ac200000-0000-4000-8000-000000000001', '2099-06-01');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time) values ('ac300000-0000-4000-8000-000000000001', 'ac200000-0000-4000-8000-000000000001', '10:00', '11:00');
insert into public.orders (id, order_number, user_id, status, payment_status, customer_name, customer_email, pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot, pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at)
values ('ac400000-0000-4000-8000-000000000001', 'ROLE-LEGACY', 'ac000000-0000-4000-8000-000000000001', 'READY_FOR_PICKUP', 'PAID', 'Role Admin', 'role-admin@example.test', '2099-06-01', 'ac300000-0000-4000-8000-000000000001', 'ac100000-0000-4000-8000-000000000001', '10:00–11:00', 'Role test location', 40, 40, 'test', now());
select public.transition_order_status('ac000000-0000-4000-8000-000000000001', 'ac400000-0000-4000-8000-000000000001', 'READY_FOR_PICKUP', 'COMPLETED');
select is((select completed_order_count from public.loyalty_accounts where user_id = 'ac000000-0000-4000-8000-000000000001'), 0, 'historical Admin completion earns no loyalty progress');
select is((select count(*) from public.loyalty_rewards where user_id = 'ac000000-0000-4000-8000-000000000001'), 0::bigint, 'Admin completion earns no reward');
select is((public.get_admin_dashboard_summary('ac000000-0000-4000-8000-000000000001', now() - interval '1 day', now() + interval '1 day', now() - interval '3 days', now() - interval '1 day')->'current'->>'purchasingCustomers')::integer, 0, 'historical Admin buyer is not counted as a customer');
select is((select count(*) from public.orders where id = 'ac400000-0000-4000-8000-000000000001' and payment_status = 'PAID'), 1::bigint, 'role filtering does not delete financial history');

select set_config('request.jwt.claim.sub', 'ac000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(public.is_active_customer(), false, 'Admin is not an active customer');
select is(public.is_admin(), true, 'Admin management authorization remains available');
with changed as (update public.profiles set full_name = 'Customer edit' where id = 'ac000000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from changed), 0::bigint, 'Admin cannot use customer self-profile updates');
select throws_ok($$select public.cancel_account_deletion()$$, 'P0001', 'Authenticated profile was not found', 'Admin cannot use customer deletion cancellation');
reset role;
select set_config('request.jwt.claim.sub', 'ac000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(public.is_active_customer(), true, 'active customer remains eligible');
select is(public.is_admin(), false, 'customer does not gain Admin authorization');
with changed as (update public.profiles set full_name = 'Updated customer' where id = 'ac000000-0000-4000-8000-000000000002' returning id)
select is((select count(*) from changed), 1::bigint, 'customer self-profile updates remain available');
reset role;
select * from finish();
rollback;
