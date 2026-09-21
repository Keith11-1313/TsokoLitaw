create or replace function public.get_admin_dashboard_summary(
  target_admin_id uuid,
  period_start timestamptz,
  period_end timestamptz,
  previous_start timestamptz,
  previous_end timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active Admin access is required';
  end if;

  if period_start is null or period_end is null
    or previous_start is null or previous_end is null
    or period_start >= period_end or previous_start >= previous_end
    or period_end - period_start > interval '366 days'
    or previous_end - previous_start > interval '366 days'
  then
    raise exception 'Dashboard reporting range is invalid';
  end if;

  with
  current_paid as (
    select o.id, o.user_id, o.total, p.paid_at, p.provider
    from public.payments p
    join public.orders o on o.id = p.order_id
    where p.status = 'PAID' and p.paid_at >= period_start and p.paid_at < period_end
  ),
  previous_paid as (
    select o.id, o.user_id, o.total
    from public.payments p
    join public.orders o on o.id = p.order_id
    where p.status = 'PAID' and p.paid_at >= previous_start and p.paid_at < previous_end
  ),
  current_items as (
    select oi.*, cp.provider
    from current_paid cp join public.order_items oi on oi.order_id = cp.id
  ),
  previous_items as (
    select oi.*
    from previous_paid pp join public.order_items oi on oi.order_id = pp.id
  ),
  current_extras as (
    select coalesce(sum(oia.line_total * ci.quantity), 0)::numeric as extra_sales
    from current_items ci
    join public.order_item_addons oia on oia.order_item_id = ci.id
    where not oia.is_complimentary
  ),
  previous_extras as (
    select coalesce(sum(oia.line_total * pi.quantity), 0)::numeric as extra_sales
    from previous_items pi
    join public.order_item_addons oia on oia.order_item_id = pi.id
    where not oia.is_complimentary
  ),
  current_metrics as (
    select coalesce(sum(total), 0)::numeric as paid_sales, count(*)::bigint as paid_orders,
      count(distinct user_id) filter (where user_id is not null)::bigint as purchasing_customers,
      coalesce(sum(total) filter (where total > 0), 0)::numeric as revenue_order_sales,
      count(*) filter (where total > 0)::bigint as revenue_orders
    from current_paid
  ),
  previous_metrics as (
    select coalesce(sum(total), 0)::numeric as paid_sales, count(*)::bigint as paid_orders,
      count(distinct user_id) filter (where user_id is not null)::bigint as purchasing_customers,
      coalesce(sum(total) filter (where total > 0), 0)::numeric as revenue_order_sales,
      count(*) filter (where total > 0)::bigint as revenue_orders
    from previous_paid
  ),
  current_item_metrics as (
    select coalesce(sum(quantity), 0)::bigint as boxes_sold,
      coalesce(sum(piece_count_snapshot * quantity), 0)::bigint as pieces_sold
    from current_items
  ),
  previous_item_metrics as (
    select coalesce(sum(quantity), 0)::bigint as boxes_sold,
      coalesce(sum(piece_count_snapshot * quantity), 0)::bigint as pieces_sold
    from previous_items
  ),
  repeat_customers as (
    select count(distinct current_order.user_id)::bigint as customer_count
    from current_paid current_order
    where current_order.user_id is not null and exists (
      select 1 from public.orders earlier_order
      join public.payments earlier_payment on earlier_payment.order_id = earlier_order.id
      where earlier_order.user_id = current_order.user_id
        and earlier_payment.status = 'PAID' and earlier_payment.paid_at < period_start
    )
  ),
  previous_repeat_customers as (
    select count(distinct current_order.user_id)::bigint as customer_count
    from previous_paid current_order
    where current_order.user_id is not null and exists (
      select 1 from public.orders earlier_order
      join public.payments earlier_payment on earlier_payment.order_id = earlier_order.id
      where earlier_order.user_id = current_order.user_id
        and earlier_payment.status = 'PAID' and earlier_payment.paid_at < previous_start
    )
  ),
  date_series as (
    select generated_date::date as report_date
    from generate_series(
      (period_start at time zone 'Asia/Manila')::date,
      ((period_end - interval '1 microsecond') at time zone 'Asia/Manila')::date,
      interval '1 day'
    ) generated_date
  ),
  daily_sales as (
    select dates.report_date, coalesce(sum(paid.total), 0)::numeric as paid_sales,
      count(paid.id)::bigint as paid_orders
    from date_series dates
    left join current_paid paid on (paid.paid_at at time zone 'Asia/Manila')::date = dates.report_date
    group by dates.report_date order by dates.report_date
  ),
  order_outcomes as (
    select status::text as status, count(*)::bigint as order_count
    from public.orders where created_at >= period_start and created_at < period_end group by status
  ),
  box_mix as (
    select variant_name_snapshot as label, sum(quantity)::bigint as boxes,
      sum(piece_count_snapshot * quantity)::bigint as pieces
    from current_items group by variant_name_snapshot order by boxes desc, label
  ),
  payment_mix as (
    select provider, count(*)::bigint as paid_orders, coalesce(sum(total), 0)::numeric as paid_sales
    from current_paid group by provider order by paid_sales desc, provider
  ),
  operational as (
    select
      (select count(*) from public.orders where status in ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'))::bigint as active_fulfillment,
      (select count(*) from public.manual_payment_submissions where status = 'UNDER_REVIEW')::bigint as receipts_awaiting_review,
      (select min(submitted_at) from public.manual_payment_submissions where status = 'UNDER_REVIEW') as oldest_receipt_submitted_at,
      (select coalesce(sum(greatest(di.stock_total - di.stock_reserved - di.stock_sold, 0)), 0)::bigint
       from public.daily_inventory di join public.pickup_dates pd on pd.pickup_date = di.pickup_date
       where di.pickup_date >= (now() at time zone 'Asia/Manila')::date and pd.is_open) as available_pieces
  )
  select jsonb_build_object(
    'current', jsonb_build_object(
      'paidSales', current_metrics.paid_sales, 'paidOrders', current_metrics.paid_orders,
      'averageOrderValue', case when current_metrics.revenue_orders > 0 then round(current_metrics.revenue_order_sales / current_metrics.revenue_orders, 2) else 0 end,
      'purchasingCustomers', current_metrics.purchasing_customers,
      'repeatCustomers', repeat_customers.customer_count,
      'repeatCustomerRate', case when current_metrics.purchasing_customers > 0 then round(repeat_customers.customer_count::numeric * 100 / current_metrics.purchasing_customers, 1) else 0 end,
      'boxesSold', current_item_metrics.boxes_sold, 'piecesSold', current_item_metrics.pieces_sold,
      'extraSales', current_extras.extra_sales
    ),
    'previous', jsonb_build_object(
      'paidSales', previous_metrics.paid_sales, 'paidOrders', previous_metrics.paid_orders,
      'averageOrderValue', case when previous_metrics.revenue_orders > 0 then round(previous_metrics.revenue_order_sales / previous_metrics.revenue_orders, 2) else 0 end,
      'purchasingCustomers', previous_metrics.purchasing_customers,
      'repeatCustomers', previous_repeat_customers.customer_count,
      'repeatCustomerRate', case when previous_metrics.purchasing_customers > 0 then round(previous_repeat_customers.customer_count::numeric * 100 / previous_metrics.purchasing_customers, 1) else 0 end,
      'boxesSold', previous_item_metrics.boxes_sold, 'piecesSold', previous_item_metrics.pieces_sold,
      'extraSales', previous_extras.extra_sales
    ),
    'dailySales', (select coalesce(jsonb_agg(jsonb_build_object('date', report_date, 'paidSales', paid_sales, 'paidOrders', paid_orders) order by report_date), '[]'::jsonb) from daily_sales),
    'orderOutcomes', (select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', order_count) order by status), '[]'::jsonb) from order_outcomes),
    'boxMix', (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'boxes', boxes, 'pieces', pieces) order by boxes desc, label), '[]'::jsonb) from box_mix),
    'paymentMix', (select coalesce(jsonb_agg(jsonb_build_object('provider', provider, 'paidOrders', paid_orders, 'paidSales', paid_sales) order by paid_sales desc, provider), '[]'::jsonb) from payment_mix),
    'operations', jsonb_build_object(
      'activeFulfillment', operational.active_fulfillment,
      'receiptsAwaitingReview', operational.receipts_awaiting_review,
      'oldestReceiptSubmittedAt', operational.oldest_receipt_submitted_at,
      'availablePieces', operational.available_pieces
    )
  ) into result
  from current_metrics, previous_metrics, current_item_metrics, previous_item_metrics,
    current_extras, previous_extras, repeat_customers, previous_repeat_customers, operational;

  return result;
end;
$$;

comment on function public.get_admin_dashboard_summary(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
is 'Service-role-only full-period Admin KPI, product mix, payment mix, and operational summary.';

revoke all on function public.get_admin_dashboard_summary(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.get_admin_dashboard_summary(uuid, timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
