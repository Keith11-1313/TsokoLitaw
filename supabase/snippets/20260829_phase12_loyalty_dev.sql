-- Phase 12: Loyalty program delta for the hosted Supabase Dev project.
-- Run this entire file once in the Supabase SQL Editor before deploying the
-- Phase 12 application code. The statements are transaction-wrapped and the
-- backfill is idempotent.

begin;

insert into public.business_settings (key, value)
values ('loyalty_threshold', '7'::jsonb)
on conflict (key) do nothing;

alter table public.loyalty_rewards
  add column if not exists redeemed_order_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.loyalty_rewards'::regclass
      and conname = 'loyalty_rewards_redeemed_order_fkey'
  ) then
    alter table public.loyalty_rewards
      add constraint loyalty_rewards_redeemed_order_fkey
      foreign key (redeemed_order_id)
      references public.orders(id)
      on delete restrict
      not valid;
  end if;
end;
$$;

alter table public.loyalty_rewards
  validate constraint loyalty_rewards_redeemed_order_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.loyalty_rewards'::regclass
      and conname = 'loyalty_rewards_reward_type_check'
  ) then
    alter table public.loyalty_rewards
      add constraint loyalty_rewards_reward_type_check
      check (reward_type = 'FREE_4_PIECE')
      not valid;
  end if;
end;
$$;

alter table public.loyalty_rewards
  validate constraint loyalty_rewards_reward_type_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.loyalty_rewards'::regclass
      and conname = 'loyalty_rewards_redemption_state_check'
  ) then
    alter table public.loyalty_rewards
      add constraint loyalty_rewards_redemption_state_check
      check (
        (status = 'earned' and redeemed_at is null and redeemed_order_id is null)
        or (status = 'redeemed' and redeemed_at is not null and redeemed_order_id is not null)
        or status = 'expired'
      )
      not valid;
  end if;
end;
$$;

alter table public.loyalty_rewards
  validate constraint loyalty_rewards_redemption_state_check;

create unique index if not exists loyalty_rewards_redeemed_order_key
  on public.loyalty_rewards (redeemed_order_id)
  where redeemed_order_id is not null;

create or replace function public.sync_completed_order_loyalty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

drop trigger if exists orders_sync_completed_loyalty on public.orders;
create trigger orders_sync_completed_loyalty
  after update of status on public.orders
  for each row execute procedure public.sync_completed_order_loyalty();

-- Hosted Dev already has the Phase 11 12-argument atomic order writer. This
-- overload adds loyalty validation and redemption while reusing that writer.
create or replace function public.create_pending_order(
  target_user_id uuid,
  checkout_key uuid,
  selected_pickup_window_id uuid,
  selected_pickup_location_id uuid,
  customer_name_value text,
  customer_mobile_value text,
  customer_notes_value text,
  priced_lines jsonb,
  subtotal_value numeric,
  discount_value numeric,
  total_value numeric,
  terms_version_value text,
  loyalty_reward_id uuid
)
returns table (
  created_order_id uuid,
  created_order_number text,
  created_total numeric,
  was_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders%rowtype;
  selected_reward public.loyalty_rewards%rowtype;
  calculated_reward_discount numeric := 0;
  saved_order record;
begin
  select orders.* into existing_order
  from public.orders
  where orders.user_id = target_user_id
    and orders.checkout_idempotency_key = checkout_key;

  if existing_order.id is not null then
    return query select
      existing_order.id,
      existing_order.order_number,
      existing_order.total,
      false;
    return;
  end if;

  if loyalty_reward_id is not null then
    select loyalty_rewards.* into selected_reward
    from public.loyalty_rewards
    where loyalty_rewards.id = loyalty_reward_id
      and loyalty_rewards.user_id = target_user_id
      and loyalty_rewards.reward_type = 'FREE_4_PIECE'
      and loyalty_rewards.status = 'earned'
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

  if total_value <> subtotal_value - discount_value then
    raise exception 'Order totals are inconsistent';
  end if;

  select * into saved_order
  from public.create_pending_order(
    target_user_id,
    checkout_key,
    selected_pickup_window_id,
    selected_pickup_location_id,
    customer_name_value,
    customer_mobile_value,
    customer_notes_value,
    priced_lines,
    subtotal_value,
    discount_value,
    total_value,
    terms_version_value
  );

  if loyalty_reward_id is not null and saved_order.was_created then
    update public.loyalty_rewards
    set status = 'redeemed',
        redeemed_at = now(),
        redeemed_order_id = saved_order.created_order_id
    where id = selected_reward.id
      and status = 'earned';

    if not found then
      raise exception 'The selected loyalty reward was already used';
    end if;
  end if;

  if saved_order.was_created and saved_order.created_total = 0 then
    update public.orders
    set payment_status = 'PAID',
        status = 'CONFIRMED',
        updated_at = now()
    where id = saved_order.created_order_id;

    insert into public.payments (
      order_id, provider, amount, currency, status, paid_at
    ) values (
      saved_order.created_order_id, 'loyalty', 0, 'PHP', 'PAID', now()
    );
  end if;

  return query select
    saved_order.created_order_id::uuid,
    saved_order.created_order_number::text,
    saved_order.created_total::numeric,
    saved_order.was_created::boolean;
end;
$$;

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
  available_rewards bigint
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
    coalesce(reward_summary.available_rewards, 0)
  from public.profiles
  left join public.loyalty_accounts on loyalty_accounts.user_id = profiles.id
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
    select count(*) as available_rewards
    from public.loyalty_rewards
    where loyalty_rewards.user_id = profiles.id
      and loyalty_rewards.status = 'earned'
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

-- Bring existing completed paid orders into the loyalty program once.
insert into public.loyalty_accounts (user_id)
select distinct orders.user_id
from public.orders
where orders.user_id is not null
on conflict (user_id) do nothing;

update public.loyalty_accounts as account
set completed_order_count = (
      select count(*)::integer
      from public.orders
      where orders.user_id = account.user_id
        and orders.status = 'COMPLETED'
        and orders.payment_status = 'PAID'
    ),
    updated_at = now();

with loyalty_config as (
  select greatest(
    coalesce(
      (
        select (business_settings.value #>> '{}')::integer
        from public.business_settings
        where business_settings.key = 'loyalty_threshold'
      ),
      7
    ),
    1
  ) as threshold
), ranked_completed_orders as (
  select
    orders.id,
    orders.user_id,
    row_number() over (
      partition by orders.user_id
      order by coalesce(orders.completed_at, orders.updated_at, orders.created_at), orders.id
    ) as completion_number
  from public.orders
  where orders.status = 'COMPLETED'
    and orders.payment_status = 'PAID'
)
insert into public.loyalty_rewards (
  user_id, reward_type, threshold, source_order_id
)
select
  ranked_completed_orders.user_id,
  'FREE_4_PIECE',
  loyalty_config.threshold,
  ranked_completed_orders.id
from ranked_completed_orders
cross join loyalty_config
where ranked_completed_orders.completion_number % loyalty_config.threshold = 0
on conflict (user_id, reward_type, source_order_id) do nothing;

revoke all on function public.sync_completed_order_loyalty() from public, anon, authenticated;
revoke all on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, uuid
) from public, anon, authenticated;
revoke all on function public.get_admin_customer_summaries(uuid, text, integer)
  from public, anon, authenticated;

grant execute on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, uuid
) to service_role;
grant execute on function public.get_admin_customer_summaries(uuid, text, integer)
  to service_role;

comment on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text, uuid
) is
  'Service-role-only atomic loyalty wrapper around the hosted Phase 11 order writer.';
comment on function public.sync_completed_order_loyalty() is
  'Awards one free 4-piece reward per configured completed-order threshold and restores redeemed rewards when their order is cancelled or expires.';
comment on function public.get_admin_customer_summaries(uuid, text, integer) is
  'Service-role-only customer aggregate including loyalty progress and available rewards.';

commit;

-- Verification: expect redeemed_order_id = true, both functions = true,
-- trigger = true, threshold = 7, followed by the backfilled account/reward counts.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'loyalty_rewards'
      and column_name = 'redeemed_order_id'
  ) as redeemed_order_id,
  to_regprocedure(
    'public.create_pending_order(uuid,uuid,uuid,uuid,text,text,text,jsonb,numeric,numeric,numeric,text,uuid)'
  ) is not null as loyalty_checkout_function,
  to_regprocedure(
    'public.get_admin_customer_summaries(uuid,text,integer)'
  ) is not null as customer_summary_function,
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.orders'::regclass
      and tgname = 'orders_sync_completed_loyalty'
      and not tgisinternal
  ) as loyalty_trigger,
  (select value #>> '{}' from public.business_settings where key = 'loyalty_threshold')
    as loyalty_threshold;

select
  (select count(*) from public.loyalty_accounts) as loyalty_accounts,
  (select count(*) from public.loyalty_rewards where status = 'earned') as earned_rewards,
  (select count(*) from public.loyalty_rewards where status = 'redeemed') as redeemed_rewards;
