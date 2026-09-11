-- Pre-release baseline. Replaces the discarded pre-v1 migration chain.
-- Apply only to an empty, deliberately rebaselined database; never db-push onto old Production.
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."journal_status" AS ENUM (
    'draft',
    'published'
);

ALTER TYPE "public"."journal_status" OWNER TO "postgres";

CREATE TYPE "public"."loyalty_reward_status" AS ENUM (
    'earned',
    'redeemed',
    'expired'
);

ALTER TYPE "public"."loyalty_reward_status" OWNER TO "postgres";

CREATE TYPE "public"."order_status" AS ENUM (
    'PENDING_PAYMENT',
    'PAID',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED'
);

ALTER TYPE "public"."order_status" OWNER TO "postgres";

CREATE TYPE "public"."payment_status" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'UNDER_REVIEW'
);

ALTER TYPE "public"."payment_status" OWNER TO "postgres";

CREATE TYPE "public"."pickup_availability_mode" AS ENUM (
    'MADE_TO_ORDER',
    'READY_STOCK',
    'HYBRID'
);

ALTER TYPE "public"."pickup_availability_mode" OWNER TO "postgres";

CREATE TYPE "public"."profile_role" AS ENUM (
    'customer',
    'admin'
);

ALTER TYPE "public"."profile_role" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."attach_paymongo_checkout"("target_payment_id" "uuid", "checkout_id" "text", "checkout_url" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  target_payment public.payments%rowtype;
begin
  if checkout_id !~ '^cs_[A-Za-z0-9_-]+$'
    or checkout_url !~ '^https://checkout[.]paymongo[.]com/'
  then
    raise exception 'PayMongo checkout reference is invalid';
  end if;

  select * into target_payment
  from public.payments
  where id = target_payment_id
  for update;

  if target_payment.id is null or target_payment.status <> 'PENDING' then
    raise exception 'Pending payment is unavailable';
  end if;

  if target_payment.provider_checkout_id is not null then
    if target_payment.provider_checkout_id <> checkout_id
      or target_payment.provider_checkout_url <> checkout_url
    then
      raise exception 'A different PayMongo checkout is already attached';
    end if;
    return false;
  end if;

  update public.payments
  set provider_checkout_id = checkout_id,
      provider_checkout_url = checkout_url,
      updated_at = now()
  where id = target_payment.id;

  return true;
end;
$_$;

ALTER FUNCTION "public"."attach_paymongo_checkout"("target_payment_id" "uuid", "checkout_id" "text", "checkout_url" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."attach_paymongo_checkout"("target_payment_id" "uuid", "checkout_id" "text", "checkout_url" "text") IS 'Service-role-only writer that immutably attaches one PayMongo checkout session to a pending payment.';

CREATE OR REPLACE FUNCTION "public"."cancel_account_deletion"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  requesting_user_id uuid := (select auth.uid());
begin
  if requesting_user_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.profiles
  set deletion_requested_at = null,
      deletion_scheduled_for = null,
      updated_at = now()
  where id = requesting_user_id
    and is_active;

  if not found then
    raise exception 'Authenticated profile was not found';
  end if;
end;
$$;

ALTER FUNCTION "public"."cancel_account_deletion"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."cancel_account_deletion"() IS 'Cancels the authenticated customer account deletion request during its grace period.';

CREATE OR REPLACE FUNCTION "public"."cancel_unpaid_order"("target_order_id" "uuid", "target_user_id" "uuid", "expired_checkout_id" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
  pickup_date_value date;
  pickup_mode public.pickup_availability_mode;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Order is unavailable';
  end if;
  if target_order.status = 'CANCELLED' and target_order.payment_status = 'FAILED' then
    return false;
  end if;
  if target_order.status <> 'PENDING_PAYMENT' or target_order.payment_status <> 'PENDING' then
    raise exception 'Order is no longer eligible for unpaid cancellation';
  end if;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  if target_payment.id is not null then
    if target_payment.status <> 'PENDING' then
      raise exception 'Payment is no longer pending';
    end if;
    if target_payment.provider_checkout_id is not null
      and target_payment.provider_checkout_id is distinct from expired_checkout_id
    then
      raise exception 'Attached PayMongo checkout must be expired first';
    end if;
  end if;

  select pickup_dates.pickup_date, pickup_dates.availability_mode
  into pickup_date_value, pickup_mode
  from public.pickup_windows
  join public.pickup_dates on pickup_dates.id = pickup_windows.pickup_date_id
  where pickup_windows.id = target_order.pickup_window_id;

  if pickup_mode = 'READY_STOCK'
    or (
      pickup_mode = 'HYBRID'
      and pickup_date_value = (current_timestamp at time zone 'Asia/Manila')::date
    )
  then
    update public.daily_inventory
    set stock_reserved = greatest(stock_reserved - reserved_items.piece_count, 0),
        updated_at = now()
    from (
      select
        product_variants.product_id,
        sum(order_items.quantity * product_variants.piece_count)::integer as piece_count
      from public.order_items
      join public.product_variants on product_variants.id = order_items.variant_id
      where order_items.order_id = target_order.id
        and order_items.variant_id is not null
      group by product_variants.product_id
    ) reserved_items
    where daily_inventory.pickup_date = pickup_date_value
      and daily_inventory.product_id = reserved_items.product_id;
  end if;

  update public.payments
  set status = 'FAILED', updated_at = now()
  where id = target_payment.id;

  update public.orders
  set status = 'CANCELLED',
      payment_status = 'FAILED',
      cancelled_at = now(),
      updated_at = now()
  where id = target_order.id;

  return true;
end;
$$;

ALTER FUNCTION "public"."cancel_unpaid_order"("target_order_id" "uuid", "target_user_id" "uuid", "expired_checkout_id" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."cancel_unpaid_order"("target_order_id" "uuid", "target_user_id" "uuid", "expired_checkout_id" "text") IS 'Service-role-only unpaid cancellation. An attached checkout must be expired through PayMongo first.';

CREATE OR REPLACE FUNCTION "public"."consume_mutation_rate_limit"("bucket_key_hashes" "text"[], "maximum_requests" integer, "window_seconds" integer) RETURNS TABLE("allowed" boolean, "retry_after_seconds" integer, "remaining_requests" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  target_hash text;
  current_window_started_at timestamptz;
  current_count integer;
  highest_count integer := 0;
begin
  if coalesce(cardinality(bucket_key_hashes), 0) < 1
    or cardinality(bucket_key_hashes) > 2
    or maximum_requests < 1
    or maximum_requests > 1000
    or window_seconds < 1
    or window_seconds > 86400
  then
    raise exception 'Invalid rate-limit configuration';
  end if;

  current_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  foreach target_hash in array bucket_key_hashes
  loop
    if target_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'Invalid rate-limit bucket';
    end if;

    insert into public.mutation_rate_limit_buckets (
      bucket_key_hash,
      window_started_at,
      request_count,
      updated_at
    )
    values (target_hash, current_window_started_at, 1, clock_timestamp())
    on conflict (bucket_key_hash, window_started_at)
    do update set
      request_count = mutation_rate_limit_buckets.request_count + 1,
      updated_at = clock_timestamp()
    returning request_count into current_count;

    highest_count := greatest(highest_count, current_count);
  end loop;

  return query select
    highest_count <= maximum_requests,
    greatest(
      ceil(extract(epoch from (
        current_window_started_at
        + make_interval(secs => window_seconds)
        - clock_timestamp()
      )))::integer,
      0
    ),
    greatest(maximum_requests - highest_count, 0);
end;
$_$;

ALTER FUNCTION "public"."consume_mutation_rate_limit"("bucket_key_hashes" "text"[], "maximum_requests" integer, "window_seconds" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_checkout_order"("target_user_id" "uuid", "checkout_key" "uuid", "selected_pickup_window_id" "uuid", "selected_pickup_location_id" "uuid", "customer_name_value" "text", "customer_notes_value" "text", "priced_lines" "jsonb", "subtotal_value" numeric, "discount_value" numeric, "total_value" numeric, "terms_version_value" "text", "loyalty_reward_id" "uuid", "payment_method_value" "text", "qr_payload_value" "text") RETURNS TABLE("created_order_id" "uuid", "created_order_number" "text", "created_total" numeric, "was_created" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  if payment_method_value is null or payment_method_value not in ('paymongo','manual_gcash') then raise exception 'Invalid payment method'; end if;
  if payment_method_value = 'manual_gcash' and total_value > 0 and (qr_payload_value is null or length(qr_payload_value) not between 50 and 1024) then raise exception 'Manual QR is unavailable'; end if;
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
        and stock_total - stock_reserved - stock_sold >= requested_product.piece_count;

      if not found then
        raise exception 'Ready stock does not have enough pieces for the selected boxes';
      end if;
    end loop;
  end if;

  select coalesce(
    (value #>> '{}')::integer,
    case when payment_method_value = 'manual_gcash' then 30 else 15 end
  )
  into payment_expiry_minutes
  from public.business_settings
  where key = case
    when payment_method_value = 'manual_gcash' then 'manual_payment_expiry_minutes'
    else 'payment_expiry_minutes'
  end;
  payment_expiry_minutes := coalesce(
    payment_expiry_minutes,
    case when payment_method_value = 'manual_gcash' then 30 else 15 end
  );

  generated_order_number := 'TL-'
    || lpad(nextval('public.order_number_sequence'::regclass)::text, 4, '0');

  insert into public.orders (
    id, order_number, user_id, checkout_idempotency_key,
    customer_name, customer_email,
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
      coating_total_snapshot, quantity, line_subtotal
    ) values (
      generated_order_id,
      (line ->> 'product_id')::uuid,
      (line ->> 'variant_id')::uuid,
      line ->> 'product_name',
      line ->> 'variant_name',
      (line ->> 'piece_count')::integer,
      (line ->> 'base_unit_price')::numeric,
      (line ->> 'coating_total')::numeric,
      (line ->> 'quantity')::integer,
      (line ->> 'line_subtotal')::numeric
    ) returning id into inserted_order_item_id;

    for coating in select value from jsonb_array_elements(line -> 'coatings')
    loop
      insert into public.order_item_coatings (
        order_item_id, coating_id, coating_name_snapshot,
        piece_count, additional_price_snapshot
      ) values (
        inserted_order_item_id,
        (coating ->> 'id')::uuid,
        coating ->> 'name',
        (coating ->> 'piece_count')::integer,
        (coating ->> 'additional_price')::numeric
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

  update public.orders set payment_method = payment_method_value where id = generated_order_id;
  if payment_method_value = 'manual_gcash' and total_value > 0 then
    insert into public.payments(order_id, provider, amount, manual_qr_payload)
    values (generated_order_id, 'manual_gcash', total_value, qr_payload_value);
  end if;
  return query select generated_order_id, generated_order_number, total_value, true;
end;
$$;

ALTER FUNCTION "public"."create_checkout_order"("target_user_id" "uuid", "checkout_key" "uuid", "selected_pickup_window_id" "uuid", "selected_pickup_location_id" "uuid", "customer_name_value" "text", "customer_notes_value" "text", "priced_lines" "jsonb", "subtotal_value" numeric, "discount_value" numeric, "total_value" numeric, "terms_version_value" "text", "loyalty_reward_id" "uuid", "payment_method_value" "text", "qr_payload_value" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."deactivate_due_account"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_role public.profile_role;
  target_due_at timestamptz;
  target_is_active boolean;
begin
  select role, deletion_scheduled_for, is_active
  into target_role, target_due_at, target_is_active
  from public.profiles
  where id = target_user_id
  for update;

  if target_role is null or target_role = 'admin' or not target_is_active
    or target_due_at is null or target_due_at > now() then
    return false;
  end if;

  if exists (
    select 1 from public.orders
    where user_id = target_user_id
      and status in (
        'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'
      )
  ) then
    return false;
  end if;

  update public.profiles
  set is_active = false,
      deactivated_at = now(),
      updated_at = now()
  where id = target_user_id
    and is_active;

  return found;
end;
$$;

ALTER FUNCTION "public"."deactivate_due_account"("target_user_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."deactivate_due_account"("target_user_id" "uuid") IS 'Service-role-only processor that marks an eligible due customer profile inactive while preserving its relational data.';

CREATE OR REPLACE FUNCTION "public"."enforce_admin_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.role = 'admin' then
    if tg_op = 'INSERT' then
      if (select count(*) from public.profiles where role = 'admin') >= 5 then
        raise exception 'TsokoLitaw supports at most five administrators';
      end if;
    elsif old.role is distinct from 'admin'
      and (select count(*) from public.profiles where role = 'admin') >= 5 then
      raise exception 'TsokoLitaw supports at most five administrators';
    end if;
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."enforce_admin_limit"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."enqueue_transactional_order_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  should_enqueue boolean := false;
begin
  if tg_op = 'INSERT' then
    should_enqueue := true;
  elsif tg_op = 'UPDATE' then
    should_enqueue := old.status is distinct from new.status
      or old.payment_status is distinct from new.payment_status;
  end if;

  if should_enqueue
    and new.status = 'CONFIRMED'
    and new.payment_status = 'PAID'
  then
    insert into public.notification_deliveries (
      order_id,
      user_id,
      provider,
      event_type,
      recipient_email,
      idempotency_key,
      status
    ) values (
      new.id,
      new.user_id,
      'resend',
      'order.confirmed',
      new.customer_email,
      'order.confirmed:' || new.id::text,
      'PENDING'
    )
    on conflict (idempotency_key) do nothing;
  end if;

  if should_enqueue
    and new.status = 'READY_FOR_PICKUP'
    and new.payment_status = 'PAID'
  then
    insert into public.notification_deliveries (
      order_id,
      user_id,
      provider,
      event_type,
      recipient_email,
      idempotency_key,
      status
    ) values (
      new.id,
      new.user_id,
      'resend',
      'order.ready_for_pickup',
      new.customer_email,
      'order.ready_for_pickup:' || new.id::text,
      'PENDING'
    )
    on conflict (idempotency_key) do nothing;
  end if;

  if should_enqueue and new.status = 'CANCELLED' then
    insert into public.notification_deliveries (
      order_id,
      user_id,
      provider,
      event_type,
      recipient_email,
      idempotency_key,
      status
    ) values (
      new.id,
      new.user_id,
      'resend',
      'order.cancelled',
      new.customer_email,
      'order.cancelled:' || new.id::text,
      'PENDING'
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."enqueue_transactional_order_email"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."expire_paymongo_order"("target_payment_id" "uuid", "checkout_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_payment public.payments%rowtype;
  target_order public.orders%rowtype;
  pickup_date_value date;
  pickup_mode public.pickup_availability_mode;
begin
  select * into target_payment
  from public.payments
  where id = target_payment_id
    and provider = 'paymongo'
    and provider_checkout_id = checkout_id
  for update;

  if target_payment.id is null or target_payment.status <> 'PENDING' then
    return false;
  end if;

  select * into target_order
  from public.orders
  where id = target_payment.order_id
  for update;

  if target_order.id is null
    or target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'PENDING'
    or target_order.payment_expires_at is null
    or target_order.payment_expires_at > now()
  then
    return false;
  end if;

  select pickup_dates.pickup_date, pickup_dates.availability_mode
  into pickup_date_value, pickup_mode
  from public.pickup_windows
  join public.pickup_dates on pickup_dates.id = pickup_windows.pickup_date_id
  where pickup_windows.id = target_order.pickup_window_id;

  if pickup_mode = 'READY_STOCK'
    or (
      pickup_mode = 'HYBRID'
      and pickup_date_value = (current_timestamp at time zone 'Asia/Manila')::date
    )
  then
    update public.daily_inventory
    set stock_reserved = greatest(stock_reserved - reserved_items.piece_count, 0),
        updated_at = now()
    from (
      select
        product_variants.product_id,
        sum(order_items.quantity * product_variants.piece_count)::integer as piece_count
      from public.order_items
      join public.product_variants on product_variants.id = order_items.variant_id
      where order_items.order_id = target_order.id
        and order_items.variant_id is not null
      group by product_variants.product_id
    ) reserved_items
    where daily_inventory.pickup_date = pickup_date_value
      and daily_inventory.product_id = reserved_items.product_id;
  end if;

  update public.payments
  set status = 'FAILED',
      updated_at = now()
  where id = target_payment.id;

  update public.orders
  set status = 'EXPIRED',
      payment_status = 'FAILED',
      updated_at = now()
  where id = target_order.id;

  return true;
end;
$$;

ALTER FUNCTION "public"."expire_paymongo_order"("target_payment_id" "uuid", "checkout_id" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."expire_paymongo_order"("target_payment_id" "uuid", "checkout_id" "text") IS 'Finalizes an overdue order only after trusted server code expires the exact PayMongo checkout.';

CREATE OR REPLACE FUNCTION "public"."expire_pending_orders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  expired_order record;
  expired_count integer := 0;
begin
  for expired_order in
    select
      orders.id,
      pickup_dates.pickup_date,
      pickup_dates.availability_mode
    from public.orders
    left join public.pickup_windows
      on pickup_windows.id = orders.pickup_window_id
    left join public.pickup_dates
      on pickup_dates.id = pickup_windows.pickup_date_id
    where orders.status = 'PENDING_PAYMENT'
      and orders.payment_status = 'PENDING'
      and orders.payment_expires_at <= now()
      and not exists (
        select 1
        from public.payments
        where payments.order_id = orders.id
          and payments.status = 'PENDING'
          and payments.provider_checkout_id is not null
      )
    for update of orders skip locked
  loop
    if expired_order.availability_mode = 'READY_STOCK'
      or (
        expired_order.availability_mode = 'HYBRID'
        and expired_order.pickup_date = (current_timestamp at time zone 'Asia/Manila')::date
      )
    then
      update public.daily_inventory
      set stock_reserved = greatest(stock_reserved - reserved_items.piece_count, 0),
          updated_at = now()
      from (
        select
          product_variants.product_id,
          sum(order_items.quantity * product_variants.piece_count)::integer as piece_count
        from public.order_items
        join public.product_variants on product_variants.id = order_items.variant_id
        where order_items.order_id = expired_order.id
          and order_items.variant_id is not null
        group by product_variants.product_id
      ) reserved_items
      where daily_inventory.pickup_date = expired_order.pickup_date
        and daily_inventory.product_id = reserved_items.product_id;
    end if;

    update public.orders
    set status = 'EXPIRED',
        payment_status = 'FAILED',
        updated_at = now()
    where id = expired_order.id;

    update public.payments
    set status = 'FAILED',
        updated_at = now()
    where order_id = expired_order.id
      and status = 'PENDING';

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

ALTER FUNCTION "public"."expire_pending_orders"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."expire_pending_orders"() IS 'Service-role-only processor that expires overdue unpaid orders without an attached provider checkout and releases ready-stock reservations.';

CREATE OR REPLACE FUNCTION "public"."get_admin_customer_summaries"("target_admin_id" "uuid", "search_value" "text" DEFAULT NULL::"text", "result_limit" integer DEFAULT 100) RETURNS TABLE("user_id" "uuid", "full_name" "text", "email" "text", "account_role" "public"."profile_role", "is_active" boolean, "joined_at" timestamp with time zone, "completed_orders" bigint, "completed_spend" numeric, "last_order_at" timestamp with time zone, "loyalty_completed_orders" integer, "loyalty_threshold" integer, "available_rewards" bigint, "redeemed_rewards" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.profiles as admin_profile
    where admin_profile.id = target_admin_id
      and admin_profile.role = 'admin'
      and admin_profile.is_active
  ) then
    raise exception 'Active Admin access required';
  end if;

  return query
  select
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.role,
    profiles.is_active,
    profiles.created_at,
    coalesce(order_summary.completed_orders, 0),
    coalesce(order_summary.completed_spend, 0::numeric),
    order_summary.last_order_at,
    coalesce(loyalty_accounts.completed_order_count, 0),
    coalesce(loyalty_config.threshold, 7),
    coalesce(reward_summary.available_rewards, 0),
    coalesce(reward_summary.redeemed_rewards, 0)
  from public.profiles
  left join public.loyalty_accounts on loyalty_accounts.user_id = profiles.id
  left join lateral (
    select greatest(coalesce((business_settings.value #>> '{}')::integer, 7), 1) as threshold
    from public.business_settings
    where business_settings.key = 'loyalty_threshold'
  ) loyalty_config on true
  left join lateral (
    select
      count(orders.id) filter (where orders.status = 'COMPLETED') as completed_orders,
      coalesce(sum(orders.total) filter (
        where orders.status = 'COMPLETED' and orders.payment_status = 'PAID'
      ), 0::numeric) as completed_spend,
      max(orders.created_at) as last_order_at
    from public.orders
    where orders.user_id = profiles.id
  ) order_summary on true
  left join lateral (
    select
      count(*) filter (where loyalty_rewards.status = 'earned') as available_rewards,
      count(*) filter (where loyalty_rewards.status = 'redeemed') as redeemed_rewards
    from public.loyalty_rewards
    where loyalty_rewards.user_id = profiles.id
  ) reward_summary on true
  where profiles.role in ('customer', 'admin')
    and (
      nullif(btrim(search_value), '') is null
      or profiles.full_name ilike '%' || btrim(search_value) || '%'
      or profiles.email ilike '%' || btrim(search_value) || '%'
    )
  order by order_summary.last_order_at desc nulls last, profiles.created_at desc
  limit greatest(1, least(coalesce(result_limit, 100), 500));
end;
$$;

ALTER FUNCTION "public"."get_admin_customer_summaries"("target_admin_id" "uuid", "search_value" "text", "result_limit" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_public_pickup_inventory"() RETURNS TABLE("pickup_date" "date", "available_pieces" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    daily_inventory.pickup_date,
    daily_inventory.stock_total - daily_inventory.stock_reserved - daily_inventory.stock_sold
  from public.daily_inventory
  join public.pickup_dates on pickup_dates.pickup_date = daily_inventory.pickup_date
  where pickup_dates.is_open
    and pickup_dates.availability_mode in ('READY_STOCK', 'HYBRID')
    and daily_inventory.product_id = (
      select products.id from public.products
      where products.is_active
      order by products.created_at
      limit 1
    )
    and daily_inventory.stock_total - daily_inventory.stock_reserved - daily_inventory.stock_sold > 0;
$$;

ALTER FUNCTION "public"."get_public_pickup_inventory"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."get_public_pickup_inventory"() IS 'Returns remaining prepared pieces by published pickup date and product for customer checkout guidance; transactional reservation remains authoritative.';

CREATE OR REPLACE FUNCTION "public"."get_public_pickup_settings"() RETURNS TABLE("minimum_lead_days" integer, "daily_cutoff_time" time without time zone, "pickup_grace_minutes" integer, "operating_start" time without time zone, "operating_end" time without time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    coalesce((select (value #>> '{}')::integer from public.business_settings where key = 'minimum_lead_days'), 1),
    coalesce((select (value #>> '{}')::time from public.business_settings where key = 'daily_cutoff_time'), '17:00'::time),
    coalesce((select (value #>> '{}')::integer from public.business_settings where key = 'pickup_grace_minutes'), 15),
    coalesce((select (value ->> 'start')::time from public.business_settings where key = 'pickup_operating_hours'), '07:00'::time),
    coalesce((select (value ->> 'end')::time from public.business_settings where key = 'pickup_operating_hours'), '19:00'::time);
$$;

ALTER FUNCTION "public"."get_public_pickup_settings"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."get_public_pickup_settings"() IS 'Returns only customer-safe lead-time, cutoff, grace-period, and operating-hour settings used by Checkout.';

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    'customer'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  insert into public.loyalty_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
  );
$$;

ALTER FUNCTION "public"."is_active_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."list_due_paymongo_checkouts"("batch_limit" integer DEFAULT 100) RETURNS TABLE("due_payment_id" "uuid", "due_order_id" "uuid", "due_checkout_id" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    payments.id,
    orders.id,
    payments.provider_checkout_id
  from public.payments
  join public.orders on orders.id = payments.order_id
  where payments.provider = 'paymongo'
    and payments.status = 'PENDING'
    and payments.provider_checkout_id is not null
    and orders.status = 'PENDING_PAYMENT'
    and orders.payment_status = 'PENDING'
    and orders.payment_expires_at <= now()
  order by orders.payment_expires_at, orders.id
  limit least(greatest(coalesce(batch_limit, 100), 1), 100);
$$;

ALTER FUNCTION "public"."list_due_paymongo_checkouts"("batch_limit" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."list_due_paymongo_checkouts"("batch_limit" integer) IS 'Lists overdue provider-bound payments for trusted PayMongo expiry coordination.';

CREATE OR REPLACE FUNCTION "public"."moderate_order_review"("target_admin_id" "uuid", "target_review_id" "uuid", "visible_value" boolean, "featured_value" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_review public.reviews%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;

  if featured_value and not visible_value then
    raise exception 'Featured reviews must remain visible';
  end if;

  select * into target_review
  from public.reviews
  where id = target_review_id
  for update;

  if target_review.id is null then
    raise exception 'Review was not found';
  end if;

  update public.reviews
  set is_visible = visible_value,
      is_featured = featured_value,
      updated_at = now()
  where id = target_review.id;

  insert into public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) values (
    target_admin_id,
    'review.moderated',
    'review',
    target_review.id::text,
    jsonb_build_object(
      'order_id', target_review.order_id,
      'previous_visible', target_review.is_visible,
      'previous_featured', target_review.is_featured,
      'visible', visible_value,
      'featured', featured_value
    )
  );

  return true;
end;
$$;

ALTER FUNCTION "public"."moderate_order_review"("target_admin_id" "uuid", "target_review_id" "uuid", "visible_value" boolean, "featured_value" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."moderate_order_review"("target_admin_id" "uuid", "target_review_id" "uuid", "visible_value" boolean, "featured_value" boolean) IS 'Service-role-only review moderation with active-Admin validation and audit logging.';

CREATE OR REPLACE FUNCTION "public"."prepare_order_cancellation"("target_order_id" "uuid", "target_user_id" "uuid") RETURNS TABLE("cancellation_kind" "text", "cancellation_payment_id" "uuid", "cancellation_checkout_id" "text", "cancellation_provider_payment_id" "text", "cancellation_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Order is unavailable';
  end if;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  if target_order.status = 'PENDING_PAYMENT'
    and target_order.payment_status = 'PENDING'
    and (target_payment.id is null or target_payment.status = 'PENDING')
  then
    return query select
      'UNPAID'::text,
      target_payment.id,
      target_payment.provider_checkout_id,
      target_payment.provider_payment_id,
      coalesce(target_payment.amount, target_order.total);
    return;
  end if;

  if target_order.payment_status = 'PAID' then
    raise exception 'Paid-order concerns must be settled directly with TsokoLitaw in person';
  end if;

  raise exception 'Order is no longer eligible for cancellation';
end;
$$;

ALTER FUNCTION "public"."prepare_order_cancellation"("target_order_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."prepare_paymongo_checkout"("target_order_id" "uuid", "target_user_id" "uuid") RETURNS TABLE("prepared_payment_id" "uuid", "prepared_order_id" "uuid", "prepared_order_number" "text", "prepared_amount" numeric, "prepared_customer_name" "text", "prepared_customer_email" "text", "existing_checkout_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
begin
  perform public.expire_pending_orders();

  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Pending order is unavailable';
  end if;
  if target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'PENDING'
    or target_order.payment_expires_at is null
    or target_order.payment_expires_at <= now()
  then
    raise exception 'Order is not eligible for payment';
  end if;

  insert into public.payments (order_id, amount)
  values (target_order.id, target_order.total)
  on conflict (order_id) do nothing;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  if target_payment.id is null
    or target_payment.provider <> 'paymongo'
    or target_payment.status <> 'PENDING'
    or target_payment.currency <> 'PHP'
    or target_payment.amount <> target_order.total
  then
    raise exception 'Payment record is inconsistent with the order';
  end if;

  return query select
    target_payment.id,
    target_order.id,
    target_order.order_number,
    target_order.total,
    target_order.customer_name,
    target_order.customer_email,
    target_payment.provider_checkout_url;
end;
$$;

ALTER FUNCTION "public"."prepare_paymongo_checkout"("target_order_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."process_paymongo_paid_event"("event_key" "text", "target_order_id" "uuid", "target_order_number" "text", "checkout_id" "text", "payment_id" "text", "paid_amount" numeric, "event_summary" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  inserted_event_id uuid;
  target_payment public.payments%rowtype;
  target_order public.orders%rowtype;
begin
  if event_key is null or length(event_key) > 255
    or checkout_id !~ '^cs_[A-Za-z0-9_-]+$'
    or payment_id !~ '^pay_[A-Za-z0-9_-]+$'
    or paid_amount <= 0
  then
    raise exception 'PayMongo payment event is invalid';
  end if;

  insert into public.payment_webhook_events (
    provider,
    provider_event_id,
    event_type,
    payload
  ) values (
    'paymongo',
    event_key,
    'checkout_session.payment.paid',
    event_summary
  )
  on conflict (provider_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return false;
  end if;

  select * into target_payment
  from public.payments
  where provider = 'paymongo'
    and provider_checkout_id = checkout_id
  for update;

  if target_payment.id is null then
    raise exception 'PayMongo checkout is not attached to a payment';
  end if;

  select * into target_order
  from public.orders
  where id = target_payment.order_id
  for update;

  if target_order.id is null
    or target_order.id <> target_order_id
    or target_order.order_number <> target_order_number
    or target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'PENDING'
    or target_payment.status <> 'PENDING'
    or target_payment.amount <> paid_amount
    or target_order.total <> paid_amount
  then
    raise exception 'PayMongo payment does not match an eligible pending order';
  end if;

  update public.payments
  set provider_payment_id = payment_id,
      status = 'PAID',
      paid_at = now(),
      updated_at = now()
  where id = target_payment.id;

  update public.orders
  set payment_status = 'PAID',
      status = 'CONFIRMED',
      updated_at = now()
  where id = target_order.id;

  update public.payment_webhook_events
  set processed_at = now()
  where id = inserted_event_id;

  return true;
end;
$_$;

ALTER FUNCTION "public"."process_paymongo_paid_event"("event_key" "text", "target_order_id" "uuid", "target_order_number" "text", "checkout_id" "text", "payment_id" "text", "paid_amount" numeric, "event_summary" "jsonb") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."process_paymongo_paid_event"("event_key" "text", "target_order_id" "uuid", "target_order_number" "text", "checkout_id" "text", "payment_id" "text", "paid_amount" numeric, "event_summary" "jsonb") IS 'Service-role-only idempotent transition for verified PayMongo checkout_session.payment.paid events.';

CREATE OR REPLACE FUNCTION "public"."process_resend_delivery_event"("provider_event_id_value" "text", "provider_message_id_value" "text", "event_type_value" "text", "event_created_at_value" timestamp with time zone) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  inserted_event_id uuid;
  delivery public.notification_deliveries%rowtype;
  next_status text;
begin
  if provider_event_id_value is null or length(provider_event_id_value) not between 1 and 255
    or provider_message_id_value is null or length(provider_message_id_value) not between 1 and 255
    or event_type_value not in (
      'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
      'email.complained', 'email.failed', 'email.suppressed'
    )
    or event_created_at_value is null
  then
    raise exception 'Resend delivery event is invalid';
  end if;

  insert into public.notification_webhook_events (
    provider, provider_event_id, provider_message_id, event_type, event_created_at
  ) values (
    'resend', provider_event_id_value, provider_message_id_value,
    event_type_value, event_created_at_value
  )
  on conflict (provider_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    select id into inserted_event_id
    from public.notification_webhook_events
    where provider_event_id = provider_event_id_value
      and provider_message_id = provider_message_id_value
      and event_type = event_type_value
      and event_created_at = event_created_at_value
      and processed_at is null;
    if inserted_event_id is null then return true; end if;
  end if;

  select * into delivery
  from public.notification_deliveries
  where provider = 'resend'
    and provider_message_id = provider_message_id_value
  for update;

  if delivery.id is null then
    return false;
  end if;

  next_status := case event_type_value
    when 'email.sent' then 'SENT'
    when 'email.delivered' then 'DELIVERED'
    when 'email.delivery_delayed' then 'DELAYED'
    when 'email.bounced' then 'BOUNCED'
    when 'email.complained' then 'COMPLAINED'
    when 'email.failed' then 'FAILED'
    when 'email.suppressed' then 'SUPPRESSED'
  end;

  if delivery.provider_event_at is null
    or event_created_at_value > delivery.provider_event_at
  then
    update public.notification_deliveries
    set status = next_status,
        delivered_at = case
          when event_type_value = 'email.delivered' then event_created_at_value
          else delivered_at
        end,
        provider_event_at = event_created_at_value,
        last_event_type = event_type_value,
        last_error = case
          when event_type_value in ('email.bounced', 'email.complained', 'email.failed', 'email.suppressed')
            then 'Resend reported ' || event_type_value || '.'
          when event_type_value in ('email.sent', 'email.delivered') then null
          else last_error
        end,
        updated_at = now()
    where id = delivery.id;
  end if;

  update public.notification_webhook_events
  set processed_at = now()
  where id = inserted_event_id;

  return true;
end;
$$;

ALTER FUNCTION "public"."process_resend_delivery_event"("provider_event_id_value" "text", "provider_message_id_value" "text", "event_type_value" "text", "event_created_at_value" timestamp with time zone) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."process_resend_delivery_event"("provider_event_id_value" "text", "provider_message_id_value" "text", "event_type_value" "text", "event_created_at_value" timestamp with time zone) IS 'Service-role-only idempotent Resend delivery-state recorder. Email state never changes commerce state.';

CREATE OR REPLACE FUNCTION "public"."promote_admin_by_email"("target_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  promoted_user_id uuid;
begin
  if nullif(trim(target_email), '') is null then
    raise exception 'Admin email is required';
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where lower(email) = lower(trim(target_email))
    and is_active
  returning id into promoted_user_id;

  if promoted_user_id is null then
    raise exception 'No signed-in profile matches the requested admin email';
  end if;

  return promoted_user_id;
end;
$$;

ALTER FUNCTION "public"."promote_admin_by_email"("target_email" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."promote_admin_by_email"("target_email" "text") IS 'Service-role-only bootstrap. Call after the approved Google identity has signed in and created a profile.';

CREATE OR REPLACE FUNCTION "public"."prune_mutation_rate_limit_buckets"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  deleted_count integer;
begin
  delete from public.mutation_rate_limit_buckets
  where updated_at < clock_timestamp() - interval '2 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

ALTER FUNCTION "public"."prune_mutation_rate_limit_buckets"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."record_inventory_consumption"("target_admin_id" "uuid", "target_inventory_id" "uuid", "quantity_value" integer, "reason_value" "text", "notes_value" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_inventory public.daily_inventory%rowtype;
  remaining_pieces integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if quantity_value is null or quantity_value < 1 or quantity_value > 100000 then
    raise exception 'Consumed piece quantity is invalid';
  end if;
  if reason_value is distinct from 'WASTE' then
    raise exception 'Inventory consumption reason is invalid';
  end if;

  select * into target_inventory
  from public.daily_inventory
  where id = target_inventory_id
  for update;

  if target_inventory.id is null then
    raise exception 'Inventory record was not found';
  end if;
  if target_inventory.stock_total - target_inventory.stock_reserved - target_inventory.stock_sold < quantity_value then
    raise exception 'Not enough uncommitted pieces remain';
  end if;

  update public.daily_inventory
  set stock_sold = stock_sold + quantity_value,
      updated_at = now()
  where id = target_inventory_id
  returning stock_total - stock_reserved - stock_sold into remaining_pieces;

  insert into public.inventory_adjustments (
    daily_inventory_id, quantity_delta, reason, notes, created_by
  ) values (
    target_inventory_id, -quantity_value, reason_value,
    nullif(trim(notes_value), ''), target_admin_id
  );

  insert into public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) values (
    target_admin_id,
    'inventory.waste_recorded',
    'daily_inventory',
    target_inventory_id::text,
    jsonb_build_object(
      'quantity', quantity_value,
      'reason', reason_value,
      'remaining_pieces', remaining_pieces
    )
  );

  return remaining_pieces;
end;
$$;

ALTER FUNCTION "public"."record_inventory_consumption"("target_admin_id" "uuid", "target_inventory_id" "uuid", "quantity_value" integer, "reason_value" "text", "notes_value" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."record_inventory_consumption"("target_admin_id" "uuid", "target_inventory_id" "uuid", "quantity_value" integer, "reason_value" "text", "notes_value" "text") IS 'Service-role-only audited waste writer that removes unusable uncommitted pieces.';

CREATE OR REPLACE FUNCTION "public"."request_account_deletion"() RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  requesting_user_id uuid := (select auth.uid());
  requested_at_value timestamptz := now();
  scheduled_for_value timestamptz;
begin
  if requesting_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = requesting_user_id and is_active
  ) then
    raise exception 'Account is inactive';
  end if;

  if exists (
    select 1 from public.profiles
    where id = requesting_user_id and role = 'admin'
  ) then
    raise exception 'Admin accounts require controlled removal';
  end if;

  if exists (
    select 1 from public.orders
    where user_id = requesting_user_id
      and status in (
        'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'
      )
  ) then
    raise exception 'Account deletion is unavailable while orders are active';
  end if;

  update public.profiles
  set deletion_requested_at = coalesce(deletion_requested_at, requested_at_value),
      deletion_scheduled_for = coalesce(
        deletion_scheduled_for,
        requested_at_value + interval '90 days'
      ),
      updated_at = now()
  where id = requesting_user_id
    and is_active
  returning deletion_scheduled_for into scheduled_for_value;

  if scheduled_for_value is null then
    raise exception 'Authenticated profile was not found';
  end if;

  return scheduled_for_value;
end;
$$;

ALTER FUNCTION "public"."request_account_deletion"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."request_account_deletion"() IS 'Schedules the authenticated customer account for deletion after a fixed 90-day grace period.';

CREATE OR REPLACE FUNCTION "public"."review_manual_payment"("target_admin_id" "uuid", "target_submission_id" "uuid", "approve" boolean, "reason_value" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare proof public.manual_payment_submissions%rowtype; target_order public.orders%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and is_active and role = 'admin') then
    raise exception 'Active Admin required';
  end if;
  select * into proof from public.manual_payment_submissions where id = target_submission_id;
  if proof.id is null then raise exception 'Submission unavailable'; end if;
  select * into target_order from public.orders where id = proof.order_id for update;
  select * into proof from public.manual_payment_submissions where id = target_submission_id for update;
  if proof.status <> 'UNDER_REVIEW' then raise exception 'This receipt was already reviewed. Refresh the order.'; end if;
  if approve is null or target_order.payment_method <> 'manual_gcash' or target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'UNDER_REVIEW' then raise exception 'Order is not under review'; end if;
  perform 1 from public.payments where order_id = target_order.id and provider = 'manual_gcash'
    and status = 'UNDER_REVIEW' and amount = target_order.total for update;
  if not found then raise exception 'Payment is not under review'; end if;
  if approve then
    if proof.reported_amount <> target_order.total then raise exception 'Receipt amount does not match the order total'; end if;
    -- The partial unique index serializes approval of the same normalized reference across orders.
    update public.manual_payment_submissions set status = 'APPROVED', reviewed_by = target_admin_id, reviewed_at = now() where id = proof.id;
    update public.payments set status = 'PAID', provider_payment_id = proof.reported_reference, paid_at = proof.reported_paid_at, updated_at = now() where order_id = target_order.id;
    update public.orders set payment_status = 'PAID', status = 'CONFIRMED', payment_expires_at = null, updated_at = now() where id = target_order.id;
  else
    if reason_value is null or length(trim(reason_value)) not between 3 and 500 then raise exception 'A rejection reason is required'; end if;
    update public.manual_payment_submissions set status = 'REJECTED', rejection_reason = trim(reason_value), reviewed_by = target_admin_id, reviewed_at = now() where id = proof.id;
    update public.payments set status = 'PENDING', updated_at = now() where order_id = target_order.id;
    update public.orders set payment_status = 'PENDING', payment_expires_at = now() + interval '15 minutes', updated_at = now() where id = target_order.id;
  end if;
  insert into public.admin_audit_logs(admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, case when approve then 'manual_payment.approved' else 'manual_payment.rejected' end,
    'order', target_order.id::text, jsonb_build_object('submission_id', proof.id, 'reason', case when approve then null else trim(reason_value) end));
  return true;
end;
$$;

ALTER FUNCTION "public"."review_manual_payment"("target_admin_id" "uuid", "target_submission_id" "uuid", "approve" boolean, "reason_value" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_pickup_date_open"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "open_value" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_date public.pickup_dates%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  select * into target_date from public.pickup_dates
  where id = target_pickup_date_id for update;
  if target_date.id is null then raise exception 'Pickup date was not found'; end if;

  update public.pickup_dates
  set is_open = coalesce(open_value, false), updated_at = now()
  where id = target_date.id;
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id,
    case when open_value then 'pickup.published' else 'pickup.closed' end,
    'pickup_date', target_date.id::text,
    jsonb_build_object('pickup_date', target_date.pickup_date, 'previous_open', target_date.is_open, 'is_open', open_value)
  );
  return coalesce(open_value, false);
end;
$$;

ALTER FUNCTION "public"."set_pickup_date_open"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "open_value" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_pickup_date_open"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "open_value" boolean) IS 'Service-role-only publication toggle for an existing Pickup date with active-Admin validation and audit logging.';

CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."submit_manual_payment"("target_user_id" "uuid", "target_order_id" "uuid", "submission_id" "uuid", "receipt_path_value" "text", "reported_reference_value" "text", "reported_amount_value" numeric, "reported_paid_at_value" timestamp with time zone, "reported_recipient_value" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare target_order public.orders%rowtype; target_payment public.payments%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_user_id and is_active) then
    raise exception 'Active customer required';
  end if;
  select * into target_order from public.orders where id = target_order_id and user_id = target_user_id for update;
  if target_order.id is null or target_order.payment_method <> 'manual_gcash' then raise exception 'Order unavailable'; end if;
  if exists (select 1 from public.manual_payment_submissions where id = submission_id and order_id = target_order_id) then return false; end if;
  if target_order.status <> 'PENDING_PAYMENT' or target_order.payment_status <> 'PENDING'
    or target_order.payment_expires_at is null or target_order.payment_expires_at <= now() then
    raise exception 'Order is no longer accepting receipts';
  end if;
  select * into target_payment from public.payments where order_id = target_order_id for update;
  if target_payment.id is null or target_payment.provider <> 'manual_gcash' or target_payment.status <> 'PENDING'
    or target_payment.amount <> target_order.total then raise exception 'Payment unavailable'; end if;
  if submission_id is null or receipt_path_value is null
    or receipt_path_value !~ ('^' || target_user_id::text || '/' || target_order_id::text || '/' || submission_id::text || '[.](jpg|png|webp)$')
    or reported_reference_value is null or reported_reference_value !~ '^[A-Z0-9]{6,64}$'
    or reported_amount_value is null or reported_amount_value <= 0 or reported_amount_value <> round(reported_amount_value,2)
    or reported_paid_at_value is null or reported_paid_at_value > now() + interval '5 minutes' or reported_paid_at_value < target_order.created_at - interval '5 minutes'
    or reported_recipient_value is null or length(trim(reported_recipient_value)) not between 2 and 100 then
    raise exception 'Invalid receipt details';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-receipts' and name = receipt_path_value) then
    raise exception 'Receipt upload unavailable';
  end if;
  insert into public.manual_payment_submissions(id, order_id, receipt_path, reported_reference, reported_amount, reported_paid_at, reported_recipient)
  values (submission_id, target_order_id, receipt_path_value, reported_reference_value, reported_amount_value, reported_paid_at_value, trim(reported_recipient_value));
  update public.payments set status = 'UNDER_REVIEW', updated_at = now() where id = target_payment.id;
  update public.orders set payment_status = 'UNDER_REVIEW', payment_expires_at = null, updated_at = now() where id = target_order_id;
  return true;
end;
$_$;

ALTER FUNCTION "public"."submit_manual_payment"("target_user_id" "uuid", "target_order_id" "uuid", "submission_id" "uuid", "receipt_path_value" "text", "reported_reference_value" "text", "reported_amount_value" numeric, "reported_paid_at_value" timestamp with time zone, "reported_recipient_value" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."submit_order_review"("target_user_id" "uuid", "target_order_id" "uuid", "rating_value" integer, "comment_value" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  customer_profile public.profiles%rowtype;
  target_order public.orders%rowtype;
  created_review_id uuid;
  normalized_comment text := trim(comment_value);
begin
  select * into customer_profile
  from public.profiles
  where id = target_user_id
    and is_active;

  if customer_profile.id is null then
    raise exception 'Active customer access is required';
  end if;

  if rating_value < 1 or rating_value > 5 then
    raise exception 'Rating must be between one and five';
  end if;

  if normalized_comment is null
    or length(normalized_comment) < 10
    or length(normalized_comment) > 1000
  then
    raise exception 'Review comment must contain between 10 and 1000 characters';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Completed order was not found';
  end if;

  if target_order.status <> 'COMPLETED' then
    raise exception 'Only completed orders can be reviewed';
  end if;

  if exists (select 1 from public.reviews where order_id = target_order.id) then
    raise exception 'This order already has a review';
  end if;

  insert into public.reviews (
    user_id,
    order_id,
    display_name_snapshot,
    rating,
    comment,
    is_visible,
    is_featured
  ) values (
    target_user_id,
    target_order.id,
    customer_profile.full_name,
    rating_value,
    normalized_comment,
    false,
    false
  )
  returning id into created_review_id;

  return created_review_id;
end;
$$;

ALTER FUNCTION "public"."submit_order_review"("target_user_id" "uuid", "target_order_id" "uuid", "rating_value" integer, "comment_value" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."submit_order_review"("target_user_id" "uuid", "target_order_id" "uuid", "rating_value" integer, "comment_value" "text") IS 'Service-role-only customer review writer that enforces active ownership, completed fulfillment, and one review per order.';

CREATE OR REPLACE FUNCTION "public"."sync_completed_order_loyalty"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  next_completed_count integer;
  loyalty_threshold integer := 7;
begin
  if old.status is distinct from 'COMPLETED' and new.status = 'COMPLETED' then
    insert into public.loyalty_accounts (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;

    select coalesce((value #>> '{}')::integer, 7)
    into loyalty_threshold
    from public.business_settings
    where key = 'loyalty_threshold';
    loyalty_threshold := greatest(coalesce(loyalty_threshold, 7), 1);

    update public.loyalty_accounts
    set completed_order_count = completed_order_count + 1,
        updated_at = now()
    where user_id = new.user_id
    returning completed_order_count into next_completed_count;

    if next_completed_count % loyalty_threshold = 0 then
      insert into public.loyalty_rewards (
        user_id, reward_type, threshold, source_order_id
      ) values (
        new.user_id, 'FREE_4_PIECE', loyalty_threshold, new.id
      )
      on conflict (user_id, reward_type, source_order_id) do nothing;
    end if;
  elsif old.status is distinct from new.status
    and new.status in ('CANCELLED', 'EXPIRED')
  then
    update public.loyalty_rewards
    set status = 'earned',
        redeemed_at = null,
        redeemed_order_id = null
    where redeemed_order_id = new.id
      and status = 'redeemed';
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."sync_completed_order_loyalty"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."sync_completed_order_loyalty"() IS 'Awards one free 4-piece reward per configured completed-order threshold and restores redeemed rewards when their order is cancelled or expires.';

CREATE OR REPLACE FUNCTION "public"."transition_order_status"("target_admin_id" "uuid", "target_order_id" "uuid", "expected_status" "public"."order_status", "next_status" "public"."order_status") RETURNS "public"."order_status"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_order public.orders%rowtype;
begin
  if not exists (
    select 1
    from public.profiles
    where id = target_admin_id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception 'Order was not found';
  end if;

  if target_order.status is distinct from expected_status then
    raise exception 'Order status changed before this update';
  end if;

  if target_order.payment_status <> 'PAID' then
    raise exception 'Only paid orders can enter fulfillment';
  end if;

  if not (
    (expected_status = 'CONFIRMED' and next_status = 'PREPARING')
    or (expected_status = 'PREPARING' and next_status = 'READY_FOR_PICKUP')
    or (expected_status = 'READY_FOR_PICKUP' and next_status = 'COMPLETED')
  ) then
    raise exception 'That order status transition is not allowed';
  end if;

  update public.orders
  set status = next_status,
      completed_at = case
        when next_status = 'COMPLETED' then now()
        else completed_at
      end,
      updated_at = now()
  where id = target_order.id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    target_admin_id,
    'order.status_changed',
    'order',
    target_order.id::text,
    jsonb_build_object(
      'order_number', target_order.order_number,
      'from_status', expected_status,
      'to_status', next_status
    )
  );

  return next_status;
end;
$$;

ALTER FUNCTION "public"."transition_order_status"("target_admin_id" "uuid", "target_order_id" "uuid", "expected_status" "public"."order_status", "next_status" "public"."order_status") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."transition_order_status"("target_admin_id" "uuid", "target_order_id" "uuid", "expected_status" "public"."order_status", "next_status" "public"."order_status") IS 'Service-role-only fulfillment transition with active-Admin validation, optimistic status matching, and audit logging.';

CREATE OR REPLACE FUNCTION "public"."update_catalog_product"("target_admin_id" "uuid", "target_product_id" "uuid", "description_value" "text", "price_per_piece_value" numeric, "active_value" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_product public.products%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(trim(description_value)) < 10 or length(trim(description_value)) > 500 then
    raise exception 'Product description must contain between 10 and 500 characters';
  end if;
  if price_per_piece_value is null or price_per_piece_value < 0 or price_per_piece_value > 10000 then
    raise exception 'Product price is invalid';
  end if;

  select * into target_product from public.products where id = target_product_id for update;
  if target_product.id is null then raise exception 'Product was not found'; end if;

  update public.products
  set description = trim(description_value), price_per_piece = price_per_piece_value,
      is_active = active_value, updated_at = now()
  where id = target_product_id;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, 'catalog.product_updated', 'product', target_product_id::text,
    jsonb_build_object('previous_price', target_product.price_per_piece, 'price', price_per_piece_value,
      'previous_active', target_product.is_active, 'active', active_value));
  return true;
end;
$$;

ALTER FUNCTION "public"."update_catalog_product"("target_admin_id" "uuid", "target_product_id" "uuid", "description_value" "text", "price_per_piece_value" numeric, "active_value" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."update_catalog_product"("target_admin_id" "uuid", "target_product_id" "uuid", "description_value" "text", "price_per_piece_value" numeric, "active_value" boolean) IS 'Service-role-only audited product price, description, and availability update.';

CREATE OR REPLACE FUNCTION "public"."update_catalog_variant"("target_admin_id" "uuid", "target_variant_id" "uuid", "active_value" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_variant public.product_variants%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  select * into target_variant from public.product_variants where id = target_variant_id for update;
  if target_variant.id is null then raise exception 'Product variant was not found'; end if;
  if target_variant.piece_count not in (4, 6, 8) then raise exception 'Unsupported box size'; end if;

  update public.product_variants set is_active = active_value, updated_at = now() where id = target_variant_id;
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, 'catalog.variant_updated', 'product_variant', target_variant_id::text,
    jsonb_build_object('piece_count', target_variant.piece_count, 'previous_active', target_variant.is_active, 'active', active_value));
  return true;
end;
$$;

ALTER FUNCTION "public"."update_catalog_variant"("target_admin_id" "uuid", "target_variant_id" "uuid", "active_value" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."update_catalog_variant"("target_admin_id" "uuid", "target_variant_id" "uuid", "active_value" boolean) IS 'Service-role-only audited availability update for approved 4, 6, and 8 piece boxes.';

CREATE OR REPLACE FUNCTION "public"."update_pickup_settings"("target_admin_id" "uuid", "minimum_lead_days_value" integer, "daily_cutoff_time_value" time without time zone, "grace_minutes_value" integer, "operating_start_value" time without time zone, "operating_end_value" time without time zone) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if minimum_lead_days_value < 0 or minimum_lead_days_value > 30
    or grace_minutes_value < 0 or grace_minutes_value > 120
    or daily_cutoff_time_value is null
    or operating_start_value is null
    or operating_end_value is null
    or operating_end_value <= operating_start_value
  then
    raise exception 'Pickup rules are invalid';
  end if;
  if exists (
    select 1
    from public.pickup_windows
    join public.pickup_dates on pickup_dates.id = pickup_windows.pickup_date_id
    where pickup_dates.pickup_date >= (current_timestamp at time zone 'Asia/Manila')::date
      and pickup_dates.is_open and pickup_windows.is_open
      and (pickup_windows.start_time < operating_start_value or pickup_windows.end_time > operating_end_value)
  ) then
    raise exception 'Open pickup windows must fit inside the new operating hours';
  end if;

  insert into public.business_settings (key, value) values
    ('minimum_lead_days', to_jsonb(minimum_lead_days_value)),
    ('daily_cutoff_time', to_jsonb(daily_cutoff_time_value::text)),
    ('pickup_grace_minutes', to_jsonb(grace_minutes_value)),
    ('pickup_operating_hours', jsonb_build_object('start', operating_start_value::text, 'end', operating_end_value::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id, 'pickup.settings_updated', 'business_settings', 'pickup',
    jsonb_build_object(
      'minimum_lead_days', minimum_lead_days_value,
      'daily_cutoff_time', daily_cutoff_time_value,
      'pickup_grace_minutes', grace_minutes_value,
      'operating_start', operating_start_value,
      'operating_end', operating_end_value
    )
  );
  return true;
end;
$$;

ALTER FUNCTION "public"."update_pickup_settings"("target_admin_id" "uuid", "minimum_lead_days_value" integer, "daily_cutoff_time_value" time without time zone, "grace_minutes_value" integer, "operating_start_value" time without time zone, "operating_end_value" time without time zone) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."update_pickup_settings"("target_admin_id" "uuid", "minimum_lead_days_value" integer, "daily_cutoff_time_value" time without time zone, "grace_minutes_value" integer, "operating_start_value" time without time zone, "operating_end_value" time without time zone) IS 'Service-role-only Pickup rules writer for lead time, cutoff, grace, and operating hours.';

CREATE OR REPLACE FUNCTION "public"."upsert_catalog_addon"("target_admin_id" "uuid", "target_addon_id" "uuid", "name_value" "text", "price_value" numeric, "active_value" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  saved_id uuid := coalesce(target_addon_id, gen_random_uuid());
  target_addon public.addons%rowtype;
  normalized_name text := trim(name_value);
  generated_slug text;
  audit_action text;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then raise exception 'Add-on name must contain between 2 and 80 characters'; end if;
  if price_value is null or price_value < 0 or price_value > 10000 then raise exception 'Add-on price is invalid'; end if;

  if target_addon_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(saved_id::text, 8);
    insert into public.addons (id, name, slug, price, is_active)
    values (saved_id, normalized_name, generated_slug, price_value, active_value);
    audit_action := 'catalog.addon_created';
  else
    select * into target_addon from public.addons where id = target_addon_id for update;
    if target_addon.id is null then raise exception 'Add-on was not found'; end if;
    update public.addons
    set name = normalized_name, price = price_value, is_active = active_value, updated_at = now()
    where id = target_addon_id;
    audit_action := 'catalog.addon_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, audit_action, 'addon', saved_id::text,
    jsonb_build_object('name', normalized_name, 'price', price_value, 'active', active_value));
  return saved_id;
end;
$$;

ALTER FUNCTION "public"."upsert_catalog_addon"("target_admin_id" "uuid", "target_addon_id" "uuid", "name_value" "text", "price_value" numeric, "active_value" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."upsert_catalog_addon"("target_admin_id" "uuid", "target_addon_id" "uuid", "name_value" "text", "price_value" numeric, "active_value" boolean) IS 'Service-role-only audited add-on create or update used by the public builder and checkout.';

CREATE OR REPLACE FUNCTION "public"."upsert_catalog_coating"("target_admin_id" "uuid", "target_coating_id" "uuid", "name_value" "text", "description_value" "text", "image_url_value" "text", "price_per_piece_value" numeric, "active_value" boolean, "default_value" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  saved_id uuid := coalesce(target_coating_id, gen_random_uuid());
  target_coating public.coatings%rowtype;
  normalized_name text := trim(name_value);
  normalized_description text := trim(description_value);
  normalized_image text := trim(image_url_value);
  generated_slug text;
  next_sort integer;
  audit_action text;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then raise exception 'Coating name must contain between 2 and 80 characters'; end if;
  if length(normalized_description) < 10 or length(normalized_description) > 300 then raise exception 'Coating description must contain between 10 and 300 characters'; end if;
  if normalized_image = '' or length(normalized_image) > 1000 then raise exception 'Coating image is required'; end if;
  if price_per_piece_value is null or price_per_piece_value < 0 or price_per_piece_value > 10000 then raise exception 'Coating price is invalid'; end if;
  if default_value and not active_value then raise exception 'The default coating must be available to customers'; end if;

  if target_coating_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(saved_id::text, 8);
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.coatings;
  else
    select * into target_coating from public.coatings where id = target_coating_id for update;
    if target_coating.id is null then raise exception 'Coating was not found'; end if;
    if target_coating.is_default and (not active_value or not default_value) then
      raise exception 'Choose another default coating before changing this one';
    end if;
  end if;

  if default_value then
    update public.coatings set is_default = false, updated_at = now() where is_default and id <> saved_id;
  end if;

  if target_coating_id is null then
    insert into public.coatings (
      id, name, slug, description, image_url,
      price_per_piece, is_active, is_default, sort_order
    ) values (
      saved_id, normalized_name, generated_slug, normalized_description, normalized_image,
      price_per_piece_value, active_value, default_value, next_sort
    );
    audit_action := 'catalog.coating_created';
  else
    update public.coatings set
      name = normalized_name,
      description = normalized_description,
      image_url = normalized_image,
      price_per_piece = price_per_piece_value,
      is_active = active_value,
      is_default = default_value,
      updated_at = now()
    where id = target_coating_id;
    audit_action := 'catalog.coating_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, audit_action, 'coating', saved_id::text,
    jsonb_build_object('name', normalized_name, 'price_per_piece', price_per_piece_value, 'active', active_value, 'default', default_value));
  return saved_id;
end;
$$;

ALTER FUNCTION "public"."upsert_catalog_coating"("target_admin_id" "uuid", "target_coating_id" "uuid", "name_value" "text", "description_value" "text", "image_url_value" "text", "price_per_piece_value" numeric, "active_value" boolean, "default_value" boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."upsert_daily_inventory"("target_admin_id" "uuid", "target_pickup_date" "date", "target_product_id" "uuid", "stock_total_value" integer, "notes_value" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_inventory public.daily_inventory%rowtype;
  saved_id uuid := gen_random_uuid();
  previous_total integer := 0;
  inventory_delta integer;
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles as admin_profile
    where admin_profile.id = target_admin_id
      and admin_profile.role = 'admin'
      and admin_profile.is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if stock_total_value is null or stock_total_value < 0 or stock_total_value > 100000 then
    raise exception 'Piece stock total is invalid';
  end if;
  if not exists (
    select 1 from public.products where id = target_product_id
  ) then
    raise exception 'Product was not found';
  end if;
  if not exists (
    select 1 from public.pickup_dates
    where pickup_date = target_pickup_date
      and availability_mode in ('READY_STOCK', 'HYBRID')
  ) then
    raise exception 'Inventory requires a ready-stock or hybrid pickup date';
  end if;

  select * into target_inventory
  from public.daily_inventory
  where pickup_date = target_pickup_date and product_id = target_product_id
  for update;

  if target_inventory.id is null then
    insert into public.daily_inventory (
      id, pickup_date, product_id, stock_total
    ) values (
      saved_id, target_pickup_date, target_product_id, stock_total_value
    );
    inventory_delta := stock_total_value;
    audit_action := 'inventory.created';
  else
    if stock_total_value < target_inventory.stock_reserved + target_inventory.stock_sold then
      raise exception 'Total stock cannot be lower than committed and consumed pieces';
    end if;
    saved_id := target_inventory.id;
    previous_total := target_inventory.stock_total;
    inventory_delta := stock_total_value - previous_total;
    update public.daily_inventory
    set stock_total = stock_total_value,
        updated_at = now()
    where id = saved_id;
    audit_action := 'inventory.updated';
  end if;

  if inventory_delta <> 0 then
    insert into public.inventory_adjustments (
      daily_inventory_id, quantity_delta, reason, notes, created_by
    ) values (
      saved_id,
      inventory_delta,
      case when target_inventory.id is null then 'RESTOCK' else 'CORRECTION' end,
      nullif(trim(notes_value), ''),
      target_admin_id
    );
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) values (
    target_admin_id,
    audit_action,
    'daily_inventory',
    saved_id::text,
    jsonb_build_object(
      'pickup_date', target_pickup_date,
      'product_id', target_product_id,
      'previous_total', previous_total,
      'stock_total', stock_total_value
    )
  );

  return saved_id;
end;
$$;

ALTER FUNCTION "public"."upsert_daily_inventory"("target_admin_id" "uuid", "target_pickup_date" "date", "target_product_id" "uuid", "stock_total_value" integer, "notes_value" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."upsert_daily_inventory"("target_admin_id" "uuid", "target_pickup_date" "date", "target_product_id" "uuid", "stock_total_value" integer, "notes_value" "text") IS 'Service-role-only audited ready-stock writer. Stock is counted in individual product pieces shared by every box size.';

CREATE OR REPLACE FUNCTION "public"."upsert_journal_post"("target_admin_id" "uuid", "target_post_id" "uuid", "title_value" "text", "excerpt_value" "text", "content_value" "text", "content_type_value" "text", "display_date_value" "date", "cover_image_url_value" "text", "video_url_value" "text", "status_value" "public"."journal_status") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  saved_post_id uuid := coalesce(target_post_id, gen_random_uuid());
  target_post public.journal_posts%rowtype;
  normalized_title text := trim(title_value);
  normalized_excerpt text := nullif(trim(excerpt_value), '');
  normalized_content text := trim(content_value);
  generated_slug text;
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;

  if length(normalized_title) < 3 or length(normalized_title) > 120 then
    raise exception 'Journal title must contain between 3 and 120 characters';
  end if;

  if normalized_excerpt is not null and length(normalized_excerpt) > 240 then
    raise exception 'Journal excerpt cannot exceed 240 characters';
  end if;

  if length(normalized_content) < 10 or length(normalized_content) > 5000 then
    raise exception 'Journal content must contain between 10 and 5000 characters';
  end if;

  if content_type_value not in ('announcement', 'story', 'product_feature', 'video') then
    raise exception 'Journal content type is invalid';
  end if;

  if display_date_value is null then
    raise exception 'Journal display date is required';
  end if;

  if target_post_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_title), '[^a-z0-9]+', '-', 'g'))
      || '-' || left(saved_post_id::text, 8);

    insert into public.journal_posts (
      id, title, slug, excerpt, content, content_type, display_date,
      cover_image_url, video_url, status, published_at, author_id
    ) values (
      saved_post_id, normalized_title, generated_slug, normalized_excerpt,
      normalized_content, content_type_value, display_date_value,
      nullif(trim(cover_image_url_value), ''), nullif(trim(video_url_value), ''),
      status_value, case when status_value = 'published' then now() else null end,
      target_admin_id
    );
    audit_action := 'journal.created';
  else
    select * into target_post
    from public.journal_posts
    where id = target_post_id
    for update;

    if target_post.id is null then
      raise exception 'Journal post was not found';
    end if;

    update public.journal_posts
    set title = normalized_title,
        excerpt = normalized_excerpt,
        content = normalized_content,
        content_type = content_type_value,
        display_date = display_date_value,
        cover_image_url = nullif(trim(cover_image_url_value), ''),
        video_url = nullif(trim(video_url_value), ''),
        status = status_value,
        published_at = case
          when status_value = 'draft' then null
          else coalesce(target_post.published_at, now())
        end,
        updated_at = now()
    where id = target_post_id;
    audit_action := 'journal.updated';
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) values (
    target_admin_id,
    audit_action,
    'journal_post',
    saved_post_id::text,
    jsonb_build_object(
      'title', normalized_title,
      'content_type', content_type_value,
      'display_date', display_date_value,
      'status', status_value
    )
  );

  return saved_post_id;
end;
$$;

ALTER FUNCTION "public"."upsert_journal_post"("target_admin_id" "uuid", "target_post_id" "uuid", "title_value" "text", "excerpt_value" "text", "content_value" "text", "content_type_value" "text", "display_date_value" "date", "cover_image_url_value" "text", "video_url_value" "text", "status_value" "public"."journal_status") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."upsert_journal_post"("target_admin_id" "uuid", "target_post_id" "uuid", "title_value" "text", "excerpt_value" "text", "content_value" "text", "content_type_value" "text", "display_date_value" "date", "cover_image_url_value" "text", "video_url_value" "text", "status_value" "public"."journal_status") IS 'Service-role-only Journal draft/publication writer with active-Admin validation and audit logging.';

CREATE OR REPLACE FUNCTION "public"."upsert_pickup_location"("target_admin_id" "uuid", "target_location_id" "uuid", "name_value" "text", "description_value" "text", "active_value" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  saved_location_id uuid := coalesce(target_location_id, gen_random_uuid());
  target_location public.pickup_locations%rowtype;
  normalized_name text := trim(name_value);
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 100 then
    raise exception 'Pickup location name must contain between 2 and 100 characters';
  end if;
  if description_value is not null and length(trim(description_value)) > 300 then
    raise exception 'Pickup location description cannot exceed 300 characters';
  end if;

  if target_location_id is null then
    insert into public.pickup_locations (
      id, name, description, is_active, sort_order
    ) values (
      saved_location_id, normalized_name, nullif(trim(description_value), ''),
      coalesce(active_value, false),
      coalesce((select max(sort_order) + 1 from public.pickup_locations), 1)
    );
    audit_action := 'pickup.location_created';
  else
    select * into target_location
    from public.pickup_locations
    where id = target_location_id
    for update;
    if target_location.id is null then raise exception 'Pickup location was not found'; end if;

    update public.pickup_locations
    set name = normalized_name,
        description = nullif(trim(description_value), ''),
        is_active = coalesce(active_value, false),
        updated_at = now()
    where id = target_location.id;
    audit_action := 'pickup.location_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id, audit_action, 'pickup_location', saved_location_id::text,
    jsonb_build_object('name', normalized_name, 'is_active', coalesce(active_value, false))
  );
  return saved_location_id;
end;
$$;

ALTER FUNCTION "public"."upsert_pickup_location"("target_admin_id" "uuid", "target_location_id" "uuid", "name_value" "text", "description_value" "text", "active_value" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."upsert_pickup_location"("target_admin_id" "uuid", "target_location_id" "uuid", "name_value" "text", "description_value" "text", "active_value" boolean) IS 'Service-role-only Pickup location create/update function with active-Admin validation and audit logging.';

CREATE OR REPLACE FUNCTION "public"."upsert_pickup_schedule"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "pickup_date_value" "date", "availability_mode_value" "public"."pickup_availability_mode", "open_value" boolean, "notes_value" "text", "windows_value" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  saved_date_id uuid := coalesce(target_pickup_date_id, gen_random_uuid());
  target_date public.pickup_dates%rowtype;
  window_value jsonb;
  saved_window_id uuid;
  window_start time;
  window_end time;
  location_ids uuid[];
  window_position integer := 0;
  operating_start time;
  operating_end time;
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if pickup_date_value is null
    or pickup_date_value < (current_timestamp at time zone 'Asia/Manila')::date
  then
    raise exception 'Pickup date must be today or later';
  end if;
  if notes_value is not null and length(trim(notes_value)) > 500 then
    raise exception 'Pickup note cannot exceed 500 characters';
  end if;
  if jsonb_typeof(windows_value) <> 'array'
    or jsonb_array_length(windows_value) < 1
    or jsonb_array_length(windows_value) > 12
  then
    raise exception 'Pickup schedule requires between 1 and 12 windows';
  end if;

  select
    coalesce((select (value ->> 'start')::time from public.business_settings where key = 'pickup_operating_hours'), '07:00'::time),
    coalesce((select (value ->> 'end')::time from public.business_settings where key = 'pickup_operating_hours'), '19:00'::time)
  into operating_start, operating_end;

  if target_pickup_date_id is null then
    insert into public.pickup_dates (
      id, pickup_date, availability_mode, is_open, notes
    ) values (
      saved_date_id, pickup_date_value, availability_mode_value,
      coalesce(open_value, false), nullif(trim(notes_value), '')
    );
    audit_action := 'pickup.created';
  else
    select * into target_date
    from public.pickup_dates
    where id = target_pickup_date_id
    for update;

    if target_date.id is null then
      raise exception 'Pickup date was not found';
    end if;
    if exists (
      select 1 from public.daily_inventory
      where pickup_date = target_date.pickup_date
    ) or exists (
      select 1
      from public.orders
      join public.pickup_windows on pickup_windows.id = orders.pickup_window_id
      where pickup_windows.pickup_date_id = target_date.id
        and orders.status not in ('CANCELLED', 'EXPIRED')
    ) then
      raise exception 'Pickup schedule is locked by orders or inventory';
    end if;

    update public.pickup_dates
    set pickup_date = pickup_date_value,
        availability_mode = availability_mode_value,
        is_open = coalesce(open_value, false),
        notes = nullif(trim(notes_value), ''),
        updated_at = now()
    where id = target_date.id;
    delete from public.pickup_windows where pickup_date_id = target_date.id;
    audit_action := 'pickup.updated';
  end if;

  for window_value in select value from jsonb_array_elements(windows_value)
  loop
    if jsonb_typeof(window_value) <> 'object'
      or coalesce(window_value ->> 'start_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(window_value ->> 'end_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or jsonb_typeof(window_value -> 'location_ids') <> 'array'
      or jsonb_array_length(window_value -> 'location_ids') < 1
    then
      raise exception 'Pickup window is invalid';
    end if;

    window_start := (window_value ->> 'start_time')::time;
    window_end := (window_value ->> 'end_time')::time;
    select array_agg(distinct value::uuid)
    into location_ids
    from jsonb_array_elements_text(window_value -> 'location_ids');

    if window_end <= window_start
      or window_start < operating_start
      or window_end > operating_end
    then
      raise exception 'Pickup window falls outside the configured rules';
    end if;
    if cardinality(location_ids) <> jsonb_array_length(window_value -> 'location_ids')
      or (select count(*) from public.pickup_locations where id = any(location_ids) and is_active) <> cardinality(location_ids)
    then
      raise exception 'Pickup window contains an unavailable location';
    end if;

    insert into public.pickup_windows (
      pickup_date_id, start_time, end_time, is_open, sort_order
    ) values (
      saved_date_id, window_start, window_end, true, window_position
    ) returning id into saved_window_id;
    insert into public.pickup_window_locations (pickup_window_id, pickup_location_id, is_open)
    select saved_window_id, unnest(location_ids), true;
    window_position := window_position + 1;
  end loop;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id, audit_action, 'pickup_date', saved_date_id::text,
    jsonb_build_object(
      'pickup_date', pickup_date_value,
      'availability_mode', availability_mode_value,
      'is_open', coalesce(open_value, false),
      'window_count', jsonb_array_length(windows_value)
    )
  );
  return saved_date_id;
end;
$_$;

ALTER FUNCTION "public"."upsert_pickup_schedule"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "pickup_date_value" "date", "availability_mode_value" "public"."pickup_availability_mode", "open_value" boolean, "notes_value" "text", "windows_value" "jsonb") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."upsert_pickup_schedule"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "pickup_date_value" "date", "availability_mode_value" "public"."pickup_availability_mode", "open_value" boolean, "notes_value" "text", "windows_value" "jsonb") IS 'Service-role-only Pickup schedule writer with active-Admin validation, immutable booked/inventoried schedules, and audit logging.';

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "addons_price_check" CHECK (("price" >= (0)::numeric))
);

ALTER TABLE "public"."addons" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."business_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."business_settings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."coatings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price_per_piece" numeric(10,2) DEFAULT 5 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    CONSTRAINT "coatings_default_must_be_active" CHECK (((NOT "is_default") OR "is_active")),
    CONSTRAINT "coatings_price_per_piece_nonnegative" CHECK (("price_per_piece" >= (0)::numeric))
);

ALTER TABLE "public"."coatings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."daily_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pickup_date" "date" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "stock_total" integer NOT NULL,
    "stock_reserved" integer DEFAULT 0 NOT NULL,
    "stock_sold" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_inventory_check" CHECK ((("stock_reserved" + "stock_sold") <= "stock_total")),
    CONSTRAINT "daily_inventory_stock_reserved_check" CHECK (("stock_reserved" >= 0)),
    CONSTRAINT "daily_inventory_stock_sold_check" CHECK (("stock_sold" >= 0)),
    CONSTRAINT "daily_inventory_stock_total_check" CHECK (("stock_total" >= 0))
);

ALTER TABLE "public"."daily_inventory" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."inventory_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "daily_inventory_id" "uuid" NOT NULL,
    "quantity_delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_adjustments_quantity_delta_check" CHECK (("quantity_delta" <> 0)),
    CONSTRAINT "inventory_adjustments_reason_check" CHECK (("reason" = ANY (ARRAY['RESTOCK'::"text", 'WASTE'::"text", 'CORRECTION'::"text"])))
);

ALTER TABLE "public"."inventory_adjustments" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."journal_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "content_type" "text" NOT NULL,
    "display_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "cover_image_url" "text",
    "video_url" "text",
    "status" "public"."journal_status" DEFAULT 'draft'::"public"."journal_status" NOT NULL,
    "published_at" timestamp with time zone,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "journal_posts_check" CHECK ((("status" = 'draft'::"public"."journal_status") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "journal_posts_content_type_check" CHECK (("content_type" = ANY (ARRAY['announcement'::"text", 'story'::"text", 'product_feature'::"text", 'video'::"text"])))
);

ALTER TABLE "public"."journal_posts" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."loyalty_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "completed_order_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loyalty_accounts_completed_order_count_check" CHECK (("completed_order_count" >= 0))
);

ALTER TABLE "public"."loyalty_accounts" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."loyalty_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_type" "text" NOT NULL,
    "threshold" integer NOT NULL,
    "status" "public"."loyalty_reward_status" DEFAULT 'earned'::"public"."loyalty_reward_status" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "redeemed_at" timestamp with time zone,
    "source_order_id" "uuid" NOT NULL,
    "redeemed_order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loyalty_rewards_check" CHECK (((("status" = 'earned'::"public"."loyalty_reward_status") AND ("redeemed_at" IS NULL) AND ("redeemed_order_id" IS NULL)) OR (("status" = 'redeemed'::"public"."loyalty_reward_status") AND ("redeemed_at" IS NOT NULL) AND ("redeemed_order_id" IS NOT NULL)) OR ("status" = 'expired'::"public"."loyalty_reward_status"))),
    CONSTRAINT "loyalty_rewards_reward_type_check" CHECK (("reward_type" = 'FREE_4_PIECE'::"text")),
    CONSTRAINT "loyalty_rewards_threshold_check" CHECK (("threshold" > 0))
);

ALTER TABLE "public"."loyalty_rewards" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."manual_payment_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "receipt_path" "text" NOT NULL,
    "reported_reference" "text" NOT NULL,
    "reported_amount" numeric(10,2) NOT NULL,
    "reported_paid_at" timestamp with time zone NOT NULL,
    "reported_recipient" "text" NOT NULL,
    "status" "text" DEFAULT 'UNDER_REVIEW'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "rejection_reason" "text",
    CONSTRAINT "manual_payment_submissions_reported_amount_check" CHECK (("reported_amount" > (0)::numeric)),
    CONSTRAINT "manual_payment_submissions_reported_recipient_check" CHECK ((("length"("reported_recipient") >= 2) AND ("length"("reported_recipient") <= 100))),
    CONSTRAINT "manual_payment_submissions_reported_reference_check" CHECK (("reported_reference" ~ '^[A-Z0-9]{6,64}$'::"text")),
    CONSTRAINT "manual_payment_submissions_rejection_reason_check" CHECK ((("length"("rejection_reason") >= 3) AND ("length"("rejection_reason") <= 500))),
    CONSTRAINT "manual_payment_submissions_status_check" CHECK (("status" = ANY (ARRAY['UNDER_REVIEW'::"text", 'APPROVED'::"text", 'REJECTED'::"text"])))
);

ALTER TABLE "public"."manual_payment_submissions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."mutation_rate_limit_buckets" (
    "bucket_key_hash" "text" NOT NULL,
    "window_started_at" timestamp with time zone NOT NULL,
    "request_count" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mutation_rate_limit_buckets_bucket_key_hash_check" CHECK (("bucket_key_hash" ~ '^[a-f0-9]{64}$'::"text")),
    CONSTRAINT "mutation_rate_limit_buckets_request_count_check" CHECK (("request_count" > 0))
);

ALTER TABLE "public"."mutation_rate_limit_buckets" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."notification_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "user_id" "uuid",
    "provider" "text" DEFAULT 'resend'::"text" NOT NULL,
    "event_type" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "provider_message_id" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "last_attempt_at" timestamp with time zone,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "provider_event_at" timestamp with time zone,
    "last_event_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_deliveries_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "notification_deliveries_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'PROCESSING'::"text", 'SEND_FAILED'::"text", 'SENT'::"text", 'DELAYED'::"text", 'DELIVERED'::"text", 'BOUNCED'::"text", 'COMPLAINED'::"text", 'FAILED'::"text", 'SUPPRESSED'::"text"])))
);

ALTER TABLE "public"."notification_deliveries" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."notification_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" DEFAULT 'resend'::"text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "provider_message_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_created_at" timestamp with time zone NOT NULL,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."notification_webhook_events" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."order_item_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "addon_id" "uuid" NOT NULL,
    "addon_name_snapshot" "text" NOT NULL,
    "unit_price_snapshot" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "line_total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_item_addons_line_total_check" CHECK (("line_total" >= (0)::numeric)),
    CONSTRAINT "order_item_addons_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_item_addons_unit_price_snapshot_check" CHECK (("unit_price_snapshot" >= (0)::numeric))
);

ALTER TABLE "public"."order_item_addons" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."order_item_coatings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "coating_id" "uuid" NOT NULL,
    "coating_name_snapshot" "text" NOT NULL,
    "piece_count" integer NOT NULL,
    "additional_price_snapshot" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_item_coatings_additional_price_snapshot_check" CHECK (("additional_price_snapshot" >= (0)::numeric)),
    CONSTRAINT "order_item_coatings_piece_count_check" CHECK (("piece_count" > 0))
);

ALTER TABLE "public"."order_item_coatings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "variant_name_snapshot" "text" NOT NULL,
    "piece_count_snapshot" integer NOT NULL,
    "unit_price_snapshot" numeric(10,2) NOT NULL,
    "coating_total_snapshot" numeric(10,2) DEFAULT 0 NOT NULL,
    "quantity" integer NOT NULL,
    "line_subtotal" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_items_coating_total_snapshot_check" CHECK (("coating_total_snapshot" >= (0)::numeric)),
    CONSTRAINT "order_items_line_subtotal_check" CHECK (("line_subtotal" >= (0)::numeric)),
    CONSTRAINT "order_items_piece_count_snapshot_check" CHECK (("piece_count_snapshot" > 0)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_price_snapshot_check" CHECK (("unit_price_snapshot" >= (0)::numeric))
);

ALTER TABLE "public"."order_items" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."order_number_sequence"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."order_number_sequence" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid",
    "checkout_idempotency_key" "uuid",
    "status" "public"."order_status" DEFAULT 'PENDING_PAYMENT'::"public"."order_status" NOT NULL,
    "payment_status" "public"."payment_status" DEFAULT 'PENDING'::"public"."payment_status" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "pickup_date" "date" NOT NULL,
    "pickup_window_id" "uuid" NOT NULL,
    "pickup_location_id" "uuid" NOT NULL,
    "pickup_window_snapshot" "text" NOT NULL,
    "pickup_location_snapshot" "text" NOT NULL,
    "customer_notes" "text",
    "subtotal" numeric(10,2) NOT NULL,
    "discount_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "terms_version" "text" NOT NULL,
    "terms_accepted_at" timestamp with time zone NOT NULL,
    "payment_expires_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" "text" DEFAULT 'paymongo'::"text" NOT NULL,
    CONSTRAINT "orders_check" CHECK (("discount_total" <= "subtotal")),
    CONSTRAINT "orders_check1" CHECK (("total" = ("subtotal" - "discount_total"))),
    CONSTRAINT "orders_discount_total_check" CHECK (("discount_total" >= (0)::numeric)),
    CONSTRAINT "orders_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['paymongo'::"text", 'manual_gcash'::"text"]))),
    CONSTRAINT "orders_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "orders_total_check" CHECK (("total" >= (0)::numeric))
);

ALTER TABLE "public"."orders" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."payment_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "processed_at" timestamp with time zone,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."payment_webhook_events" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'paymongo'::"text" NOT NULL,
    "provider_checkout_id" "text",
    "provider_checkout_url" "text",
    "provider_payment_id" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'PHP'::"text" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'PENDING'::"public"."payment_status" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "manual_qr_payload" "text",
    CONSTRAINT "manual_payment_no_provider_checkout" CHECK ((("provider" <> 'manual_gcash'::"text") OR (("provider_checkout_id" IS NULL) AND ("provider_checkout_url" IS NULL)))),
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_currency_check" CHECK (("currency" = 'PHP'::"text")),
    CONSTRAINT "payments_provider_check" CHECK (("provider" = ANY (ARRAY['paymongo'::"text", 'manual_gcash'::"text", 'loyalty'::"text"])))
);

ALTER TABLE "public"."payments" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."pickup_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pickup_date" "date" NOT NULL,
    "availability_mode" "public"."pickup_availability_mode" DEFAULT 'MADE_TO_ORDER'::"public"."pickup_availability_mode" NOT NULL,
    "is_open" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."pickup_dates" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."pickup_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."pickup_locations" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."pickup_window_locations" (
    "pickup_window_id" "uuid" NOT NULL,
    "pickup_location_id" "uuid" NOT NULL,
    "is_open" boolean DEFAULT true NOT NULL
);

ALTER TABLE "public"."pickup_window_locations" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."pickup_windows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pickup_date_id" "uuid" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_open" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pickup_windows_check" CHECK (("end_time" > "start_time"))
);

ALTER TABLE "public"."pickup_windows" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "piece_count" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_variants_piece_count_check" CHECK (("piece_count" > 0))
);

ALTER TABLE "public"."product_variants" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "image_url" "text",
    "price_per_piece" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_price_per_piece_check" CHECK (("price_per_piece" >= (0)::numeric))
);

ALTER TABLE "public"."products" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."profile_role" DEFAULT 'customer'::"public"."profile_role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "deletion_requested_at" timestamp with time zone,
    "deletion_scheduled_for" timestamp with time zone,
    "deactivated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_deactivation_consistent" CHECK ((("is_active" AND ("deactivated_at" IS NULL)) OR ((NOT "is_active") AND ("deactivated_at" IS NOT NULL)))),
    CONSTRAINT "profiles_deletion_schedule_consistent" CHECK (((("deletion_requested_at" IS NULL) AND ("deletion_scheduled_for" IS NULL)) OR (("deletion_requested_at" IS NOT NULL) AND ("deletion_scheduled_for" = ("deletion_requested_at" + '90 days'::interval)))))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid" NOT NULL,
    "display_name_snapshot" "text" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text" NOT NULL,
    "is_visible" boolean DEFAULT false NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_comment_check" CHECK (("length"(TRIM(BOTH FROM "comment")) > 0)),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);

ALTER TABLE "public"."reviews" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."terms_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "content" "text" NOT NULL,
    "effective_at" timestamp with time zone NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."terms_versions" OWNER TO "postgres";

ALTER TABLE ONLY "public"."addons"
    ADD CONSTRAINT "addons_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."addons"
    ADD CONSTRAINT "addons_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."business_settings"
    ADD CONSTRAINT "business_settings_pkey" PRIMARY KEY ("key");

ALTER TABLE ONLY "public"."coatings"
    ADD CONSTRAINT "coatings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."coatings"
    ADD CONSTRAINT "coatings_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."daily_inventory"
    ADD CONSTRAINT "daily_inventory_pickup_date_product_id_key" UNIQUE ("pickup_date", "product_id");

ALTER TABLE ONLY "public"."daily_inventory"
    ADD CONSTRAINT "daily_inventory_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."journal_posts"
    ADD CONSTRAINT "journal_posts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."journal_posts"
    ADD CONSTRAINT "journal_posts_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_user_id_key" UNIQUE ("user_id");

ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_user_id_reward_type_source_order_id_key" UNIQUE ("user_id", "reward_type", "source_order_id");

ALTER TABLE ONLY "public"."manual_payment_submissions"
    ADD CONSTRAINT "manual_payment_submissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."manual_payment_submissions"
    ADD CONSTRAINT "manual_payment_submissions_receipt_path_key" UNIQUE ("receipt_path");

ALTER TABLE ONLY "public"."mutation_rate_limit_buckets"
    ADD CONSTRAINT "mutation_rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key_hash", "window_started_at");

ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_idempotency_key_key" UNIQUE ("idempotency_key");

ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_provider_message_id_key" UNIQUE ("provider_message_id");

ALTER TABLE ONLY "public"."notification_webhook_events"
    ADD CONSTRAINT "notification_webhook_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notification_webhook_events"
    ADD CONSTRAINT "notification_webhook_events_provider_event_id_key" UNIQUE ("provider_event_id");

ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_order_item_id_addon_id_key" UNIQUE ("order_item_id", "addon_id");

ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."order_item_coatings"
    ADD CONSTRAINT "order_item_coatings_order_item_id_coating_id_key" UNIQUE ("order_item_id", "coating_id");

ALTER TABLE ONLY "public"."order_item_coatings"
    ADD CONSTRAINT "order_item_coatings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."payment_webhook_events"
    ADD CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."payment_webhook_events"
    ADD CONSTRAINT "payment_webhook_events_provider_event_id_key" UNIQUE ("provider_event_id");

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pickup_dates"
    ADD CONSTRAINT "pickup_dates_pickup_date_key" UNIQUE ("pickup_date");

ALTER TABLE ONLY "public"."pickup_dates"
    ADD CONSTRAINT "pickup_dates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pickup_locations"
    ADD CONSTRAINT "pickup_locations_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."pickup_locations"
    ADD CONSTRAINT "pickup_locations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pickup_window_locations"
    ADD CONSTRAINT "pickup_window_locations_pkey" PRIMARY KEY ("pickup_window_id", "pickup_location_id");

ALTER TABLE ONLY "public"."pickup_windows"
    ADD CONSTRAINT "pickup_windows_pickup_date_id_start_time_end_time_key" UNIQUE ("pickup_date_id", "start_time", "end_time");

ALTER TABLE ONLY "public"."pickup_windows"
    ADD CONSTRAINT "pickup_windows_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_piece_count_key" UNIQUE ("product_id", "piece_count");

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_key" UNIQUE ("order_id");

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."terms_versions"
    ADD CONSTRAINT "terms_versions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."terms_versions"
    ADD CONSTRAINT "terms_versions_version_key" UNIQUE ("version");

CREATE INDEX "addons_catalog_idx" ON "public"."addons" USING "btree" ("is_active");

CREATE INDEX "admin_audit_logs_admin_idx" ON "public"."admin_audit_logs" USING "btree" ("admin_id", "created_at" DESC);

CREATE INDEX "coatings_catalog_idx" ON "public"."coatings" USING "btree" ("is_active", "sort_order");

CREATE UNIQUE INDEX "coatings_one_default_idx" ON "public"."coatings" USING "btree" ("is_default") WHERE "is_default";

CREATE INDEX "journal_posts_public_idx" ON "public"."journal_posts" USING "btree" ("status", "published_at" DESC);

CREATE UNIQUE INDEX "loyalty_rewards_redeemed_order_key" ON "public"."loyalty_rewards" USING "btree" ("redeemed_order_id") WHERE ("redeemed_order_id" IS NOT NULL);

CREATE INDEX "loyalty_rewards_user_idx" ON "public"."loyalty_rewards" USING "btree" ("user_id", "status");

CREATE UNIQUE INDEX "manual_approved_reported_reference" ON "public"."manual_payment_submissions" USING "btree" ("reported_reference") WHERE ("status" = 'APPROVED'::"text");

CREATE UNIQUE INDEX "manual_one_open_review" ON "public"."manual_payment_submissions" USING "btree" ("order_id") WHERE ("status" = 'UNDER_REVIEW'::"text");

CREATE INDEX "manual_submissions_order_idx" ON "public"."manual_payment_submissions" USING "btree" ("order_id", "submitted_at" DESC);

CREATE INDEX "mutation_rate_limit_updated_idx" ON "public"."mutation_rate_limit_buckets" USING "btree" ("updated_at");

CREATE INDEX "notification_deliveries_order_idx" ON "public"."notification_deliveries" USING "btree" ("order_id", "event_type");

CREATE INDEX "notification_deliveries_retry_idx" ON "public"."notification_deliveries" USING "btree" ("next_attempt_at", "created_at") WHERE ("status" = ANY (ARRAY['PENDING'::"text", 'SEND_FAILED'::"text"]));

CREATE INDEX "notification_webhook_message_idx" ON "public"."notification_webhook_events" USING "btree" ("provider_message_id", "event_created_at" DESC);

CREATE INDEX "order_item_addons_item_idx" ON "public"."order_item_addons" USING "btree" ("order_item_id");

CREATE INDEX "order_item_coatings_item_idx" ON "public"."order_item_coatings" USING "btree" ("order_item_id");

CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id", "created_at", "id");

CREATE INDEX "orders_pickup_date_idx" ON "public"."orders" USING "btree" ("pickup_date", "status");

CREATE INDEX "orders_status_created_idx" ON "public"."orders" USING "btree" ("status", "created_at" DESC);

CREATE UNIQUE INDEX "orders_user_checkout_idempotency_key" ON "public"."orders" USING "btree" ("user_id", "checkout_idempotency_key") WHERE (("user_id" IS NOT NULL) AND ("checkout_idempotency_key" IS NOT NULL));

CREATE INDEX "orders_user_created_idx" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC, "id" DESC);

CREATE INDEX "payments_order_idx" ON "public"."payments" USING "btree" ("order_id", "status");

CREATE UNIQUE INDEX "payments_order_key" ON "public"."payments" USING "btree" ("order_id");

CREATE UNIQUE INDEX "payments_provider_checkout_key" ON "public"."payments" USING "btree" ("provider", "provider_checkout_id") WHERE ("provider_checkout_id" IS NOT NULL);

CREATE UNIQUE INDEX "payments_provider_payment_key" ON "public"."payments" USING "btree" ("provider", "provider_payment_id") WHERE ("provider_payment_id" IS NOT NULL);

CREATE INDEX "pickup_dates_open_idx" ON "public"."pickup_dates" USING "btree" ("pickup_date") WHERE "is_open";

CREATE INDEX "pickup_windows_date_idx" ON "public"."pickup_windows" USING "btree" ("pickup_date_id", "is_open", "sort_order");

CREATE INDEX "product_variants_catalog_idx" ON "public"."product_variants" USING "btree" ("product_id", "is_active", "sort_order");

CREATE INDEX "profiles_deletion_due_idx" ON "public"."profiles" USING "btree" ("deletion_scheduled_for") WHERE ("is_active" AND ("deletion_scheduled_for" IS NOT NULL));

CREATE UNIQUE INDEX "profiles_email_lower_key" ON "public"."profiles" USING "btree" ("lower"("email"));

CREATE INDEX "reviews_public_idx" ON "public"."reviews" USING "btree" ("is_visible", "is_featured", "created_at" DESC);

CREATE UNIQUE INDEX "terms_one_current_idx" ON "public"."terms_versions" USING "btree" ("is_current") WHERE "is_current";

CREATE OR REPLACE TRIGGER "addons_set_updated_at" BEFORE UPDATE ON "public"."addons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "coatings_set_updated_at" BEFORE UPDATE ON "public"."coatings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "daily_inventory_set_updated_at" BEFORE UPDATE ON "public"."daily_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "journal_posts_set_updated_at" BEFORE UPDATE ON "public"."journal_posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "loyalty_accounts_set_updated_at" BEFORE UPDATE ON "public"."loyalty_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "notification_deliveries_set_updated_at" BEFORE UPDATE ON "public"."notification_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "orders_enqueue_transactional_email" AFTER INSERT OR UPDATE OF "status", "payment_status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_transactional_order_email"();

CREATE OR REPLACE TRIGGER "orders_sync_completed_loyalty" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_completed_order_loyalty"();

CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "pickup_dates_set_updated_at" BEFORE UPDATE ON "public"."pickup_dates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "pickup_locations_set_updated_at" BEFORE UPDATE ON "public"."pickup_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "pickup_windows_set_updated_at" BEFORE UPDATE ON "public"."pickup_windows" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "product_variants_set_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "profiles_enforce_admin_limit" BEFORE INSERT OR UPDATE OF "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_limit"();

CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "reviews_set_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."daily_inventory"
    ADD CONSTRAINT "daily_inventory_pickup_date_fkey" FOREIGN KEY ("pickup_date") REFERENCES "public"."pickup_dates"("pickup_date") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."daily_inventory"
    ADD CONSTRAINT "daily_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_daily_inventory_id_fkey" FOREIGN KEY ("daily_inventory_id") REFERENCES "public"."daily_inventory"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."journal_posts"
    ADD CONSTRAINT "journal_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_redeemed_order_id_fkey" FOREIGN KEY ("redeemed_order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_source_order_id_fkey" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."manual_payment_submissions"
    ADD CONSTRAINT "manual_payment_submissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."manual_payment_submissions"
    ADD CONSTRAINT "manual_payment_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."order_item_addons"
    ADD CONSTRAINT "order_item_addons_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_item_coatings"
    ADD CONSTRAINT "order_item_coatings_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "public"."coatings"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."order_item_coatings"
    ADD CONSTRAINT "order_item_coatings_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pickup_window_id_fkey" FOREIGN KEY ("pickup_window_id") REFERENCES "public"."pickup_windows"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."pickup_window_locations"
    ADD CONSTRAINT "pickup_window_locations_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."pickup_window_locations"
    ADD CONSTRAINT "pickup_window_locations_pickup_window_id_fkey" FOREIGN KEY ("pickup_window_id") REFERENCES "public"."pickup_windows"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."pickup_windows"
    ADD CONSTRAINT "pickup_windows_pickup_date_id_fkey" FOREIGN KEY ("pickup_date_id") REFERENCES "public"."pickup_dates"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE "public"."addons" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addons_read_active_or_admin" ON "public"."addons" FOR SELECT TO "authenticated", "anon" USING (("is_active" OR "public"."is_admin"()));

ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_logs_admin_read" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."business_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_settings_admin_read" ON "public"."business_settings" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."coatings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coatings_read_active_or_admin" ON "public"."coatings" FOR SELECT TO "authenticated", "anon" USING (("is_active" OR "public"."is_admin"()));

ALTER TABLE "public"."daily_inventory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_inventory_admin_read" ON "public"."daily_inventory" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."inventory_adjustments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_adjustments_admin_read" ON "public"."inventory_adjustments" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."journal_posts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_posts_read_published_or_admin" ON "public"."journal_posts" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"public"."journal_status") OR "public"."is_admin"()));

ALTER TABLE "public"."loyalty_accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_accounts_read_own_or_admin" ON "public"."loyalty_accounts" FOR SELECT TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"()));

ALTER TABLE "public"."loyalty_rewards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_rewards_read_own_or_admin" ON "public"."loyalty_rewards" FOR SELECT TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"()));

ALTER TABLE "public"."manual_payment_submissions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_submission_read" ON "public"."manual_payment_submissions" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "manual_payment_submissions"."order_id") AND ("orders"."user_id" = "auth"."uid"()) AND "public"."is_active_user"())))));

ALTER TABLE "public"."mutation_rate_limit_buckets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notification_deliveries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_deliveries_admin_read" ON "public"."notification_deliveries" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."notification_webhook_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_webhook_events_admin_read" ON "public"."notification_webhook_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."order_item_addons" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_item_addons_read_own_or_admin" ON "public"."order_item_addons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."order_items"
     JOIN "public"."orders" ON (("orders"."id" = "order_items"."order_id")))
  WHERE (("order_items"."id" = "order_item_addons"."order_item_id") AND ((("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"())))));

ALTER TABLE "public"."order_item_coatings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_item_coatings_read_own_or_admin" ON "public"."order_item_coatings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."order_items"
     JOIN "public"."orders" ON (("orders"."id" = "order_items"."order_id")))
  WHERE (("order_items"."id" = "order_item_coatings"."order_item_id") AND ((("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"())))));

ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_read_own_or_admin" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ((("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"())))));

ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_read_own_or_admin" ON "public"."orders" FOR SELECT TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"()));

ALTER TABLE "public"."payment_webhook_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_webhook_events_admin_read" ON "public"."payment_webhook_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_read_own_or_admin" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "payments"."order_id") AND ((("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"())))));

ALTER TABLE "public"."pickup_dates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_dates_read_open_or_admin" ON "public"."pickup_dates" FOR SELECT TO "authenticated", "anon" USING (("is_open" OR "public"."is_admin"()));

ALTER TABLE "public"."pickup_locations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_locations_read_active_or_admin" ON "public"."pickup_locations" FOR SELECT TO "authenticated", "anon" USING (("is_active" OR "public"."is_admin"()));

ALTER TABLE "public"."pickup_window_locations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_window_locations_read_open_or_admin" ON "public"."pickup_window_locations" FOR SELECT TO "authenticated", "anon" USING (("is_open" OR "public"."is_admin"()));

ALTER TABLE "public"."pickup_windows" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_windows_read_open_or_admin" ON "public"."pickup_windows" FOR SELECT TO "authenticated", "anon" USING (("is_open" OR "public"."is_admin"()));

ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_variants_read_active_or_admin" ON "public"."product_variants" FOR SELECT TO "authenticated", "anon" USING (("is_active" OR "public"."is_admin"()));

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_read_active_or_admin" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING (("is_active" OR "public"."is_admin"()));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_own_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((("id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"()));

CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"())) WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()));

ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read_visible_owner_or_admin" ON "public"."reviews" FOR SELECT TO "authenticated", "anon" USING (("is_visible" OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"()) OR "public"."is_admin"()));

ALTER TABLE "public"."terms_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terms_versions_read_current_or_admin" ON "public"."terms_versions" FOR SELECT TO "authenticated", "anon" USING (("is_current" OR "public"."is_admin"()));

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

REVOKE ALL ON FUNCTION "public"."attach_paymongo_checkout"("target_payment_id" "uuid", "checkout_id" "text", "checkout_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attach_paymongo_checkout"("target_payment_id" "uuid", "checkout_id" "text", "checkout_url" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."cancel_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_account_deletion"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."cancel_unpaid_order"("target_order_id" "uuid", "target_user_id" "uuid", "expired_checkout_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_unpaid_order"("target_order_id" "uuid", "target_user_id" "uuid", "expired_checkout_id" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."consume_mutation_rate_limit"("bucket_key_hashes" "text"[], "maximum_requests" integer, "window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_mutation_rate_limit"("bucket_key_hashes" "text"[], "maximum_requests" integer, "window_seconds" integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_checkout_order"("target_user_id" "uuid", "checkout_key" "uuid", "selected_pickup_window_id" "uuid", "selected_pickup_location_id" "uuid", "customer_name_value" "text", "customer_notes_value" "text", "priced_lines" "jsonb", "subtotal_value" numeric, "discount_value" numeric, "total_value" numeric, "terms_version_value" "text", "loyalty_reward_id" "uuid", "payment_method_value" "text", "qr_payload_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_checkout_order"("target_user_id" "uuid", "checkout_key" "uuid", "selected_pickup_window_id" "uuid", "selected_pickup_location_id" "uuid", "customer_name_value" "text", "customer_notes_value" "text", "priced_lines" "jsonb", "subtotal_value" numeric, "discount_value" numeric, "total_value" numeric, "terms_version_value" "text", "loyalty_reward_id" "uuid", "payment_method_value" "text", "qr_payload_value" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."deactivate_due_account"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_due_account"("target_user_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."enforce_admin_limit"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."enqueue_transactional_order_email"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."expire_paymongo_order"("target_payment_id" "uuid", "checkout_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_paymongo_order"("target_payment_id" "uuid", "checkout_id" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."expire_pending_orders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_pending_orders"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_admin_customer_summaries"("target_admin_id" "uuid", "search_value" "text", "result_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_customer_summaries"("target_admin_id" "uuid", "search_value" "text", "result_limit" integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_public_pickup_inventory"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_pickup_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_pickup_inventory"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."get_public_pickup_settings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_pickup_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_pickup_settings"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."is_active_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."list_due_paymongo_checkouts"("batch_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_due_paymongo_checkouts"("batch_limit" integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."moderate_order_review"("target_admin_id" "uuid", "target_review_id" "uuid", "visible_value" boolean, "featured_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."moderate_order_review"("target_admin_id" "uuid", "target_review_id" "uuid", "visible_value" boolean, "featured_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."prepare_order_cancellation"("target_order_id" "uuid", "target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prepare_order_cancellation"("target_order_id" "uuid", "target_user_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."prepare_paymongo_checkout"("target_order_id" "uuid", "target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prepare_paymongo_checkout"("target_order_id" "uuid", "target_user_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."process_paymongo_paid_event"("event_key" "text", "target_order_id" "uuid", "target_order_number" "text", "checkout_id" "text", "payment_id" "text", "paid_amount" numeric, "event_summary" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_paymongo_paid_event"("event_key" "text", "target_order_id" "uuid", "target_order_number" "text", "checkout_id" "text", "payment_id" "text", "paid_amount" numeric, "event_summary" "jsonb") TO "service_role";

REVOKE ALL ON FUNCTION "public"."process_resend_delivery_event"("provider_event_id_value" "text", "provider_message_id_value" "text", "event_type_value" "text", "event_created_at_value" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_resend_delivery_event"("provider_event_id_value" "text", "provider_message_id_value" "text", "event_type_value" "text", "event_created_at_value" timestamp with time zone) TO "service_role";

REVOKE ALL ON FUNCTION "public"."promote_admin_by_email"("target_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."promote_admin_by_email"("target_email" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."prune_mutation_rate_limit_buckets"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prune_mutation_rate_limit_buckets"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."record_inventory_consumption"("target_admin_id" "uuid", "target_inventory_id" "uuid", "quantity_value" integer, "reason_value" "text", "notes_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_inventory_consumption"("target_admin_id" "uuid", "target_inventory_id" "uuid", "quantity_value" integer, "reason_value" "text", "notes_value" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."request_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."review_manual_payment"("target_admin_id" "uuid", "target_submission_id" "uuid", "approve" boolean, "reason_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_manual_payment"("target_admin_id" "uuid", "target_submission_id" "uuid", "approve" boolean, "reason_value" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_pickup_date_open"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "open_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_pickup_date_open"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "open_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."submit_manual_payment"("target_user_id" "uuid", "target_order_id" "uuid", "submission_id" "uuid", "receipt_path_value" "text", "reported_reference_value" "text", "reported_amount_value" numeric, "reported_paid_at_value" timestamp with time zone, "reported_recipient_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_manual_payment"("target_user_id" "uuid", "target_order_id" "uuid", "submission_id" "uuid", "receipt_path_value" "text", "reported_reference_value" "text", "reported_amount_value" numeric, "reported_paid_at_value" timestamp with time zone, "reported_recipient_value" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."submit_order_review"("target_user_id" "uuid", "target_order_id" "uuid", "rating_value" integer, "comment_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_order_review"("target_user_id" "uuid", "target_order_id" "uuid", "rating_value" integer, "comment_value" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."sync_completed_order_loyalty"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."transition_order_status"("target_admin_id" "uuid", "target_order_id" "uuid", "expected_status" "public"."order_status", "next_status" "public"."order_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_order_status"("target_admin_id" "uuid", "target_order_id" "uuid", "expected_status" "public"."order_status", "next_status" "public"."order_status") TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_catalog_product"("target_admin_id" "uuid", "target_product_id" "uuid", "description_value" "text", "price_per_piece_value" numeric, "active_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_catalog_product"("target_admin_id" "uuid", "target_product_id" "uuid", "description_value" "text", "price_per_piece_value" numeric, "active_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_catalog_variant"("target_admin_id" "uuid", "target_variant_id" "uuid", "active_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_catalog_variant"("target_admin_id" "uuid", "target_variant_id" "uuid", "active_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_pickup_settings"("target_admin_id" "uuid", "minimum_lead_days_value" integer, "daily_cutoff_time_value" time without time zone, "grace_minutes_value" integer, "operating_start_value" time without time zone, "operating_end_value" time without time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_pickup_settings"("target_admin_id" "uuid", "minimum_lead_days_value" integer, "daily_cutoff_time_value" time without time zone, "grace_minutes_value" integer, "operating_start_value" time without time zone, "operating_end_value" time without time zone) TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_catalog_addon"("target_admin_id" "uuid", "target_addon_id" "uuid", "name_value" "text", "price_value" numeric, "active_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_catalog_addon"("target_admin_id" "uuid", "target_addon_id" "uuid", "name_value" "text", "price_value" numeric, "active_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_catalog_coating"("target_admin_id" "uuid", "target_coating_id" "uuid", "name_value" "text", "description_value" "text", "image_url_value" "text", "price_per_piece_value" numeric, "active_value" boolean, "default_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_catalog_coating"("target_admin_id" "uuid", "target_coating_id" "uuid", "name_value" "text", "description_value" "text", "image_url_value" "text", "price_per_piece_value" numeric, "active_value" boolean, "default_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_daily_inventory"("target_admin_id" "uuid", "target_pickup_date" "date", "target_product_id" "uuid", "stock_total_value" integer, "notes_value" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_daily_inventory"("target_admin_id" "uuid", "target_pickup_date" "date", "target_product_id" "uuid", "stock_total_value" integer, "notes_value" "text") TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_journal_post"("target_admin_id" "uuid", "target_post_id" "uuid", "title_value" "text", "excerpt_value" "text", "content_value" "text", "content_type_value" "text", "display_date_value" "date", "cover_image_url_value" "text", "video_url_value" "text", "status_value" "public"."journal_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_journal_post"("target_admin_id" "uuid", "target_post_id" "uuid", "title_value" "text", "excerpt_value" "text", "content_value" "text", "content_type_value" "text", "display_date_value" "date", "cover_image_url_value" "text", "video_url_value" "text", "status_value" "public"."journal_status") TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_pickup_location"("target_admin_id" "uuid", "target_location_id" "uuid", "name_value" "text", "description_value" "text", "active_value" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_pickup_location"("target_admin_id" "uuid", "target_location_id" "uuid", "name_value" "text", "description_value" "text", "active_value" boolean) TO "service_role";

REVOKE ALL ON FUNCTION "public"."upsert_pickup_schedule"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "pickup_date_value" "date", "availability_mode_value" "public"."pickup_availability_mode", "open_value" boolean, "notes_value" "text", "windows_value" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_pickup_schedule"("target_admin_id" "uuid", "target_pickup_date_id" "uuid", "pickup_date_value" "date", "availability_mode_value" "public"."pickup_availability_mode", "open_value" boolean, "notes_value" "text", "windows_value" "jsonb") TO "service_role";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."addons" TO "service_role";
GRANT SELECT ON TABLE "public"."addons" TO "anon";
GRANT SELECT ON TABLE "public"."addons" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_audit_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."admin_audit_logs" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."business_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."business_settings" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."coatings" TO "service_role";
GRANT SELECT ON TABLE "public"."coatings" TO "anon";
GRANT SELECT ON TABLE "public"."coatings" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."daily_inventory" TO "service_role";
GRANT SELECT ON TABLE "public"."daily_inventory" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."inventory_adjustments" TO "service_role";
GRANT SELECT ON TABLE "public"."inventory_adjustments" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."journal_posts" TO "service_role";
GRANT SELECT ON TABLE "public"."journal_posts" TO "anon";
GRANT SELECT ON TABLE "public"."journal_posts" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_accounts" TO "service_role";
GRANT SELECT ON TABLE "public"."loyalty_accounts" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_rewards" TO "service_role";
GRANT SELECT ON TABLE "public"."loyalty_rewards" TO "authenticated";

GRANT ALL ON TABLE "public"."manual_payment_submissions" TO "service_role";
GRANT SELECT ON TABLE "public"."manual_payment_submissions" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."mutation_rate_limit_buckets" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."notification_deliveries" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_deliveries" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_webhook_events" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_webhook_events" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_item_addons" TO "service_role";
GRANT SELECT ON TABLE "public"."order_item_addons" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_item_coatings" TO "service_role";
GRANT SELECT ON TABLE "public"."order_item_coatings" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "service_role";
GRANT SELECT ON TABLE "public"."order_items" TO "authenticated";

GRANT UPDATE ON SEQUENCE "public"."order_number_sequence" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."order_number_sequence" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."order_number_sequence" TO "service_role";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "service_role";
GRANT SELECT ON TABLE "public"."orders" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."payment_webhook_events" TO "service_role";
GRANT SELECT ON TABLE "public"."payment_webhook_events" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."payments" TO "service_role";
GRANT SELECT ON TABLE "public"."payments" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_dates" TO "service_role";
GRANT SELECT ON TABLE "public"."pickup_dates" TO "anon";
GRANT SELECT ON TABLE "public"."pickup_dates" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_locations" TO "service_role";
GRANT SELECT ON TABLE "public"."pickup_locations" TO "anon";
GRANT SELECT ON TABLE "public"."pickup_locations" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_window_locations" TO "service_role";
GRANT SELECT ON TABLE "public"."pickup_window_locations" TO "anon";
GRANT SELECT ON TABLE "public"."pickup_window_locations" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."pickup_windows" TO "service_role";
GRANT SELECT ON TABLE "public"."pickup_windows" TO "anon";
GRANT SELECT ON TABLE "public"."pickup_windows" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_variants" TO "service_role";
GRANT SELECT ON TABLE "public"."product_variants" TO "anon";
GRANT SELECT ON TABLE "public"."product_variants" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "service_role";
GRANT SELECT ON TABLE "public"."products" TO "anon";
GRANT SELECT ON TABLE "public"."products" TO "authenticated";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."reviews" TO "service_role";
GRANT SELECT ON TABLE "public"."reviews" TO "authenticated";

GRANT SELECT("id") ON TABLE "public"."reviews" TO "anon";

GRANT SELECT("display_name_snapshot") ON TABLE "public"."reviews" TO "anon";

GRANT SELECT("rating") ON TABLE "public"."reviews" TO "anon";

GRANT SELECT("comment") ON TABLE "public"."reviews" TO "anon";

GRANT SELECT("is_featured") ON TABLE "public"."reviews" TO "anon";

GRANT SELECT("created_at") ON TABLE "public"."reviews" TO "anon";

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."terms_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."terms_versions" TO "anon";
GRANT SELECT ON TABLE "public"."terms_versions" TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";

--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT OR UPDATE OF "email", "raw_user_meta_data" ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- Storage bucket metadata is data, so schema squash does not preserve it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-media','catalog-media',true,3145728,array['image/jpeg','image/png','image/webp']),
  ('journal-media','journal-media',true,3145728,array['image/jpeg','image/png','image/webp']),
  ('payment-receipts','payment-receipts',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
