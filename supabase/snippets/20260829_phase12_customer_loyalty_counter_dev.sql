-- Phase 12 follow-up: expose loyalty threshold and redeemed-reward counts to
-- the connected Admin Customers page. Run in the hosted Supabase Dev SQL Editor.

begin;

drop function if exists public.get_admin_customer_summaries(uuid, text, integer);

create function public.get_admin_customer_summaries(
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
  last_order_at timestamptz,
  loyalty_completed_orders integer,
  loyalty_threshold integer,
  available_rewards bigint,
  redeemed_rewards bigint
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
  where profiles.role = 'customer'
    and (
      nullif(btrim(search_value), '') is null
      or profiles.full_name ilike '%' || btrim(search_value) || '%'
      or profiles.email ilike '%' || btrim(search_value) || '%'
    )
  order by order_summary.last_order_at desc nulls last, profiles.created_at desc
  limit greatest(1, least(coalesce(result_limit, 100), 500));
end;
$$;

revoke all on function public.get_admin_customer_summaries(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_customer_summaries(uuid, text, integer)
  to service_role;

comment on function public.get_admin_customer_summaries(uuid, text, integer) is
  'Service-role-only bounded customer, completed-order, and loyalty aggregate with active-Admin validation.';

commit;

select
  to_regprocedure('public.get_admin_customer_summaries(uuid,text,integer)') is not null
    as customer_summary_function,
  count(*) filter (where status = 'earned') as available_rewards,
  count(*) filter (where status = 'redeemed') as redeemed_rewards
from public.loyalty_rewards;
