-- Paste this entire file into hosted Supabase Dev SQL Editor and run once.
-- Phase 11 final sync: customer aggregates and date-specific stock guidance.

begin;

drop function if exists public.get_public_stocked_pickup_dates();

delete from public.business_settings where key = 'support_email';

create or replace function public.get_public_pickup_inventory()
returns table (
  pickup_date date,
  available_pieces integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    daily_inventory.pickup_date,
    daily_inventory.stock_total - daily_inventory.stock_reserved - daily_inventory.stock_sold
  from public.daily_inventory
  join public.pickup_dates on pickup_dates.pickup_date = daily_inventory.pickup_date
  where pickup_dates.is_open
    and pickup_dates.availability_mode in ('READY_STOCK', 'HYBRID')
    and daily_inventory.is_available
    and daily_inventory.product_id = (
      select products.id from public.products
      where products.is_active
      order by products.created_at
      limit 1
    )
    and daily_inventory.stock_total - daily_inventory.stock_reserved - daily_inventory.stock_sold > 0;
$$;

create or replace function public.get_admin_customer_summaries(
  target_admin_id uuid,
  search_value text default null,
  result_limit integer default 100
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  mobile_number text,
  is_active boolean,
  joined_at timestamptz,
  completed_orders bigint,
  completed_spend numeric,
  last_order_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    profiles.mobile_number,
    profiles.is_active,
    profiles.created_at,
    count(orders.id) filter (where orders.status = 'COMPLETED'),
    coalesce(sum(orders.total) filter (
      where orders.status = 'COMPLETED' and orders.payment_status = 'PAID'
    ), 0::numeric),
    max(orders.created_at)
  from public.profiles
  left join public.orders on orders.user_id = profiles.id
  where profiles.role = 'customer'
    and (
      nullif(btrim(search_value), '') is null
      or profiles.full_name ilike '%' || btrim(search_value) || '%'
      or profiles.email ilike '%' || btrim(search_value) || '%'
    )
  group by profiles.id
  order by max(orders.created_at) desc nulls last, profiles.created_at desc
  limit greatest(1, least(coalesce(result_limit, 100), 500));
end;
$$;

revoke all on function public.get_public_pickup_inventory()
  from public, anon, authenticated;
grant execute on function public.get_public_pickup_inventory()
  to anon, authenticated;

revoke all on function public.get_admin_customer_summaries(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_customer_summaries(uuid, text, integer)
  to service_role;

comment on function public.get_public_pickup_inventory() is
  'Returns remaining prepared pieces by published pickup date for customer checkout guidance; transactional reservation remains authoritative.';
comment on function public.get_admin_customer_summaries(uuid, text, integer) is
  'Service-role-only bounded customer and completed-order aggregate with active-Admin validation.';

notify pgrst, 'reload schema';

commit;

