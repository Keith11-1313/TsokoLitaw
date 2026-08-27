create extension if not exists pgcrypto with schema extensions;

create type public.profile_role as enum ('customer', 'admin');
create type public.pickup_availability_mode as enum ('MADE_TO_ORDER', 'READY_STOCK', 'HYBRID');
create type public.order_status as enum (
  'PENDING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);
create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
create type public.refund_status as enum ('REQUESTED', 'PROCESSING', 'REFUNDED', 'FAILED');
create type public.refund_method as enum ('ORIGINAL_PAYMENT_METHOD', 'MANUAL_FALLBACK');
create type public.journal_status as enum ('draft', 'published');
create type public.loyalty_reward_status as enum ('earned', 'redeemed', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  mobile_number text,
  role public.profile_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_key on public.profiles (lower(email));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  price_per_piece numeric(10,2) not null check (price_per_piece >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  piece_count integer not null check (piece_count > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, piece_count)
);

create table public.coatings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  additional_type_price numeric(10,2) not null default 5 check (additional_type_price >= 0),
  is_active boolean not null default true,
  is_allergen boolean not null default false,
  allergen_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pickup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pickup_dates (
  id uuid primary key default gen_random_uuid(),
  pickup_date date not null unique,
  availability_mode public.pickup_availability_mode not null default 'MADE_TO_ORDER',
  is_open boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pickup_windows (
  id uuid primary key default gen_random_uuid(),
  pickup_date_id uuid not null references public.pickup_dates(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  is_open boolean not null default true,
  capacity integer check (capacity >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (pickup_date_id, start_time, end_time)
);

create table public.pickup_window_locations (
  pickup_window_id uuid not null references public.pickup_windows(id) on delete cascade,
  pickup_location_id uuid not null references public.pickup_locations(id) on delete cascade,
  is_open boolean not null default true,
  capacity_override integer check (capacity_override >= 0),
  primary key (pickup_window_id, pickup_location_id)
);

create table public.daily_inventory (
  id uuid primary key default gen_random_uuid(),
  pickup_date date not null references public.pickup_dates(pickup_date) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  stock_total integer not null check (stock_total >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  stock_sold integer not null default 0 check (stock_sold >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stock_reserved + stock_sold <= stock_total),
  unique (pickup_date, product_variant_id)
);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  daily_inventory_id uuid not null references public.daily_inventory(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (reason in ('RESTOCK', 'WALK_IN_SALE', 'WASTE', 'CORRECTION')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'PENDING_PAYMENT',
  payment_status public.payment_status not null default 'PENDING',
  customer_name text not null,
  customer_email text not null,
  customer_mobile text,
  pickup_date date not null,
  pickup_window_id uuid not null references public.pickup_windows(id) on delete restrict,
  pickup_location_id uuid not null references public.pickup_locations(id) on delete restrict,
  pickup_window_snapshot text not null,
  pickup_location_snapshot text not null,
  customer_notes text,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount_total numeric(10,2) not null default 0 check (discount_total >= 0),
  total numeric(10,2) not null check (total >= 0),
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  payment_expires_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_total <= subtotal),
  check (total = subtotal - discount_total)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  piece_count_snapshot integer not null check (piece_count_snapshot > 0),
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  extra_coating_total_snapshot numeric(10,2) not null default 0 check (extra_coating_total_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_subtotal numeric(10,2) not null check (line_subtotal >= 0),
  created_at timestamptz not null default now()
);

create table public.order_item_coatings (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  coating_id uuid not null references public.coatings(id) on delete restrict,
  coating_name_snapshot text not null,
  piece_count integer not null check (piece_count > 0),
  additional_price_snapshot numeric(10,2) not null default 0 check (additional_price_snapshot >= 0),
  is_included_type boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_item_id, coating_id)
);

create unique index order_item_one_included_coating_idx
  on public.order_item_coatings (order_item_id)
  where is_included_type;

create table public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete restrict,
  addon_name_snapshot text not null,
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  unique (order_item_id, addon_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null default 'paymongo',
  provider_checkout_id text,
  provider_payment_id text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status public.payment_status not null default 'PENDING',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_provider_checkout_key
  on public.payments (provider, provider_checkout_id)
  where provider_checkout_id is not null;
create unique index payments_provider_payment_key
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider text not null default 'paymongo',
  provider_refund_id text unique,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status public.refund_status not null default 'REQUESTED',
  method public.refund_method not null default 'ORIGINAL_PAYMENT_METHOD',
  reason text not null,
  failure_code text,
  failure_message text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.manual_refund_destinations (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null unique references public.refunds(id) on delete cascade,
  destination_type text not null check (destination_type in ('GCASH', 'MAYA', 'BANK')),
  account_name text not null,
  account_reference_encrypted text not null,
  collected_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null default 'resend',
  event_type text not null,
  recipient_email text not null,
  idempotency_key text not null unique,
  provider_message_id text unique,
  status text not null check (status in ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  display_name_snapshot text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (length(trim(comment)) > 0),
  is_visible boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  content_type text not null check (content_type in ('announcement', 'story', 'product_feature', 'video')),
  cover_image_url text,
  video_url text,
  status public.journal_status not null default 'draft',
  published_at timestamptz,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft') or (published_at is not null))
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promotion_type text not null,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  completed_order_count integer not null default 0 check (completed_order_count >= 0),
  updated_at timestamptz not null default now()
);

create table public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null,
  threshold integer not null check (threshold > 0),
  status public.loyalty_reward_status not null default 'earned',
  earned_at timestamptz not null default now(),
  redeemed_at timestamptz,
  source_order_id uuid not null references public.orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, reward_type, source_order_id)
);

create table public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  content text not null,
  effective_at timestamptz not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index terms_one_current_idx on public.terms_versions (is_current) where is_current;

create table public.business_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index product_variants_catalog_idx on public.product_variants (product_id, is_active, sort_order);
create index coatings_catalog_idx on public.coatings (is_active, sort_order);
create index addons_catalog_idx on public.addons (is_active);
create index pickup_dates_open_idx on public.pickup_dates (pickup_date) where is_open;
create index pickup_windows_date_idx on public.pickup_windows (pickup_date_id, is_open, sort_order);
create index daily_inventory_availability_idx on public.daily_inventory (pickup_date, is_available);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_pickup_date_idx on public.orders (pickup_date, status);
create index order_items_order_idx on public.order_items (order_id);
create index order_item_coatings_item_idx on public.order_item_coatings (order_item_id);
create index order_item_addons_item_idx on public.order_item_addons (order_item_id);
create index payments_order_idx on public.payments (order_id, status);
create index refunds_order_idx on public.refunds (order_id, status);
create index notification_deliveries_order_idx on public.notification_deliveries (order_id, event_type);
create index reviews_public_idx on public.reviews (is_visible, is_featured, created_at desc);
create index journal_posts_public_idx on public.journal_posts (status, published_at desc);
create index promotions_active_idx on public.promotions (is_active, starts_at, ends_at);
create index loyalty_rewards_user_idx on public.loyalty_rewards (user_id, status);
create index admin_audit_logs_admin_idx on public.admin_audit_logs (admin_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    'customer'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  insert into public.loyalty_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.enforce_admin_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'admin' then
    if tg_op = 'INSERT' then
      if (select count(*) from public.profiles where role = 'admin') >= 5 then
        raise exception 'TsokoLitaw supports at most five administrators';
      end if;
    elsif old.role is distinct from 'admin'
      and (select count(*) from public.profiles where role = 'admin') >= 5 then
      raise exception 'TsokoLitaw supports at most five administrators';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_admin_limit
  before insert or update of role on public.profiles
  for each row execute procedure public.enforce_admin_limit();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.promote_admin_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  promoted_user_id uuid;
begin
  if nullif(trim(target_email), '') is null then
    raise exception 'Admin email is required';
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where lower(email) = lower(trim(target_email))
  returning id into promoted_user_id;

  if promoted_user_id is null then
    raise exception 'No signed-in profile matches the requested admin email';
  end if;

  return promoted_user_id;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'products', 'product_variants', 'coatings', 'addons',
    'pickup_locations', 'pickup_dates', 'pickup_windows', 'daily_inventory',
    'payments', 'refunds', 'notification_deliveries', 'reviews', 'journal_posts',
    'promotions', 'loyalty_accounts'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()',
      target_table || '_set_updated_at',
      target_table
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.coatings enable row level security;
alter table public.addons enable row level security;
alter table public.pickup_locations enable row level security;
alter table public.pickup_dates enable row level security;
alter table public.pickup_windows enable row level security;
alter table public.pickup_window_locations enable row level security;
alter table public.daily_inventory enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_coatings enable row level security;
alter table public.order_item_addons enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.manual_refund_destinations enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.reviews enable row level security;
alter table public.journal_posts enable row level security;
alter table public.promotions enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.terms_versions enable row level security;
alter table public.business_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.promote_admin_by_email(text) to service_role;

grant select on public.products, public.product_variants, public.coatings, public.addons,
  public.pickup_locations, public.pickup_dates, public.pickup_windows,
  public.pickup_window_locations, public.journal_posts, public.promotions,
  public.terms_versions to anon, authenticated;
grant select (id, display_name_snapshot, rating, comment, is_featured, created_at)
  on public.reviews to anon;
grant select on public.reviews to authenticated;

grant select on public.profiles, public.orders, public.order_items,
  public.order_item_coatings, public.order_item_addons, public.payments,
  public.refunds, public.loyalty_accounts, public.loyalty_rewards to authenticated;
grant update (full_name, mobile_number) on public.profiles to authenticated;

create policy products_read_active_or_admin
  on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy product_variants_read_active_or_admin
  on public.product_variants for select to anon, authenticated
  using (is_active or public.is_admin());
create policy coatings_read_active_or_admin
  on public.coatings for select to anon, authenticated
  using (is_active or public.is_admin());
create policy addons_read_active_or_admin
  on public.addons for select to anon, authenticated
  using (is_active or public.is_admin());
create policy pickup_locations_read_active_or_admin
  on public.pickup_locations for select to anon, authenticated
  using (is_active or public.is_admin());
create policy pickup_dates_read_open_or_admin
  on public.pickup_dates for select to anon, authenticated
  using (is_open or public.is_admin());
create policy pickup_windows_read_open_or_admin
  on public.pickup_windows for select to anon, authenticated
  using (is_open or public.is_admin());
create policy pickup_window_locations_read_open_or_admin
  on public.pickup_window_locations for select to anon, authenticated
  using (is_open or public.is_admin());
create policy journal_posts_read_published_or_admin
  on public.journal_posts for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy promotions_read_active_or_admin
  on public.promotions for select to anon, authenticated
  using (is_active or public.is_admin());
create policy terms_versions_read_current_or_admin
  on public.terms_versions for select to anon, authenticated
  using (is_current or public.is_admin());
create policy reviews_read_visible_owner_or_admin
  on public.reviews for select to anon, authenticated
  using (
    is_visible
    or user_id = (select auth.uid())
    or public.is_admin()
  );

create policy profiles_read_own_or_admin
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy orders_read_own_or_admin
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy order_items_read_own_or_admin
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and (orders.user_id = (select auth.uid()) or public.is_admin())
    )
  );
create policy order_item_coatings_read_own_or_admin
  on public.order_item_coatings for select to authenticated
  using (
    exists (
      select 1
      from public.order_items
      join public.orders on orders.id = order_items.order_id
      where order_items.id = order_item_coatings.order_item_id
        and (orders.user_id = (select auth.uid()) or public.is_admin())
    )
  );
create policy order_item_addons_read_own_or_admin
  on public.order_item_addons for select to authenticated
  using (
    exists (
      select 1
      from public.order_items
      join public.orders on orders.id = order_items.order_id
      where order_items.id = order_item_addons.order_item_id
        and (orders.user_id = (select auth.uid()) or public.is_admin())
    )
  );
create policy payments_read_own_or_admin
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = payments.order_id
        and (orders.user_id = (select auth.uid()) or public.is_admin())
    )
  );
create policy refunds_read_own_or_admin
  on public.refunds for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = refunds.order_id
        and (orders.user_id = (select auth.uid()) or public.is_admin())
    )
  );
create policy loyalty_accounts_read_own_or_admin
  on public.loyalty_accounts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy loyalty_rewards_read_own_or_admin
  on public.loyalty_rewards for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy daily_inventory_admin_read
  on public.daily_inventory for select to authenticated using (public.is_admin());
create policy inventory_adjustments_admin_read
  on public.inventory_adjustments for select to authenticated using (public.is_admin());
create policy manual_refund_destinations_admin_read
  on public.manual_refund_destinations for select to authenticated using (public.is_admin());
create policy payment_webhook_events_admin_read
  on public.payment_webhook_events for select to authenticated using (public.is_admin());
create policy notification_deliveries_admin_read
  on public.notification_deliveries for select to authenticated using (public.is_admin());
create policy business_settings_admin_read
  on public.business_settings for select to authenticated using (public.is_admin());
create policy admin_audit_logs_admin_read
  on public.admin_audit_logs for select to authenticated using (public.is_admin());

grant select on public.daily_inventory, public.inventory_adjustments,
  public.manual_refund_destinations, public.payment_webhook_events,
  public.notification_deliveries, public.business_settings,
  public.admin_audit_logs to authenticated;

comment on function public.promote_admin_by_email(text) is
  'Service-role-only bootstrap. Call after the approved Google identity has signed in and created a profile.';
comment on table public.manual_refund_destinations is
  'Restricted fallback data used only after an automatic PayMongo refund is unsupported or fails.';
