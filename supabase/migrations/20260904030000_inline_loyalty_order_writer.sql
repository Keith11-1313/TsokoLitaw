-- Hosted Dev previously implemented loyalty checkout as a wrapper around the
-- obsolete pre-loyalty create_pending_order overload. Keep only the canonical,
-- self-contained writer before removing that compatibility overload.

create or replace function public.create_pending_order(
  target_user_id uuid,
  checkout_key uuid,
  selected_pickup_window_id uuid,
  selected_pickup_location_id uuid,
  customer_name_value text,
  customer_mobile_value text,
  customer_notes_value text,
  priced_lines jsonb,
  subtotal_value numeric,
  discount_value numeric,
  total_value numeric,
  terms_version_value text,
  loyalty_reward_id uuid
)
returns table (
  created_order_id uuid,
  created_order_number text,
  created_total numeric,
  was_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_profile public.profiles%rowtype;
  existing_order public.orders%rowtype;
  pickup_date_value date;
  pickup_mode public.pickup_availability_mode;
  pickup_start_time time;
  pickup_end_time time;
  pickup_location_name text;
  requested_box_count integer;
  payment_expiry_minutes integer := 15;
  minimum_lead_days integer := 1;
  daily_cutoff_time time := '17:00';
  current_manila_date date := (current_timestamp at time zone 'Asia/Manila')::date;
  current_manila_time time := (current_timestamp at time zone 'Asia/Manila')::time;
  generated_order_id uuid := gen_random_uuid();
  generated_order_number text;
  line jsonb;
  coating jsonb;
  addon jsonb;
  inserted_order_item_id uuid;
  requested_product record;
  selected_reward public.loyalty_rewards%rowtype;
  calculated_reward_discount numeric := 0;
begin
  perform public.expire_pending_orders();

  if target_user_id is null or checkout_key is null then
    raise exception 'Customer and checkout identifiers are required';
  end if;

  select * into customer_profile
  from public.profiles
  where id = target_user_id
  for update;

  if customer_profile.id is null
    or not customer_profile.is_active
    or customer_profile.deletion_scheduled_for is not null
  then
    raise exception 'Account is not eligible for checkout';
  end if;

  select * into existing_order
  from public.orders
  where user_id = target_user_id
    and checkout_idempotency_key = checkout_key;

  if existing_order.id is not null then
    return query select
      existing_order.id,
      existing_order.order_number,
      existing_order.total,
      false;
    return;
  end if;

  if jsonb_typeof(priced_lines) <> 'array'
    or jsonb_array_length(priced_lines) < 1
    or jsonb_array_length(priced_lines) > 20
  then
    raise exception 'Priced order lines are invalid';
  end if;

  if loyalty_reward_id is not null then
    select * into selected_reward
    from public.loyalty_rewards
    where id = loyalty_reward_id
      and user_id = target_user_id
      and reward_type = 'FREE_4_PIECE'
      and status = 'earned'
    for update;

    if selected_reward.id is null then
      raise exception 'The selected loyalty reward is unavailable';
    end if;

    select min((entry ->> 'base_unit_price')::numeric)
    into calculated_reward_discount
    from jsonb_array_elements(priced_lines) entry
    where (entry ->> 'piece_count')::integer = 4
      and (entry ->> 'quantity')::integer >= 1;

    if calculated_reward_discount is null or calculated_reward_discount <= 0 then
      raise exception 'A free 4-piece reward requires an eligible 4-piece box';
    end if;
  elsif discount_value <> 0 then
    raise exception 'A discount requires an eligible loyalty reward';
  end if;

  if discount_value <> calculated_reward_discount then
    raise exception 'The loyalty discount is inconsistent';
  end if;

  if subtotal_value < 0
    or discount_value < 0
    or discount_value > subtotal_value
    or total_value <> subtotal_value - discount_value
    or subtotal_value <> coalesce((
      select sum((entry ->> 'line_subtotal')::numeric)
      from jsonb_array_elements(priced_lines) entry
    ), 0)
  then
    raise exception 'Priced order totals are inconsistent';
  end if;

  select
    pickup_dates.pickup_date,
    pickup_dates.availability_mode,
    pickup_windows.start_time,
    pickup_windows.end_time,
    pickup_locations.name
  into
    pickup_date_value,
    pickup_mode,
    pickup_start_time,
    pickup_end_time,
    pickup_location_name
  from public.pickup_windows
  join public.pickup_dates
    on pickup_dates.id = pickup_windows.pickup_date_id
  join public.pickup_window_locations
    on pickup_window_locations.pickup_window_id = pickup_windows.id
  join public.pickup_locations
    on pickup_locations.id = pickup_window_locations.pickup_location_id
  where pickup_windows.id = selected_pickup_window_id
    and pickup_locations.id = selected_pickup_location_id
    and pickup_dates.is_open
    and pickup_windows.is_open
    and pickup_window_locations.is_open
    and pickup_locations.is_active
    and pickup_dates.pickup_date >= (current_timestamp at time zone 'Asia/Manila')::date
  for update of pickup_windows;

  if pickup_date_value is null then
    raise exception 'The selected pickup option is unavailable';
  end if;

  select coalesce((value #>> '{}')::integer, 1)
  into minimum_lead_days
  from public.business_settings
  where key = 'minimum_lead_days';
  minimum_lead_days := coalesce(minimum_lead_days, 1);

  select coalesce((value #>> '{}')::time, '17:00'::time)
  into daily_cutoff_time
  from public.business_settings
  where key = 'daily_cutoff_time';
  daily_cutoff_time := coalesce(daily_cutoff_time, '17:00'::time);

  if pickup_date_value = current_manila_date and pickup_end_time <= current_manila_time then
    raise exception 'The selected pickup window has already ended';
  end if;
  if pickup_mode = 'MADE_TO_ORDER' and pickup_date_value = current_manila_date then
    raise exception 'Made-to-order pickup requires an advance date';
  end if;
  if pickup_mode in ('MADE_TO_ORDER', 'HYBRID')
    and pickup_date_value > current_manila_date
    and pickup_date_value < current_manila_date
      + minimum_lead_days
      + (case when current_manila_time >= daily_cutoff_time then 1 else 0 end)
  then
    raise exception 'The selected pickup date is inside the lead-time or cutoff window';
  end if;

  select coalesce(sum((entry ->> 'quantity')::integer), 0)
  into requested_box_count
  from jsonb_array_elements(priced_lines) entry;

  if requested_box_count < 1 or requested_box_count > 100 then
    raise exception 'The order contains an invalid box quantity';
  end if;

  if pickup_mode = 'READY_STOCK'
    or (
      pickup_mode = 'HYBRID'
      and pickup_date_value = (current_timestamp at time zone 'Asia/Manila')::date
    )
  then
    for requested_product in
      select
        product_variants.product_id,
        sum((entry ->> 'quantity')::integer * product_variants.piece_count)::integer as piece_count
      from jsonb_array_elements(priced_lines) entry
      join public.product_variants
        on product_variants.id = (entry ->> 'variant_id')::uuid
      group by product_variants.product_id
    loop
      update public.daily_inventory
      set stock_reserved = stock_reserved + requested_product.piece_count,
          updated_at = now()
      where pickup_date = pickup_date_value
        and product_id = requested_product.product_id
        and is_available
        and stock_total - stock_reserved - stock_sold >= requested_product.piece_count;

      if not found then
        raise exception 'Ready stock does not have enough pieces for the selected boxes';
      end if;
    end loop;
  end if;

  select coalesce((value #>> '{}')::integer, 15)
  into payment_expiry_minutes
  from public.business_settings
  where key = 'payment_expiry_minutes';
  payment_expiry_minutes := coalesce(payment_expiry_minutes, 15);

  generated_order_number := 'TL-'
    || lpad(nextval('public.order_number_sequence'::regclass)::text, 4, '0');

  insert into public.orders (
    id, order_number, user_id, checkout_idempotency_key,
    customer_name, customer_email, customer_mobile,
    pickup_date, pickup_window_id, pickup_location_id,
    pickup_window_snapshot, pickup_location_snapshot, customer_notes,
    subtotal, discount_total, total, terms_version,
    terms_accepted_at, payment_expires_at
  ) values (
    generated_order_id,
    generated_order_number,
    target_user_id,
    checkout_key,
    coalesce(nullif(trim(customer_name_value), ''), customer_profile.full_name),
    customer_profile.email,
    nullif(trim(customer_mobile_value), ''),
    pickup_date_value,
    selected_pickup_window_id,
    selected_pickup_location_id,
    to_char(pickup_start_time, 'FMHH12:MI AM') || '–'
      || to_char(pickup_end_time, 'FMHH12:MI AM'),
    pickup_location_name,
    nullif(trim(customer_notes_value), ''),
    subtotal_value,
    discount_value,
    total_value,
    terms_version_value,
    now(),
    now() + make_interval(mins => payment_expiry_minutes)
  );

  if selected_reward.id is not null then
    update public.loyalty_rewards
    set status = 'redeemed',
        redeemed_at = now(),
        redeemed_order_id = generated_order_id
    where id = selected_reward.id;
  end if;

  for line in select value from jsonb_array_elements(priced_lines)
  loop
    insert into public.order_items (
      order_id, product_id, variant_id, product_name_snapshot,
      variant_name_snapshot, piece_count_snapshot, unit_price_snapshot,
      extra_coating_total_snapshot, quantity, line_subtotal
    ) values (
      generated_order_id,
      (line ->> 'product_id')::uuid,
      (line ->> 'variant_id')::uuid,
      line ->> 'product_name',
      line ->> 'variant_name',
      (line ->> 'piece_count')::integer,
      (line ->> 'base_unit_price')::numeric,
      (line ->> 'extra_coating_total')::numeric,
      (line ->> 'quantity')::integer,
      (line ->> 'line_subtotal')::numeric
    ) returning id into inserted_order_item_id;

    for coating in select value from jsonb_array_elements(line -> 'coatings')
    loop
      insert into public.order_item_coatings (
        order_item_id, coating_id, coating_name_snapshot,
        piece_count, additional_price_snapshot, is_included_type
      ) values (
        inserted_order_item_id,
        (coating ->> 'id')::uuid,
        coating ->> 'name',
        (coating ->> 'piece_count')::integer,
        (coating ->> 'additional_price')::numeric,
        (coating ->> 'is_included_type')::boolean
      );
    end loop;

    addon := line -> 'addon';
    if addon is not null and addon <> 'null'::jsonb then
      insert into public.order_item_addons (
        order_item_id, addon_id, addon_name_snapshot,
        unit_price_snapshot, quantity, line_total
      ) values (
        inserted_order_item_id,
        (addon ->> 'id')::uuid,
        addon ->> 'name',
        (addon ->> 'unit_price')::numeric,
        (addon ->> 'quantity')::integer,
        (addon ->> 'line_total')::numeric
      );
    end if;
  end loop;

  if total_value = 0 then
    update public.orders
    set status = 'CONFIRMED',
        payment_status = 'PAID',
        payment_expires_at = null,
        updated_at = now()
    where id = generated_order_id;

    insert into public.payments (
      order_id, provider, amount, status, paid_at
    ) values (
      generated_order_id, 'loyalty', 0, 'PAID', now()
    );
  end if;

  return query select generated_order_id, generated_order_number, total_value, true;
end;
$$;

comment on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb,
  numeric, numeric, numeric, text, uuid
) is
  'Service-role-only atomic order writer with single-use loyalty redemption. Next.js must reload and validate active catalog prices before calling it.';

revoke all on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb,
  numeric, numeric, numeric, text, uuid
) from public, anon, authenticated;

grant execute on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb,
  numeric, numeric, numeric, text, uuid
) to service_role;
