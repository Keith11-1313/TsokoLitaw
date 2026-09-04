-- Remove the temporary variant-inventory compatibility layer that existed only
-- on the original hosted Dev project. Current inventory is product-level and
-- measured in individual pieces across every box size.

drop trigger if exists bridge_variant_inventory_to_pieces
  on public.daily_inventory;
drop trigger if exists sync_inventory_variant_compatibility
  on public.daily_inventory;

-- Legacy rows were synthetic per-variant mirrors with a 100000-piece sentinel.
-- Operational inventory adjustments point to the product-level rows instead.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_inventory'
      and column_name = 'product_variant_id'
  ) then
    delete from public.daily_inventory
    where product_variant_id is not null;

    alter table public.daily_inventory
      drop column product_variant_id;
  end if;
end;
$$;

drop function if exists public.bridge_variant_inventory_to_pieces();
drop function if exists public.sync_inventory_variant_compatibility();

drop function if exists public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb,
  numeric, numeric, numeric, text
);

drop index if exists public.daily_inventory_pickup_product_unique;

alter table public.daily_inventory
  alter column product_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.daily_inventory'::regclass
      and conname = 'daily_inventory_pickup_date_product_id_key'
  ) then
    alter table public.daily_inventory
      add constraint daily_inventory_pickup_date_product_id_key
      unique (pickup_date, product_id);
  end if;
end;
$$;

alter table public.reviews
  alter column is_visible set default false;

create index if not exists refunds_order_created_idx
  on public.refunds (order_id, created_at desc);

create or replace function public.cancel_unpaid_order(
  target_order_id uuid,
  target_user_id uuid,
  expired_checkout_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
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

create or replace function public.upsert_daily_inventory(
  target_admin_id uuid,
  target_pickup_date date,
  target_product_id uuid,
  stock_total_value integer,
  available_value boolean,
  notes_value text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
      id, pickup_date, product_id, stock_total, is_available
    ) values (
      saved_id, target_pickup_date, target_product_id, stock_total_value, available_value
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
        is_available = available_value,
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
      'stock_total', stock_total_value,
      'is_available', available_value
    )
  );

  return saved_id;
end;
$$;

create or replace function public.record_inventory_consumption(
  target_admin_id uuid,
  target_inventory_id uuid,
  quantity_value integer,
  reason_value text,
  notes_value text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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

comment on function public.cancel_unpaid_order(uuid, uuid, text) is
  'Service-role-only unpaid cancellation. An attached checkout must be expired through PayMongo first.';
comment on function public.upsert_daily_inventory(uuid, date, uuid, integer, boolean, text) is
  'Service-role-only audited ready-stock writer. Stock is counted in individual product pieces shared by every box size.';
comment on function public.record_inventory_consumption(uuid, uuid, integer, text, text) is
  'Service-role-only audited waste writer that removes unusable uncommitted pieces.';

revoke all on function public.cancel_unpaid_order(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.upsert_daily_inventory(uuid, date, uuid, integer, boolean, text)
  from public, anon, authenticated;
revoke all on function public.record_inventory_consumption(uuid, uuid, integer, text, text)
  from public, anon, authenticated;

grant execute on function public.cancel_unpaid_order(uuid, uuid, text)
  to service_role;
grant execute on function public.upsert_daily_inventory(uuid, date, uuid, integer, boolean, text)
  to service_role;
grant execute on function public.record_inventory_consumption(uuid, uuid, integer, text, text)
  to service_role;
