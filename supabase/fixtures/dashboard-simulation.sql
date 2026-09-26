-- Dashboard simulation fixture for local or explicitly disposable Dev data only.
--
-- This is intentionally NOT a migration and is not loaded by supabase/seed.sql.
-- It creates 60 synthetic customers and 360 tagged orders over about 120 days.
-- Every synthetic email ends in @dashboard-fixture.invalid and no notification
-- delivery survives the transaction.
--
-- Required session opt-in before running this file:
--   set app.dashboard_fixture_scope = 'local';          -- or 'disposable-dev'
--   set app.dashboard_fixture_commit = 'true';
-- Use 'false' instead of 'true' for a constraint-validating dry run that rolls back.
--
-- Never set the scope to production. See docs/features/admin.md.

begin;

do $$
declare
  fixture_scope text := current_setting('app.dashboard_fixture_scope', true);
  fixture_commit text := current_setting('app.dashboard_fixture_commit', true);
begin
  if fixture_scope not in ('local', 'disposable-dev') then
    raise exception
      'Dashboard fixture refused: set app.dashboard_fixture_scope to local or disposable-dev';
  end if;

  if fixture_commit not in ('true', 'false') then
    raise exception
      'Dashboard fixture refused: set app.dashboard_fixture_commit to true or false';
  end if;
end;
$$;

-- A rerun refreshes only records owned by this fixture.
create temporary table _dashboard_fixture_order_ids on commit drop as
select id
from public.orders
where customer_notes = '[dashboard-fixture:v1]';

create temporary table _dashboard_fixture_user_ids on commit drop as
select id
from auth.users
where email like '%@dashboard-fixture.invalid';

delete from public.manual_payment_submissions
where order_id in (select id from _dashboard_fixture_order_ids);

delete from public.reviews
where order_id in (select id from _dashboard_fixture_order_ids);

delete from public.notification_deliveries
where order_id in (select id from _dashboard_fixture_order_ids);

delete from public.loyalty_rewards
where user_id in (select id from _dashboard_fixture_user_ids)
   or source_order_id in (select id from _dashboard_fixture_order_ids)
   or redeemed_order_id in (select id from _dashboard_fixture_order_ids);

delete from public.loyalty_accounts
where user_id in (select id from _dashboard_fixture_user_ids);

delete from public.order_item_addons
where order_item_id in (
  select id from public.order_items
  where order_id in (select id from _dashboard_fixture_order_ids)
);

delete from public.order_item_coatings
where order_item_id in (
  select id from public.order_items
  where order_id in (select id from _dashboard_fixture_order_ids)
);

delete from public.order_items
where order_id in (select id from _dashboard_fixture_order_ids);

delete from public.payments
where order_id in (select id from _dashboard_fixture_order_ids);

delete from public.orders
where id in (select id from _dashboard_fixture_order_ids);

delete from auth.users
where id in (select id from _dashboard_fixture_user_ids);

delete from public.daily_inventory
where id::text like 'd15f%';

delete from public.pickup_window_locations
where pickup_window_id in (
  select id from public.pickup_windows
  where id::text like 'd15e%'
);

delete from public.pickup_windows
where id::text like 'd15e%';

delete from public.pickup_dates
where id::text like 'd15d%';

-- Synthetic Auth identities exercise identified and repeat-customer metrics.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  md5('dashboard-fixture-user-' || customer_number::text)::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  format('dashboard.customer.%s@dashboard-fixture.invalid', customer_number),
  '{"provider":"google","providers":["google"]}'::jsonb,
  jsonb_build_object('name', format('Dashboard Customer %s', customer_number)),
  now() - ((150 - customer_number) * interval '1 day'),
  now() - ((150 - customer_number) * interval '1 day')
from generate_series(1, 60) as customers(customer_number);

update public.profiles profile
set
  full_name = format('Dashboard Customer %s', fixture.customer_number),
  email = format('dashboard.customer.%s@dashboard-fixture.invalid', fixture.customer_number),
  updated_at = now()
from (
  select
    customer_number,
    md5('dashboard-fixture-user-' || customer_number::text)::uuid as id
  from generate_series(1, 60) as customers(customer_number)
) fixture
where profile.id = fixture.id;

-- One historical/future pickup schedule per Manila date. Existing dates are
-- preserved; the fixture adds its own 10:00-11:00 window to whichever row owns
-- that date.
insert into public.pickup_dates (
  id,
  pickup_date,
  availability_mode,
  is_open,
  notes
)
select
  ('d15d' || substr(md5(day_value::text), 5))::uuid,
  day_value,
  case
    when day_value >= timezone('Asia/Manila', now())::date
      then 'HYBRID'::public.pickup_availability_mode
    else 'MADE_TO_ORDER'::public.pickup_availability_mode
  end,
  true,
  '[dashboard-fixture:v1]'
from generate_series(
  timezone('Asia/Manila', now())::date - 125,
  timezone('Asia/Manila', now())::date + 14,
  interval '1 day'
) as days(day_value)
on conflict (pickup_date) do nothing;

insert into public.pickup_windows (
  id,
  pickup_date_id,
  start_time,
  end_time,
  is_open,
  sort_order
)
select
  ('d15e' || substr(md5(date_row.pickup_date::text), 5))::uuid,
  date_row.id,
  '10:00'::time,
  '11:00'::time,
  true,
  90
from public.pickup_dates date_row
where date_row.pickup_date between timezone('Asia/Manila', now())::date - 125
  and timezone('Asia/Manila', now())::date + 14
on conflict (id) do nothing;

insert into public.pickup_window_locations (
  pickup_window_id,
  pickup_location_id,
  is_open
)
select
  window_row.id,
  '14000000-0000-4000-8000-000000000001'::uuid,
  true
from public.pickup_windows window_row
where window_row.id::text like 'd15e%'
on conflict (pickup_window_id, pickup_location_id) do update
set is_open = excluded.is_open;

create temporary table _dashboard_fixture_orders on commit drop as
with generated as (
  select
    order_number,
    1 + ((order_number - 1) % 60) as customer_number,
    timezone('Asia/Manila', now())::date - ((360 - order_number) / 3)::integer as created_day,
    1 + ((order_number - 1) % 3) as variant_number,
    1 + ((order_number - 1) % 8) as coating_number,
    case when order_number % 11 = 0 then 2 else 1 end as box_quantity,
    order_number % 20 as outcome_number
  from generate_series(1, 360) as source(order_number)
), classified as (
  select
    generated.*,
    case variant_number
      when 1 then '11000000-0000-4000-8000-000000000004'::uuid
      when 2 then '11000000-0000-4000-8000-000000000006'::uuid
      else '11000000-0000-4000-8000-000000000008'::uuid
    end as variant_id,
    case variant_number when 1 then 4 when 2 then 6 else 8 end as piece_count,
    case variant_number when 1 then 40::numeric when 2 then 55::numeric else 75::numeric end as base_price,
    case
      when outcome_number = 0 then 'EXPIRED'::public.order_status
      when outcome_number = 1 then 'CANCELLED'::public.order_status
      when outcome_number = 2 then 'PENDING_PAYMENT'::public.order_status
      when outcome_number in (3, 5) then 'CONFIRMED'::public.order_status
      when outcome_number = 4 then 'PAID'::public.order_status
      when outcome_number = 6 then 'PREPARING'::public.order_status
      when outcome_number = 7 then 'READY_FOR_PICKUP'::public.order_status
      else 'COMPLETED'::public.order_status
    end as order_status,
    case
      when outcome_number = 0 then 'FAILED'::public.payment_status
      when outcome_number in (1, 3) then 'PENDING'::public.payment_status
      when outcome_number = 2 then 'UNDER_REVIEW'::public.payment_status
      else 'PAID'::public.payment_status
    end as payment_status,
    case
      when outcome_number = 2 then 'manual_gcash'
      when outcome_number = 3 then 'pay_at_counter'
      when order_number % 3 = 0 then 'pay_at_counter'
      when order_number % 3 = 1 then 'paymongo'
      else 'manual_gcash'
    end as payment_method
  from generated
), priced as (
  select
    classified.*,
    case coating_number when 5 then 0::numeric else piece_count * 5::numeric end as coating_price,
    case when order_number % 4 = 0 then 15::numeric else 0::numeric end as addon_price,
    case
      when order_status = 'COMPLETED'
        then least(created_day + 2, timezone('Asia/Manila', now())::date - 1)
      else created_day + 2
    end as pickup_day,
    (
      (created_day::timestamp + time '08:00' + ((order_number % 10) * interval '1 hour'))
      at time zone 'Asia/Manila'
    ) as created_at
  from classified
)
select
  order_number,
  md5('dashboard-fixture-order-' || order_number::text)::uuid as id,
  md5('dashboard-fixture-user-' || customer_number::text)::uuid as user_id,
  customer_number,
  variant_id,
  variant_number,
  piece_count,
  coating_number,
  box_quantity,
  order_status,
  payment_status,
  payment_method,
  pickup_day,
  created_at,
  base_price,
  coating_price,
  addon_price,
  ((base_price + coating_price + addon_price) * box_quantity)::numeric(10,2) as subtotal
from priced;

insert into public.orders (
  id,
  order_number,
  user_id,
  status,
  payment_status,
  payment_method,
  customer_name,
  customer_email,
  pickup_date,
  pickup_window_id,
  pickup_location_id,
  pickup_window_snapshot,
  pickup_location_snapshot,
  customer_notes,
  subtotal,
  discount_total,
  total,
  terms_version,
  terms_accepted_at,
  cancelled_at,
  completed_at,
  created_at,
  updated_at
)
select
  fixture.id,
  format('SIM%s', lpad(fixture.order_number::text, 5, '0')),
  fixture.user_id,
  fixture.order_status,
  fixture.payment_status,
  fixture.payment_method,
  format('Dashboard Customer %s', fixture.customer_number),
  format('dashboard.customer.%s@dashboard-fixture.invalid', fixture.customer_number),
  fixture.pickup_day,
  ('d15e' || substr(md5(fixture.pickup_day::text), 5))::uuid,
  '14000000-0000-4000-8000-000000000001'::uuid,
  '10:00 AM-11:00 AM',
  'UCC Congress - 3rd Floor',
  '[dashboard-fixture:v1]',
  fixture.subtotal,
  0,
  fixture.subtotal,
  'dashboard-fixture-v1',
  fixture.created_at,
  case when fixture.order_status = 'CANCELLED' then fixture.created_at + interval '25 minutes' end,
  case
    when fixture.order_status = 'COMPLETED'
      then ((fixture.pickup_day::timestamp + time '12:00') at time zone 'Asia/Manila')
  end,
  fixture.created_at,
  coalesce(
    case
      when fixture.order_status = 'COMPLETED'
        then ((fixture.pickup_day::timestamp + time '12:00') at time zone 'Asia/Manila')
    end,
    fixture.created_at
  )
from _dashboard_fixture_orders fixture;

insert into public.payments (
  id,
  order_id,
  provider,
  provider_payment_id,
  amount,
  status,
  paid_at,
  created_at,
  updated_at,
  manual_qr_payload
)
select
  md5('dashboard-fixture-payment-' || fixture.order_number::text)::uuid,
  fixture.id,
  fixture.payment_method,
  case
    when fixture.payment_method = 'paymongo' and fixture.payment_status = 'PAID'
      then format('simulated-payment-%s', fixture.order_number)
  end,
  fixture.subtotal,
  fixture.payment_status,
  case when fixture.payment_status = 'PAID' then fixture.created_at + interval '20 minutes' end,
  fixture.created_at,
  fixture.created_at + interval '20 minutes',
  case when fixture.payment_method = 'manual_gcash' then 'SIMULATED_QR_PAYLOAD' end
from _dashboard_fixture_orders fixture;

insert into public.order_items (
  id,
  order_id,
  product_id,
  variant_id,
  product_name_snapshot,
  variant_name_snapshot,
  piece_count_snapshot,
  unit_price_snapshot,
  coating_total_snapshot,
  quantity,
  line_subtotal,
  created_at
)
select
  md5('dashboard-fixture-item-' || fixture.order_number::text)::uuid,
  fixture.id,
  '10000000-0000-4000-8000-000000000001'::uuid,
  fixture.variant_id,
  'Chocolate-Filled Litaw',
  case fixture.variant_number
    when 1 then 'TsokoMini (4 pcs)'
    when 2 then 'TsokoMore (6 pcs)'
    else 'TsokoMuch (8 pcs)'
  end,
  fixture.piece_count,
  fixture.base_price + fixture.coating_price + fixture.addon_price,
  fixture.coating_price,
  fixture.box_quantity,
  fixture.subtotal,
  fixture.created_at
from _dashboard_fixture_orders fixture;

insert into public.order_item_coatings (
  order_item_id,
  coating_id,
  coating_name_snapshot,
  piece_count,
  additional_price_snapshot,
  created_at
)
select
  md5('dashboard-fixture-item-' || fixture.order_number::text)::uuid,
  ('12000000-0000-4000-8000-' || lpad(fixture.coating_number::text, 12, '0'))::uuid,
  case fixture.coating_number
    when 1 then 'Cocoa'
    when 2 then 'Milk'
    when 3 then 'Palitaw'
    when 4 then 'Crushed Nuts'
    when 5 then 'Plain'
    when 6 then 'Sesame Seeds'
    when 7 then 'Cookies and Cream'
    else 'Chocolate Sprinkles'
  end,
  fixture.piece_count,
  case when fixture.coating_number = 5 then 0 else 5 end,
  fixture.created_at
from _dashboard_fixture_orders fixture;

insert into public.order_item_addons (
  order_item_id,
  addon_id,
  addon_name_snapshot,
  unit_price_snapshot,
  quantity,
  line_total,
  is_complimentary,
  created_at
)
select
  md5('dashboard-fixture-item-' || fixture.order_number::text)::uuid,
  '13000000-0000-4000-8000-000000000001'::uuid,
  'Sea salt cream',
  case when fixture.addon_price > 0 then 15 else 0 end,
  1,
  fixture.addon_price,
  fixture.addon_price = 0,
  fixture.created_at
from _dashboard_fixture_orders fixture;

insert into public.manual_payment_submissions (
  id,
  order_id,
  receipt_path,
  reported_reference,
  reported_amount,
  reported_paid_at,
  reported_recipient,
  status,
  submitted_at
)
select
  md5('dashboard-fixture-receipt-' || fixture.order_number::text)::uuid,
  fixture.id,
  format('dashboard-fixture/missing-receipt-%s.webp', fixture.order_number),
  'SIM' || lpad(fixture.order_number::text, 9, '0'),
  fixture.subtotal,
  fixture.created_at + interval '10 minutes',
  'TsokoLitaw Test Receiver',
  'UNDER_REVIEW',
  fixture.created_at + interval '12 minutes'
from _dashboard_fixture_orders fixture
where fixture.payment_status = 'UNDER_REVIEW';

insert into public.reviews (
  id,
  user_id,
  order_id,
  display_name_snapshot,
  rating,
  comment,
  highlights,
  is_visible,
  is_featured,
  created_at,
  updated_at
)
select
  md5('dashboard-fixture-review-' || fixture.order_number::text)::uuid,
  fixture.user_id,
  fixture.id,
  format('Dashboard Customer %s', fixture.customer_number),
  3 + (fixture.order_number % 3),
  format('Synthetic dashboard review for simulated order %s.', fixture.order_number),
  case fixture.order_number % 4
    when 0 then array['Soft and chewy', 'Would order again']::text[]
    when 1 then array['Balanced sweetness']::text[]
    when 2 then array['Fresh at pickup', 'Neatly packed']::text[]
    else array[]::text[]
  end,
  fixture.order_number % 3 <> 0 or fixture.order_number % 12 = 0,
  fixture.order_number % 12 = 0,
  fixture.completed_at + interval '1 day',
  fixture.completed_at + interval '1 day'
from (
  select
    source.*,
    ((source.pickup_day::timestamp + time '12:00') at time zone 'Asia/Manila') as completed_at
  from _dashboard_fixture_orders source
  where source.order_status = 'COMPLETED'
    and source.order_number % 3 = 0
) fixture;

-- Future inventory gives the operational dashboard a mix of prepared,
-- reserved, sold, and made-to-order dates.
insert into public.daily_inventory (
  id,
  pickup_date,
  product_id,
  stock_total,
  stock_reserved,
  stock_sold
)
select
  ('d15f' || substr(md5(day_value::text), 5))::uuid,
  day_value,
  '10000000-0000-4000-8000-000000000001'::uuid,
  120 + ((day_value::date - timezone('Asia/Manila', now())::date) * 8),
  12 + ((day_value::date - timezone('Asia/Manila', now())::date) % 5),
  8 + ((day_value::date - timezone('Asia/Manila', now())::date) % 4)
from generate_series(
  timezone('Asia/Manila', now())::date,
  timezone('Asia/Manila', now())::date + 13,
  interval '2 days'
) as dates(day_value);

-- Prevent synthetic recipients from entering the real notification worker.
delete from public.notification_deliveries
where order_id in (select id from _dashboard_fixture_orders)
   or recipient_email like '%@dashboard-fixture.invalid';

-- Leave an auditable summary in the SQL result without persisting another table.
select
  (select count(*) from auth.users where email like '%@dashboard-fixture.invalid') as customers,
  (select count(*) from public.orders where customer_notes = '[dashboard-fixture:v1]') as orders,
  (
    select count(*)
    from public.payments payment
    join public.orders fixture_order on fixture_order.id = payment.order_id
    where fixture_order.customer_notes = '[dashboard-fixture:v1]'
      and payment.status = 'PAID'
  ) as paid_orders,
  (
    select count(*)
    from public.reviews review
    join public.orders fixture_order on fixture_order.id = review.order_id
    where fixture_order.customer_notes = '[dashboard-fixture:v1]'
  ) as reviews,
  (
    select count(*)
    from public.manual_payment_submissions submission
    join public.orders fixture_order on fixture_order.id = submission.order_id
    where fixture_order.customer_notes = '[dashboard-fixture:v1]'
  ) as receipt_reviews;

do $$
begin
  if current_setting('app.dashboard_fixture_commit', true) = 'false' then
    raise exception 'Dashboard fixture dry run complete; rolling back all simulated records';
  end if;
end;
$$;

commit;
