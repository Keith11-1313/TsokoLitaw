create table if not exists public.daily_order_counters (
  order_date date primary key,
  last_value integer not null check (last_value > 0)
);

alter table public.daily_order_counters enable row level security;
revoke all on table public.daily_order_counters from public, anon, authenticated;
grant all on table public.daily_order_counters to service_role;

create or replace function public.assign_daily_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_order_date date;
  daily_value integer;
begin
  if new.checkout_idempotency_key is null or new.order_number !~ '^TL-[0-9]{4}$' then
    return new;
  end if;

  local_order_date := (coalesce(new.created_at, now()) at time zone 'Asia/Manila')::date;
  insert into public.daily_order_counters (order_date, last_value)
  values (local_order_date, 1)
  on conflict (order_date) do update
    set last_value = public.daily_order_counters.last_value + 1
  returning last_value into daily_value;

  if daily_value > 999 then
    raise exception 'The daily order-number limit has been reached';
  end if;

  new.order_number := 'TL' || to_char(local_order_date, 'DDMMYY') || lpad(daily_value::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists assign_daily_order_number_before_insert on public.orders;
create trigger assign_daily_order_number_before_insert
before insert on public.orders
for each row execute function public.assign_daily_order_number();

revoke all on function public.assign_daily_order_number() from public;

create or replace function public.get_admin_dashboard_decisions(
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
  base_summary jsonb;
  decision_summary jsonb;
begin
  base_summary := public.get_admin_dashboard_summary(
    target_admin_id, period_start, period_end, previous_start, previous_end
  );

  with
  current_paid as (
    select o.id, o.status, o.completed_at, p.paid_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where p.status = 'PAID' and p.paid_at >= period_start and p.paid_at < period_end
  ),
  previous_paid as (
    select o.id, o.status, o.completed_at, p.paid_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where p.status = 'PAID' and p.paid_at >= previous_start and p.paid_at < previous_end
  ),
  current_cohort as (
    select status from public.orders where created_at >= period_start and created_at < period_end
  ),
  previous_cohort as (
    select status from public.orders where created_at >= previous_start and created_at < previous_end
  ),
  current_decisions as (
    select
      (select count(*) from current_paid)::bigint as eligible_orders,
      (select count(*) from current_paid where status = 'COMPLETED')::bigint as completed_orders,
      (select count(*) from current_cohort)::bigint as created_orders,
      (select count(*) from current_cohort where status in ('CANCELLED', 'EXPIRED'))::bigint as lost_orders,
      (select coalesce(avg(extract(epoch from (completed_at - paid_at)) / 3600), 0)
       from current_paid where completed_at is not null and completed_at >= paid_at)::numeric as average_fulfillment_hours
  ),
  previous_decisions as (
    select
      (select count(*) from previous_paid)::bigint as eligible_orders,
      (select count(*) from previous_paid where status = 'COMPLETED')::bigint as completed_orders,
      (select count(*) from previous_cohort)::bigint as created_orders,
      (select count(*) from previous_cohort where status in ('CANCELLED', 'EXPIRED'))::bigint as lost_orders,
      (select coalesce(avg(extract(epoch from (completed_at - paid_at)) / 3600), 0)
       from previous_paid where completed_at is not null and completed_at >= paid_at)::numeric as average_fulfillment_hours
  ),
  coating_mix as (
    select oic.coating_name_snapshot as label,
      sum(oic.piece_count * oi.quantity)::bigint as pieces
    from current_paid cp
    join public.order_items oi on oi.order_id = cp.id
    join public.order_item_coatings oic on oic.order_item_id = oi.id
    group by oic.coating_name_snapshot
    order by pieces desc, label
  ),
  extra_mix as (
    select oia.addon_name_snapshot as label,
      sum(oia.quantity * oi.quantity)::bigint as quantity,
      sum(oia.line_total * oi.quantity)::numeric as sales
    from current_paid cp
    join public.order_items oi on oi.order_id = cp.id
    join public.order_item_addons oia on oia.order_item_id = oi.id
    where not oia.is_complimentary
    group by oia.addon_name_snapshot
    order by quantity desc, label
  ),
  review_metrics as (
    select count(*)::bigint as review_count,
      coalesce(round(avg(rating)::numeric, 1), 0) as average_rating,
      count(*) filter (where is_visible)::bigint as visible_count,
      count(*) filter (where is_featured)::bigint as featured_count
    from public.reviews where created_at >= period_start and created_at < period_end
  ),
  review_operations as (
    select count(*) filter (where is_visible)::bigint as visible_count,
      count(*) filter (where is_featured)::bigint as featured_count
    from public.reviews
  ),
  inventory_metrics as (
    select coalesce(sum(di.stock_reserved + di.stock_sold), 0)::bigint as committed_pieces
    from public.daily_inventory di
    join public.pickup_dates pd on pd.pickup_date = di.pickup_date
    where di.pickup_date >= (now() at time zone 'Asia/Manila')::date and pd.is_open
  )
  select jsonb_build_object(
    'currentDecisionMetrics', jsonb_build_object(
      'completionRate', case when current_decisions.eligible_orders > 0 then round(current_decisions.completed_orders::numeric * 100 / current_decisions.eligible_orders, 1) else 0 end,
      'completedOrders', current_decisions.completed_orders,
      'eligibleOrders', current_decisions.eligible_orders,
      'lostOrderRate', case when current_decisions.created_orders > 0 then round(current_decisions.lost_orders::numeric * 100 / current_decisions.created_orders, 1) else 0 end,
      'lostOrders', current_decisions.lost_orders,
      'createdOrders', current_decisions.created_orders,
      'averageFulfillmentHours', round(current_decisions.average_fulfillment_hours, 1)
    ),
    'previousDecisionMetrics', jsonb_build_object(
      'completionRate', case when previous_decisions.eligible_orders > 0 then round(previous_decisions.completed_orders::numeric * 100 / previous_decisions.eligible_orders, 1) else 0 end,
      'completedOrders', previous_decisions.completed_orders,
      'eligibleOrders', previous_decisions.eligible_orders,
      'lostOrderRate', case when previous_decisions.created_orders > 0 then round(previous_decisions.lost_orders::numeric * 100 / previous_decisions.created_orders, 1) else 0 end,
      'lostOrders', previous_decisions.lost_orders,
      'createdOrders', previous_decisions.created_orders,
      'averageFulfillmentHours', round(previous_decisions.average_fulfillment_hours, 1)
    ),
    'coatingMix', (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'pieces', pieces) order by pieces desc, label), '[]'::jsonb) from coating_mix),
    'extraMix', (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'quantity', quantity, 'sales', sales) order by quantity desc, label), '[]'::jsonb) from extra_mix),
    'reviews', jsonb_build_object(
      'count', review_metrics.review_count,
      'averageRating', review_metrics.average_rating,
      'visible', review_metrics.visible_count,
      'featured', review_metrics.featured_count
    ),
    'reviewOperations', jsonb_build_object(
      'visible', review_operations.visible_count,
      'featured', review_operations.featured_count
    ),
    'committedPieces', inventory_metrics.committed_pieces
  ) into decision_summary
  from current_decisions, previous_decisions, review_metrics, review_operations, inventory_metrics;

  return base_summary || decision_summary;
end;
$$;

comment on function public.get_admin_dashboard_decisions(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
is 'Service-role-only Admin dashboard report with business KPIs, mix breakdowns, reviews, and operational decision metrics.';

revoke all on function public.get_admin_dashboard_decisions(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.get_admin_dashboard_decisions(uuid, timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
