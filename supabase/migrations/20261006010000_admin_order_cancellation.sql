-- Additive, service-role-only Admin cancellation. Customer cancellation is unchanged.
create function public.prepare_admin_order_cancellation(
  target_admin_id uuid, target_order_id uuid, expected_status public.order_status
) returns table (checkout_id text, already_cancelled boolean)
language plpgsql security definer set search_path = '' as $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  select * into target_order from public.orders where id = target_order_id for update;
  if target_order.id is null then raise exception 'Order is unavailable'; end if;
  if target_order.status = 'CANCELLED' and target_order.payment_status = 'FAILED'
     and exists (select 1 from public.admin_audit_logs where entity_id = target_order_id::text and action = 'order.admin_cancelled') then
    return query select null::text, true;
    return;
  end if;
  if target_order.status is distinct from expected_status then raise exception 'Order status changed'; end if;
  if target_order.payment_status <> 'PENDING' or not (
    target_order.status = 'PENDING_PAYMENT' or
    (target_order.payment_method = 'pay_at_counter' and target_order.status in ('CONFIRMED','PREPARING','READY_FOR_PICKUP'))
  ) then raise exception 'Order is no longer eligible for unpaid cancellation'; end if;
  select * into target_payment from public.payments where order_id = target_order.id for update;
  if target_payment.id is null or target_payment.status <> 'PENDING' then
    raise exception 'Payment is no longer pending';
  end if;
  return query select target_payment.provider_checkout_id, false;
end;
$$;

create function public.cancel_admin_unpaid_order(
  target_admin_id uuid, target_order_id uuid, expected_status public.order_status,
  reason_value text, expired_checkout_id text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  preparation record;
  target_order public.orders%rowtype;
  pickup_mode public.pickup_availability_mode;
  reserved_items record;
begin
  if reason_value is null or length(btrim(reason_value)) < 3 or length(reason_value) > 500 then
    raise exception 'Cancellation requires a reason between 3 and 500 characters';
  end if;
  -- Preparation locks order first, then payment. Recheck after provider expiry,
  -- so concurrent payment/fulfillment/provider replacement wins safely.
  select * into preparation from public.prepare_admin_order_cancellation(target_admin_id, target_order_id, expected_status);
  if preparation.already_cancelled then return false; end if;
  if preparation.checkout_id is distinct from expired_checkout_id then
    raise exception 'Attached PayMongo checkout must be expired first';
  end if;
  select * into target_order from public.orders where id = target_order_id;
  select pd.availability_mode into pickup_mode from public.pickup_windows pw
    join public.pickup_dates pd on pd.id = pw.pickup_date_id where pw.id = target_order.pickup_window_id;
  -- Hybrid reserves prepared pieces only for same-day placement, not future orders.
  -- Use immutable item snapshots and placement date, including next-day no-shows.
  if pickup_mode = 'READY_STOCK' or (pickup_mode = 'HYBRID' and
    target_order.pickup_date = (target_order.created_at at time zone 'Asia/Manila')::date) then
    for reserved_items in select product_id, sum(quantity * piece_count_snapshot)::integer as pieces
      from public.order_items where order_id = target_order_id group by product_id order by product_id
    loop
      update public.daily_inventory set stock_reserved = stock_reserved - reserved_items.pieces, updated_at = now()
        where product_id = reserved_items.product_id and pickup_date = target_order.pickup_date
        and stock_reserved >= reserved_items.pieces;
      if not found then raise exception 'Reserved inventory is inconsistent'; end if;
    end loop;
  end if;
  update public.payments set status = 'FAILED', updated_at = now() where order_id = target_order_id;
  -- Existing triggers return a bound loyalty reward and queue the existing cancellation event atomically.
  update public.orders set status = 'CANCELLED', payment_status = 'FAILED', cancelled_at = now(), updated_at = now()
    where id = target_order_id;
  insert into public.admin_audit_logs(admin_id, action, entity_type, entity_id, metadata)
    values (target_admin_id, 'order.admin_cancelled', 'order', target_order_id::text,
      jsonb_build_object('order_number', target_order.order_number, 'reason', btrim(reason_value),
        'previous_status', target_order.status, 'payment_method', target_order.payment_method));
  return true;
end;
$$;

revoke all on function public.prepare_admin_order_cancellation(uuid,uuid,public.order_status) from public, anon, authenticated;
revoke all on function public.cancel_admin_unpaid_order(uuid,uuid,public.order_status,text,text) from public, anon, authenticated;
grant execute on function public.prepare_admin_order_cancellation(uuid,uuid,public.order_status) to service_role;
grant execute on function public.cancel_admin_unpaid_order(uuid,uuid,public.order_status,text,text) to service_role;
