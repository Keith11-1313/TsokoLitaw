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
select plan(18);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('d1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-admin@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Review Admin"}', now(), now()),
  ('d1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-owner@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Review Owner"}', now(), now()),
  ('d1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-other@example.test', '{"provider":"google","providers":["google"]}', '{"name":"Other Customer"}', now(), now());

update public.profiles set role = 'admin'
where id = 'd1000000-0000-4000-8000-000000000001';

insert into public.pickup_locations (id, name)
values ('d2000000-0000-4000-8000-000000000001', 'Review test location');
insert into public.pickup_dates (id, pickup_date)
values ('d3000000-0000-4000-8000-000000000001', '2099-05-01');
insert into public.pickup_windows (id, pickup_date_id, start_time, end_time)
values ('d4000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', '10:00', '11:00');

insert into public.orders (
  id, order_number, user_id, status, payment_status, customer_name, customer_email,
  pickup_date, pickup_window_id, pickup_location_id, pickup_window_snapshot,
  pickup_location_snapshot, subtotal, total, terms_version, terms_accepted_at
) values
  ('d5000000-0000-4000-8000-000000000001', 'TL-9301', 'd1000000-0000-4000-8000-000000000002', 'COMPLETED', 'PAID', 'Review Owner', 'review-owner@example.test', '2099-05-01', 'd4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', '10:00 AM–11:00 AM', 'Review test location', 40, 40, 'review-test', now()),
  ('d5000000-0000-4000-8000-000000000002', 'TL-9302', 'd1000000-0000-4000-8000-000000000002', 'CONFIRMED', 'PAID', 'Review Owner', 'review-owner@example.test', '2099-05-01', 'd4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', '10:00 AM–11:00 AM', 'Review test location', 40, 40, 'review-test', now()),
  ('d5000000-0000-4000-8000-000000000003', 'TL-9303', 'd1000000-0000-4000-8000-000000000003', 'COMPLETED', 'PAID', 'Other Customer', 'review-other@example.test', '2099-05-01', 'd4000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', '10:00 AM–11:00 AM', 'Review test location', 40, 40, 'review-test', now());

select ok(not has_function_privilege('authenticated', 'public.submit_order_review(uuid,uuid,integer,text)', 'EXECUTE'), 'customers cannot call the review writer directly');
select ok(has_function_privilege('service_role', 'public.submit_order_review(uuid,uuid,integer,text)', 'EXECUTE'), 'service role can invoke the review writer');
select ok(not has_function_privilege('authenticated', 'public.moderate_order_review(uuid,uuid,boolean,boolean)', 'EXECUTE'), 'customers cannot call review moderation directly');
select ok(has_function_privilege('service_role', 'public.moderate_order_review(uuid,uuid,boolean,boolean)', 'EXECUTE'), 'service role can invoke review moderation');

select lives_ok(
  $$select public.submit_order_review('d1000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000001',5,'Warm, soft, and easy to pick up on campus.')$$,
  'completed order owner can submit a review'
);
select is((select rating from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'), 5, 'rating is persisted');
select is((select display_name_snapshot from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'), 'Review Owner', 'display name is snapshotted');
select ok((select not is_visible and not is_featured from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'), 'new reviews await Admin publication');
select throws_ok(
  $$select public.submit_order_review('d1000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000001',4,'A second review must not be accepted.')$$,
  'P0001', 'This order already has a review', 'one order cannot receive two reviews'
);
select throws_ok(
  $$select public.submit_order_review('d1000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000002',4,'This order has not completed fulfillment.')$$,
  'P0001', 'Only completed orders can be reviewed', 'incomplete orders cannot be reviewed'
);
select throws_ok(
  $$select public.submit_order_review('d1000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000003',4,'A different customer owns this completed order.')$$,
  'P0001', 'Completed order was not found', 'customers cannot review another customer order'
);

select throws_ok(
  $$select public.moderate_order_review('d1000000-0000-4000-8000-000000000001',(select id from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'),false,true)$$,
  'P0001', 'Featured reviews must remain visible', 'hidden reviews cannot be featured'
);
select throws_ok(
  $$select public.moderate_order_review('d1000000-0000-4000-8000-000000000002',(select id from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'),true,true)$$,
  'P0001', 'Active administrator access is required', 'customers cannot moderate reviews'
);
select ok(public.moderate_order_review('d1000000-0000-4000-8000-000000000001',(select id from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'),true,true), 'admin can feature a visible review');
select ok((select is_visible and is_featured from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'), 'featured review remains visible');
select ok(public.moderate_order_review('d1000000-0000-4000-8000-000000000001',(select id from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'),false,false), 'admin can hide and unfeature a review');
select ok((select not is_visible and not is_featured from public.reviews where order_id = 'd5000000-0000-4000-8000-000000000001'), 'hidden review is no longer featured');
select is((select count(*)::integer from public.admin_audit_logs where action = 'review.moderated'), 2, 'successful moderation actions are audited');

select * from finish();
rollback;
