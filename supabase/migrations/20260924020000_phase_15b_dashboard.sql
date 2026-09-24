-- Phase 15B: decision-grade Admin dashboard projections.
-- This remains service-role-only and delegates the active-Admin check to the
-- existing get_admin_dashboard_summary function before adding new projections.

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
  today_manila date := (now() at time zone 'Asia/Manila')::date;
begin
  base_summary := public.get_admin_dashboard_summary(
    target_admin_id, period_start, period_end, previous_start, previous_end
  );

  with
  current_paid as (
    select o.id, o.status, o.completed_at, o.pickup_date, p.paid_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where p.status = 'PAID' and p.paid_at >= period_start and p.paid_at < period_end
  ),
  previous_paid as (
    select o.id, o.status, o.completed_at, o.pickup_date, p.paid_at
    from public.orders o
    join public.payments p on p.order_id = o.id
    where p.status = 'PAID' and p.paid_at >= previous_start and p.paid_at < previous_end
  ),
  current_created as (
    select o.id, o.status
    from public.orders o
    where o.created_at >= period_start and o.created_at < period_end
  ),
  previous_created as (
    select o.id, o.status
    from public.orders o
    where o.created_at >= previous_start and o.created_at < previous_end
  ),
  current_decisions as (
    select
      (select count(*) from current_paid where pickup_date < today_manila)::bigint as eligible_orders,
      (select count(*) from current_paid where pickup_date < today_manila and status = 'COMPLETED')::bigint as completed_orders,
      (select count(*) from current_created)::bigint as created_orders,
      (select count(*) from current_created where status in ('CANCELLED', 'EXPIRED'))::bigint as lost_orders,
      (select count(*) from current_paid where completed_at is not null and completed_at >= paid_at)::bigint as duration_sample_size,
      (select coalesce(avg(extract(epoch from (completed_at - paid_at)) / 3600), 0)
       from current_paid where completed_at is not null and completed_at >= paid_at)::numeric as payment_to_completion_hours
  ),
  previous_decisions as (
    select
      (select count(*) from previous_paid where pickup_date < today_manila)::bigint as eligible_orders,
      (select count(*) from previous_paid where pickup_date < today_manila and status = 'COMPLETED')::bigint as completed_orders,
      (select count(*) from previous_created)::bigint as created_orders,
      (select count(*) from previous_created where status in ('CANCELLED', 'EXPIRED'))::bigint as lost_orders,
      (select count(*) from previous_paid where completed_at is not null and completed_at >= paid_at)::bigint as duration_sample_size,
      (select coalesce(avg(extract(epoch from (completed_at - paid_at)) / 3600), 0)
       from previous_paid where completed_at is not null and completed_at >= paid_at)::numeric as payment_to_completion_hours
  ),
  funnel as (
    select
      count(*)::bigint as created,
      count(*) filter (where exists (
        select 1 from public.payments p where p.order_id = cc.id and p.status = 'PAID'
      ))::bigint as paid,
      count(*) filter (where cc.status = 'COMPLETED')::bigint as completed,
      count(*) filter (where cc.status in ('CANCELLED', 'EXPIRED'))::bigint as lost
    from current_created cc
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
      count(*) filter (where is_featured)::bigint as featured_count,
      count(*) filter (where not is_visible)::bigint as unpublished_count
    from public.reviews
  ),
  active_orders as (
    select o.id, o.order_number, o.customer_name, o.total, o.status, o.payment_status,
      o.payment_method, o.created_at, o.updated_at, o.pickup_date
    from public.orders o
    where o.status in ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP')
  ),
  operation_metrics as (
    select
      (select count(*) from active_orders)::bigint as active_fulfillment,
      (select count(*) from active_orders where pickup_date = today_manila)::bigint as due_today,
      (select count(*) from active_orders where pickup_date = today_manila + 1)::bigint as due_tomorrow,
      (select count(*) from active_orders where pickup_date < today_manila)::bigint as overdue,
      (select count(*) from active_orders where status = 'READY_FOR_PICKUP')::bigint as ready_for_pickup,
      (select count(*) from public.orders
       where payment_method = 'pay_at_counter' and payment_status = 'PENDING'
         and status not in ('CANCELLED', 'EXPIRED', 'COMPLETED'))::bigint as counter_awaiting_payment,
      (select count(*) from public.manual_payment_submissions where status = 'UNDER_REVIEW')::bigint as receipts_awaiting_review,
      (select min(submitted_at) from public.manual_payment_submissions where status = 'UNDER_REVIEW') as oldest_receipt_submitted_at
  ),
  inventory_by_date as (
    select pd.pickup_date, pd.availability_mode::text as mode,
      coalesce(sum(di.stock_total), 0)::bigint as prepared,
      coalesce(sum(di.stock_reserved + di.stock_sold), 0)::bigint as committed,
      coalesce(sum(greatest(di.stock_total - di.stock_reserved - di.stock_sold, 0)), 0)::bigint as available
    from public.pickup_dates pd
    left join public.daily_inventory di on di.pickup_date = pd.pickup_date
    where pd.is_open and pd.pickup_date >= today_manila
    group by pd.pickup_date, pd.availability_mode
    order by pd.pickup_date
    limit 14
  ),
  inventory_totals as (
    select coalesce(sum(committed), 0)::bigint as committed_pieces from inventory_by_date
  ),
  catalog_counts as (
    select
      (select count(*) from public.coatings where is_active)::bigint as coatings,
      (select count(*) from public.product_variants where is_active)::bigint as variants,
      (select count(*) from public.addons where is_active)::bigint as addons
  ),
  pickup_counts as (
    select count(distinct pd.id)::bigint as dates, count(pw.id)::bigint as windows
    from public.pickup_dates pd
    left join public.pickup_windows pw on pw.pickup_date_id = pd.id and pw.is_open
    where pd.is_open and pd.pickup_date >= today_manila
  ),
  journal_counts as (
    select count(*) filter (where status = 'published')::bigint as published,
      count(*) filter (where status = 'draft')::bigint as drafts
    from public.journal_posts
  ),
  recent_orders as (
    select o.id, o.order_number, o.customer_name, o.total, o.status::text as status,
      o.payment_status::text as payment_status, o.payment_method::text as payment_method,
      o.created_at, o.pickup_date,
      coalesce(string_agg(oi.variant_name_snapshot || ' × ' || oi.quantity, ' · ' order by oi.created_at, oi.id), '') as item_summary
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    group by o.id
    order by o.created_at desc, o.id desc
    limit 5
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'currentDecisionMetrics', jsonb_build_object(
      'completionRate', case when cd.eligible_orders > 0 then round(cd.completed_orders::numeric * 100 / cd.eligible_orders, 1) else 0 end,
      'completedOrders', cd.completed_orders,
      'eligibleOrders', cd.eligible_orders,
      'lostOrderRate', case when cd.created_orders > 0 then round(cd.lost_orders::numeric * 100 / cd.created_orders, 1) else 0 end,
      'lostOrders', cd.lost_orders,
      'createdOrders', cd.created_orders,
      'averageFulfillmentHours', round(cd.payment_to_completion_hours, 1),
      'durationSampleSize', cd.duration_sample_size
    ),
    'previousDecisionMetrics', jsonb_build_object(
      'completionRate', case when pd.eligible_orders > 0 then round(pd.completed_orders::numeric * 100 / pd.eligible_orders, 1) else 0 end,
      'completedOrders', pd.completed_orders,
      'eligibleOrders', pd.eligible_orders,
      'lostOrderRate', case when pd.created_orders > 0 then round(pd.lost_orders::numeric * 100 / pd.created_orders, 1) else 0 end,
      'lostOrders', pd.lost_orders,
      'createdOrders', pd.created_orders,
      'averageFulfillmentHours', round(pd.payment_to_completion_hours, 1),
      'durationSampleSize', pd.duration_sample_size
    ),
    'funnel', jsonb_build_object('created', f.created, 'paid', f.paid, 'completed', f.completed, 'lost', f.lost),
    'coatingMix', (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'pieces', pieces) order by pieces desc, label), '[]'::jsonb) from coating_mix),
    'extraMix', (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'quantity', quantity, 'sales', sales) order by quantity desc, label), '[]'::jsonb) from extra_mix),
    'reviews', jsonb_build_object('count', rm.review_count, 'averageRating', rm.average_rating, 'visible', rm.visible_count, 'featured', rm.featured_count),
    'reviewOperations', jsonb_build_object('visible', ro.visible_count, 'featured', ro.featured_count, 'unpublished', ro.unpublished_count),
    'operations', jsonb_build_object(
      'activeFulfillment', om.active_fulfillment,
      'dueToday', om.due_today,
      'dueTomorrow', om.due_tomorrow,
      'overdue', om.overdue,
      'readyForPickup', om.ready_for_pickup,
      'counterAwaitingPayment', om.counter_awaiting_payment,
      'receiptsAwaitingReview', om.receipts_awaiting_review,
      'oldestReceiptSubmittedAt', om.oldest_receipt_submitted_at,
      'committedPieces', it.committed_pieces
    ),
    'inventoryByDate', (select coalesce(jsonb_agg(jsonb_build_object(
      'date', pickup_date, 'mode', mode, 'prepared', prepared, 'committed', committed, 'available', available
    ) order by pickup_date), '[]'::jsonb) from inventory_by_date),
    'catalogCounts', jsonb_build_object('coatings', cc.coatings, 'variants', cc.variants, 'addons', cc.addons),
    'pickupCounts', jsonb_build_object('dates', pc.dates, 'windows', pc.windows),
    'journalCounts', jsonb_build_object('published', jc.published, 'drafts', jc.drafts),
    'recentOrders', (select coalesce(jsonb_agg(to_jsonb(recent_orders) order by created_at desc, id desc), '[]'::jsonb) from recent_orders)
  ) into decision_summary
  from current_decisions cd, previous_decisions pd, funnel f, review_metrics rm,
    review_operations ro, operation_metrics om, inventory_totals it, catalog_counts cc,
    pickup_counts pc, journal_counts jc;

  return base_summary || decision_summary;
end;
$$;

comment on function public.get_admin_dashboard_decisions(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
is 'Service-role-only Admin decision dashboard with cohort, aging, inventory-date, lightweight recent-order, and business KPI projections.';

revoke all on function public.get_admin_dashboard_decisions(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.get_admin_dashboard_decisions(uuid, timestamptz, timestamptz, timestamptz, timestamptz) to service_role;

-- The dashboard filters paid rows by status and paid timestamp. Confirm with
-- EXPLAIN on representative data before retaining this index in the final rebaseline.
create index if not exists payments_paid_reporting_idx
  on public.payments (paid_at desc, order_id)
  where status = 'PAID';

create index if not exists manual_review_queue_idx
  on public.manual_payment_submissions (submitted_at)
  where status = 'UNDER_REVIEW';

