-- Preserve applied history; repair snapshot-based stock release atomically.

CREATE OR REPLACE FUNCTION "public"."cancel_unpaid_order"("target_order_id" "uuid", "target_user_id" "uuid", "expired_checkout_id" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
  pickup_date_value date;
  pickup_mode public.pickup_availability_mode;
  reserved_items record;
begin
  if not exists (select 1 from public.profiles where id = target_user_id and is_active and role = 'customer') then
    raise exception 'Active customer access is required';
  end if;
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
      and pickup_date_value = (target_order.created_at at time zone 'Asia/Manila')::date
    )
  then
    for reserved_items in
      select product_id, sum(quantity * piece_count_snapshot)::integer as pieces
      from public.order_items where order_id = target_order.id
      group by product_id order by product_id
    loop
      update public.daily_inventory
        set stock_reserved = stock_reserved - reserved_items.pieces, updated_at = now()
        where product_id = reserved_items.product_id and pickup_date = target_order.pickup_date
        and stock_reserved >= reserved_items.pieces;
      if not found then raise exception 'Reserved inventory is inconsistent'; end if;
    end loop;
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

CREATE OR REPLACE FUNCTION "public"."expire_paymongo_order"("target_payment_id" "uuid", "checkout_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_payment public.payments%rowtype;
  target_order public.orders%rowtype;
  pickup_date_value date;
  pickup_mode public.pickup_availability_mode;
  reserved_items record;
begin
  -- Match cancellation/manual writers: lock order before payment to avoid deadlocks.
  perform 1 from public.orders where id = (
    select p.order_id from public.payments p where p.id = target_payment_id
  ) for update;

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
      and pickup_date_value = (target_order.created_at at time zone 'Asia/Manila')::date
    )
  then
    for reserved_items in
      select product_id, sum(quantity * piece_count_snapshot)::integer as pieces
      from public.order_items where order_id = target_order.id
      group by product_id order by product_id
    loop
      update public.daily_inventory
        set stock_reserved = stock_reserved - reserved_items.pieces, updated_at = now()
        where product_id = reserved_items.product_id and pickup_date = target_order.pickup_date
        and stock_reserved >= reserved_items.pieces;
      if not found then raise exception 'Reserved inventory is inconsistent'; end if;
    end loop;
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

CREATE OR REPLACE FUNCTION "public"."expire_pending_orders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  expired_order record;
  reserved_items record;
  target_payment public.payments%rowtype;
  expired_count integer := 0;
begin
  for expired_order in
    select
      orders.id,
      orders.created_at,
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
    select * into target_payment from public.payments where order_id = expired_order.id for update;
    if target_payment.id is not null and (target_payment.status <> 'PENDING' or target_payment.provider_checkout_id is not null) then
      continue;
    end if;
    if expired_order.availability_mode = 'READY_STOCK'
      or (
        expired_order.availability_mode = 'HYBRID'
        and expired_order.pickup_date = (expired_order.created_at at time zone 'Asia/Manila')::date
      )
    then
      for reserved_items in
        select product_id, sum(quantity * piece_count_snapshot)::integer as pieces
        from public.order_items where order_id = expired_order.id
        group by product_id order by product_id
      loop
        update public.daily_inventory
          set stock_reserved = stock_reserved - reserved_items.pieces, updated_at = now()
          where product_id = reserved_items.product_id and pickup_date = expired_order.pickup_date
          and stock_reserved >= reserved_items.pieces;
        if not found then raise exception 'Reserved inventory is inconsistent'; end if;
      end loop;
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


CREATE OR REPLACE FUNCTION "public"."replace_paymongo_checkout"("target_payment_id" "uuid", "expected_checkout_id" "text", "checkout_id" "text", "checkout_url" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  target_payment public.payments%rowtype;
  target_order public.orders%rowtype;
begin
  if expected_checkout_id !~ '^cs_[A-Za-z0-9_-]+$'
    or checkout_id !~ '^cs_[A-Za-z0-9_-]+$'
    or checkout_url !~ '^https://checkout[.]paymongo[.]com/'
  then
    raise exception 'PayMongo checkout reference is invalid';
  end if;


  -- Match cancellation/manual writers: lock order before payment to avoid deadlocks.
  perform 1 from public.orders where id = (
    select p.order_id from public.payments p where p.id = target_payment_id
  ) for update;

  select * into target_payment
  from public.payments
  where id = target_payment_id
  for update;

  if target_payment.id is null
    or target_payment.provider <> 'paymongo'
    or target_payment.status <> 'PENDING'
    or target_payment.provider_checkout_id is distinct from expected_checkout_id
  then
    raise exception 'Pending PayMongo checkout has changed';
  end if;

  select * into target_order
  from public.orders
  where id = target_payment.order_id
  for update;

  if target_order.id is null
    or target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'PENDING'
    or target_order.payment_expires_at is null
    or target_order.payment_expires_at <= now()
  then
    raise exception 'Order is not eligible for a replacement checkout';
  end if;

  update public.payments
  set provider_checkout_id = checkout_id,
      provider_checkout_url = checkout_url,
      updated_at = now()
  where id = target_payment.id;

  return true;
end;
$_$;

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


  -- Match cancellation/manual writers: lock order before payment to avoid deadlocks.
  perform 1 from public.orders where id = (
    select p.order_id from public.payments p where p.provider = 'paymongo' and p.provider_checkout_id = checkout_id
  ) for update;

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
