-- Bring existing hosted projects in line with the canonical expiration logic.
-- The original bootstrap migration was updated after hosted Dev had already
-- applied it, so a forward migration is required instead of replaying history.

create or replace function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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

create or replace function public.expire_paymongo_order(
  target_payment_id uuid,
  checkout_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
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

-- Repair historical inconsistencies created by the older hosted Dev function.
update public.orders
set payment_status = 'FAILED',
    updated_at = now()
where status = 'EXPIRED'
  and payment_status = 'PENDING';

update public.payments
set status = 'FAILED',
    updated_at = now()
where status = 'PENDING'
  and order_id in (
    select id
    from public.orders
    where status = 'EXPIRED'
      and payment_status = 'FAILED'
  );

revoke all on function public.expire_pending_orders()
  from public, anon, authenticated;
revoke all on function public.expire_paymongo_order(uuid, text)
  from public, anon, authenticated;

grant execute on function public.expire_pending_orders()
  to service_role;
grant execute on function public.expire_paymongo_order(uuid, text)
  to service_role;
