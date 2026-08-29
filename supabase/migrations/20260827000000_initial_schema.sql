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
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null default '',
  email text not null,
  mobile_number text,
  role public.profile_role not null default 'customer',
  is_active boolean not null default true,
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_deletion_schedule_consistent check (
    (deletion_requested_at is null and deletion_scheduled_for is null)
    or (
      deletion_requested_at is not null
      and deletion_scheduled_for = deletion_requested_at + interval '90 days'
    )
  ),
  constraint profiles_deactivation_consistent check (
    (is_active and deactivated_at is null)
    or (not is_active and deactivated_at is not null)
  )
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
  primary key (pickup_window_id, pickup_location_id)
);

create table public.daily_inventory (
  id uuid primary key default gen_random_uuid(),
  pickup_date date not null references public.pickup_dates(pickup_date) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  stock_total integer not null check (stock_total >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  stock_sold integer not null default 0 check (stock_sold >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stock_reserved + stock_sold <= stock_total),
  unique (pickup_date, product_id)
);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  daily_inventory_id uuid not null references public.daily_inventory(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (reason in ('RESTOCK', 'WASTE', 'CORRECTION')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  checkout_idempotency_key uuid,
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
  provider_checkout_url text,
  provider_payment_id text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status public.payment_status not null default 'PENDING',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_order_key on public.payments (order_id);
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
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  display_name_snapshot text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (length(trim(comment)) > 0),
  is_visible boolean not null default false,
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
  icon_key text not null default 'megaphone' check (icon_key in ('megaphone', 'sparkles', 'file_text', 'video')),
  display_date date not null default current_date,
  cover_image_url text,
  video_url text,
  status public.journal_status not null default 'draft',
  published_at timestamptz,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft') or (published_at is not null))
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'journal-media',
  'journal-media',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'catalog-media',
  'catalog-media',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

create sequence public.order_number_sequence
  as bigint
  minvalue 1
  start with 1;

create table public.business_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.mutation_rate_limit_buckets (
  bucket_key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (bucket_key_hash, window_started_at),
  check (bucket_key_hash ~ '^[a-f0-9]{64}$')
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
create index profiles_deletion_due_idx on public.profiles (deletion_scheduled_for)
  where is_active and deletion_scheduled_for is not null;
create index orders_user_created_idx on public.orders (user_id, created_at desc, id desc);
create unique index orders_user_checkout_idempotency_key
  on public.orders (user_id, checkout_idempotency_key)
  where user_id is not null and checkout_idempotency_key is not null;
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_pickup_date_idx on public.orders (pickup_date, status);
create index order_items_order_idx on public.order_items (order_id, created_at, id);
create index order_item_coatings_item_idx on public.order_item_coatings (order_item_id);
create index order_item_addons_item_idx on public.order_item_addons (order_item_id);
create index payments_order_idx on public.payments (order_id, status);
create index refunds_order_idx on public.refunds (order_id, status);
create index refunds_order_created_idx on public.refunds (order_id, created_at desc);
create index mutation_rate_limit_updated_idx
  on public.mutation_rate_limit_buckets (updated_at);
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

create or replace function public.is_active_user()
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
      and is_active
  );
$$;

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
      and is_active
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
    and is_active
  returning id into promoted_user_id;

  if promoted_user_id is null then
    raise exception 'No signed-in profile matches the requested admin email';
  end if;

  return promoted_user_id;
end;
$$;

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := (select auth.uid());
  requested_at_value timestamptz := now();
  scheduled_for_value timestamptz;
begin
  if requesting_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = requesting_user_id and is_active
  ) then
    raise exception 'Account is inactive';
  end if;

  if exists (
    select 1 from public.profiles
    where id = requesting_user_id and role = 'admin'
  ) then
    raise exception 'Admin accounts require controlled removal';
  end if;

  if exists (
    select 1 from public.orders
    where user_id = requesting_user_id
      and status in (
        'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'
      )
  ) or exists (
    select 1
    from public.refunds
    join public.orders on orders.id = refunds.order_id
    where orders.user_id = requesting_user_id
      and refunds.status in ('REQUESTED', 'PROCESSING')
  ) then
    raise exception 'Account deletion is unavailable while orders or refunds are active';
  end if;

  update public.profiles
  set deletion_requested_at = coalesce(deletion_requested_at, requested_at_value),
      deletion_scheduled_for = coalesce(
        deletion_scheduled_for,
        requested_at_value + interval '90 days'
      ),
      updated_at = now()
  where id = requesting_user_id
    and is_active
  returning deletion_scheduled_for into scheduled_for_value;

  if scheduled_for_value is null then
    raise exception 'Authenticated profile was not found';
  end if;

  return scheduled_for_value;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := (select auth.uid());
begin
  if requesting_user_id is null then
    raise exception 'Authentication is required';
  end if;

  update public.profiles
  set deletion_requested_at = null,
      deletion_scheduled_for = null,
      updated_at = now()
  where id = requesting_user_id
    and is_active;

  if not found then
    raise exception 'Authenticated profile was not found';
  end if;
end;
$$;

create or replace function public.deactivate_due_account(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.profile_role;
  target_due_at timestamptz;
  target_is_active boolean;
begin
  select role, deletion_scheduled_for, is_active
  into target_role, target_due_at, target_is_active
  from public.profiles
  where id = target_user_id
  for update;

  if target_role is null or target_role = 'admin' or not target_is_active
    or target_due_at is null or target_due_at > now() then
    return false;
  end if;

  if exists (
    select 1 from public.orders
    where user_id = target_user_id
      and status in (
        'PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'
      )
  ) or exists (
    select 1
    from public.refunds
    join public.orders on orders.id = refunds.order_id
    where orders.user_id = target_user_id
      and refunds.status in ('REQUESTED', 'PROCESSING')
  ) then
    return false;
  end if;

  update public.profiles
  set is_active = false,
      deactivated_at = now(),
      updated_at = now()
  where id = target_user_id
    and is_active;

  return found;
end;
$$;

create or replace function public.consume_mutation_rate_limit(
  bucket_key_hashes text[],
  maximum_requests integer,
  window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  remaining_requests integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_hash text;
  current_window_started_at timestamptz;
  current_count integer;
  highest_count integer := 0;
begin
  if coalesce(cardinality(bucket_key_hashes), 0) < 1
    or cardinality(bucket_key_hashes) > 2
    or maximum_requests < 1
    or maximum_requests > 1000
    or window_seconds < 1
    or window_seconds > 86400
  then
    raise exception 'Invalid rate-limit configuration';
  end if;

  current_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  foreach target_hash in array bucket_key_hashes
  loop
    if target_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'Invalid rate-limit bucket';
    end if;

    insert into public.mutation_rate_limit_buckets (
      bucket_key_hash,
      window_started_at,
      request_count,
      updated_at
    )
    values (target_hash, current_window_started_at, 1, clock_timestamp())
    on conflict (bucket_key_hash, window_started_at)
    do update set
      request_count = mutation_rate_limit_buckets.request_count + 1,
      updated_at = clock_timestamp()
    returning request_count into current_count;

    highest_count := greatest(highest_count, current_count);
  end loop;

  return query select
    highest_count <= maximum_requests,
    greatest(
      ceil(extract(epoch from (
        current_window_started_at
        + make_interval(secs => window_seconds)
        - clock_timestamp()
      )))::integer,
      0
    ),
    greatest(maximum_requests - highest_count, 0);
end;
$$;

create or replace function public.prune_mutation_rate_limit_buckets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.mutation_rate_limit_buckets
  where updated_at < clock_timestamp() - interval '2 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

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

create or replace function public.list_due_paymongo_checkouts(batch_limit integer default 100)
returns table (
  due_payment_id uuid,
  due_order_id uuid,
  due_checkout_id text
)
language sql
security definer
set search_path = ''
as $$
  select
    payments.id,
    orders.id,
    payments.provider_checkout_id
  from public.payments
  join public.orders on orders.id = payments.order_id
  where payments.provider = 'paymongo'
    and payments.status = 'PENDING'
    and payments.provider_checkout_id is not null
    and orders.status = 'PENDING_PAYMENT'
    and orders.payment_status = 'PENDING'
    and orders.payment_expires_at <= now()
  order by orders.payment_expires_at, orders.id
  limit least(greatest(coalesce(batch_limit, 100), 1), 100);
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

create or replace function public.prepare_order_cancellation(
  target_order_id uuid,
  target_user_id uuid
)
returns table (
  cancellation_kind text,
  cancellation_payment_id uuid,
  cancellation_checkout_id text,
  cancellation_provider_payment_id text,
  cancellation_amount numeric,
  existing_refund_id uuid,
  existing_refund_status public.refund_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
  target_refund public.refunds%rowtype;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Order is unavailable';
  end if;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  select * into target_refund
  from public.refunds
  where order_id = target_order.id
  order by created_at desc
  limit 1;

  if target_order.status = 'CANCELLED' and target_refund.id is not null then
    return query select
      'PAID_REFUND'::text,
      target_payment.id,
      target_payment.provider_checkout_id,
      target_payment.provider_payment_id,
      target_payment.amount,
      target_refund.id,
      target_refund.status;
    return;
  end if;

  if target_order.status = 'PENDING_PAYMENT'
    and target_order.payment_status = 'PENDING'
    and (target_payment.id is null or target_payment.status = 'PENDING')
  then
    return query select
      'UNPAID'::text,
      target_payment.id,
      target_payment.provider_checkout_id,
      target_payment.provider_payment_id,
      coalesce(target_payment.amount, target_order.total),
      null::uuid,
      null::public.refund_status;
    return;
  end if;

  if target_order.status in ('PAID', 'CONFIRMED')
    and target_order.payment_status = 'PAID'
    and target_payment.status = 'PAID'
    and target_payment.provider = 'paymongo'
    and target_payment.provider_payment_id is not null
  then
    return query select
      'PAID_REFUND'::text,
      target_payment.id,
      target_payment.provider_checkout_id,
      target_payment.provider_payment_id,
      target_payment.amount,
      target_refund.id,
      target_refund.status;
    return;
  end if;

  raise exception 'Order is no longer eligible for cancellation';
end;
$$;

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

create or replace function public.request_paid_order_refund(
  target_order_id uuid,
  target_user_id uuid
)
returns table (
  requested_refund_id uuid,
  requested_payment_id uuid,
  provider_payment_id text,
  refund_amount numeric,
  refund_status_value public.refund_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
  target_refund public.refunds%rowtype;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Order is unavailable';
  end if;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  select * into target_refund
  from public.refunds
  where order_id = target_order.id
  order by created_at desc
  limit 1
  for update;

  if target_order.status = 'CANCELLED' and target_refund.id is not null then
    return query select
      target_refund.id, target_payment.id, target_payment.provider_payment_id,
      target_refund.amount, target_refund.status;
    return;
  end if;

  if target_order.status not in ('PAID', 'CONFIRMED')
    or target_order.payment_status <> 'PAID'
    or target_payment.id is null
    or target_payment.status <> 'PAID'
    or target_payment.provider <> 'paymongo'
    or target_payment.provider_payment_id is null
    or target_payment.amount <> target_order.total
  then
    raise exception 'Order is no longer eligible for a paid cancellation';
  end if;

  insert into public.refunds (
    order_id, payment_id, amount, reason
  ) values (
    target_order.id, target_payment.id, target_payment.amount,
    'Customer cancelled before preparation'
  )
  returning * into target_refund;

  update public.orders
  set status = 'CANCELLED',
      cancelled_at = now(),
      updated_at = now()
  where id = target_order.id;

  return query select
    target_refund.id, target_payment.id, target_payment.provider_payment_id,
    target_refund.amount, target_refund.status;
end;
$$;

create or replace function public.record_paymongo_refund_result(
  target_refund_id uuid,
  provider_refund_id_value text,
  provider_status_value text,
  failure_code_value text default null,
  failure_message_value text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_refund public.refunds%rowtype;
  next_status public.refund_status;
begin
  if provider_refund_id_value !~ '^ref_[A-Za-z0-9_-]+$'
    or provider_status_value not in ('pending', 'processing', 'succeeded', 'failed')
  then
    raise exception 'PayMongo refund result is invalid';
  end if;

  select * into target_refund
  from public.refunds
  where id = target_refund_id
  for update;

  if target_refund.id is null or target_refund.method <> 'ORIGINAL_PAYMENT_METHOD' then
    raise exception 'Refund is unavailable';
  end if;
  if target_refund.provider_refund_id is not null
    and target_refund.provider_refund_id <> provider_refund_id_value
  then
    raise exception 'A different PayMongo refund is already attached';
  end if;

  next_status := case provider_status_value
    when 'succeeded' then 'REFUNDED'::public.refund_status
    when 'failed' then 'FAILED'::public.refund_status
    else 'PROCESSING'::public.refund_status
  end;

  if target_refund.status = 'REFUNDED' then
    if next_status = 'REFUNDED' and target_refund.provider_refund_id = provider_refund_id_value then
      return false;
    end if;
    raise exception 'A completed refund cannot move backward';
  end if;
  if target_refund.status = 'FAILED' and next_status <> 'FAILED' then
    raise exception 'A failed refund requires a new controlled fallback';
  end if;

  update public.refunds
  set provider_refund_id = provider_refund_id_value,
      status = next_status,
      failure_code = case when next_status = 'FAILED' then failure_code_value else null end,
      failure_message = case when next_status = 'FAILED' then failure_message_value else null end,
      processed_at = case when next_status in ('REFUNDED', 'FAILED') then now() else processed_at end,
      refunded_at = case when next_status = 'REFUNDED' then now() else refunded_at end,
      updated_at = now()
  where id = target_refund.id;

  if next_status = 'REFUNDED' then
    update public.payments
    set status = 'REFUNDED', refunded_at = now(), updated_at = now()
    where id = target_refund.payment_id and status = 'PAID';

    update public.orders
    set payment_status = 'REFUNDED', updated_at = now()
    where id = target_refund.order_id and status = 'CANCELLED';
  end if;

  return true;
end;
$$;

create or replace function public.fail_paymongo_refund_request(
  target_refund_id uuid,
  failure_code_value text,
  failure_message_value text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.refunds
  set status = 'FAILED',
      failure_code = left(coalesce(failure_code_value, 'provider_error'), 100),
      failure_message = left(coalesce(failure_message_value, 'PayMongo rejected the refund request.'), 500),
      processed_at = now(),
      updated_at = now()
  where id = target_refund_id
    and method = 'ORIGINAL_PAYMENT_METHOD'
    and status in ('REQUESTED', 'PROCESSING');
  return found;
end;
$$;

create or replace function public.process_paymongo_refund_event(
  event_key text,
  provider_refund_id_value text,
  provider_payment_id_value text,
  refund_amount_value numeric,
  provider_status_value text,
  event_summary jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_event_id uuid;
  target_refund public.refunds%rowtype;
  target_payment public.payments%rowtype;
begin
  if event_key is null or length(event_key) > 255
    or provider_refund_id_value !~ '^ref_[A-Za-z0-9_-]+$'
    or provider_payment_id_value !~ '^pay_[A-Za-z0-9_-]+$'
    or refund_amount_value <= 0
    or provider_status_value not in ('pending', 'processing', 'succeeded', 'failed')
  then
    raise exception 'PayMongo refund event is invalid';
  end if;

  insert into public.payment_webhook_events (
    provider, provider_event_id, event_type, payload
  ) values (
    'paymongo', event_key, 'payment.refund.updated', event_summary
  )
  on conflict (provider_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then return false; end if;

  select * into target_payment
  from public.payments
  where provider = 'paymongo'
    and provider_payment_id = provider_payment_id_value
  for update;

  select * into target_refund
  from public.refunds
  where payment_id = target_payment.id
    and (provider_refund_id is null or provider_refund_id = provider_refund_id_value)
  order by created_at desc
  limit 1
  for update;

  if target_payment.id is null
    or target_refund.id is null
    or target_refund.amount <> refund_amount_value
    or target_refund.currency <> 'PHP'
  then
    raise exception 'PayMongo refund does not match a requested refund';
  end if;

  perform public.record_paymongo_refund_result(
    target_refund.id, provider_refund_id_value, provider_status_value,
    case when provider_status_value = 'failed' then 'provider_failed' else null end,
    case when provider_status_value = 'failed' then 'PayMongo reported that the refund failed.' else null end
  );

  update public.payment_webhook_events set processed_at = now() where id = inserted_event_id;
  return true;
end;
$$;

create or replace function public.request_manual_refund_fallback(
  target_refund_id uuid,
  target_user_id uuid,
  destination_type_value text,
  account_name_value text,
  encrypted_reference_value text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_refund public.refunds%rowtype;
begin
  if destination_type_value not in ('GCASH', 'MAYA', 'BANK')
    or length(trim(account_name_value)) not between 2 and 100
    or encrypted_reference_value !~ '^v1[.]'
    or length(encrypted_reference_value) > 1000
  then
    raise exception 'Manual refund destination is invalid';
  end if;

  select refunds.* into target_refund
  from public.refunds
  join public.orders on orders.id = refunds.order_id
  where refunds.id = target_refund_id
    and orders.user_id = target_user_id
    and orders.status = 'CANCELLED'
  for update of refunds;

  if target_refund.id is null
    or target_refund.status <> 'FAILED'
    or target_refund.method <> 'ORIGINAL_PAYMENT_METHOD'
  then
    raise exception 'Manual refund fallback is unavailable';
  end if;

  insert into public.manual_refund_destinations (
    refund_id, destination_type, account_name,
    account_reference_encrypted, collected_by
  ) values (
    target_refund.id, destination_type_value, trim(account_name_value),
    encrypted_reference_value, target_user_id
  );

  update public.refunds
  set method = 'MANUAL_FALLBACK',
      status = 'REQUESTED',
      requested_at = now(),
      processed_at = null,
      updated_at = now()
  where id = target_refund.id;

  return true;
end;
$$;

create or replace function public.submit_order_review(
  target_user_id uuid,
  target_order_id uuid,
  rating_value integer,
  comment_value text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_profile public.profiles%rowtype;
  target_order public.orders%rowtype;
  created_review_id uuid;
  normalized_comment text := trim(comment_value);
begin
  select * into customer_profile
  from public.profiles
  where id = target_user_id
    and is_active;

  if customer_profile.id is null then
    raise exception 'Active customer access is required';
  end if;

  if rating_value < 1 or rating_value > 5 then
    raise exception 'Rating must be between one and five';
  end if;

  if normalized_comment is null
    or length(normalized_comment) < 10
    or length(normalized_comment) > 1000
  then
    raise exception 'Review comment must contain between 10 and 1000 characters';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Completed order was not found';
  end if;

  if target_order.status <> 'COMPLETED' then
    raise exception 'Only completed orders can be reviewed';
  end if;

  if exists (select 1 from public.reviews where order_id = target_order.id) then
    raise exception 'This order already has a review';
  end if;

  insert into public.reviews (
    user_id,
    order_id,
    display_name_snapshot,
    rating,
    comment,
    is_visible,
    is_featured
  ) values (
    target_user_id,
    target_order.id,
    customer_profile.full_name,
    rating_value,
    normalized_comment,
    false,
    false
  )
  returning id into created_review_id;

  return created_review_id;
end;
$$;

create or replace function public.moderate_order_review(
  target_admin_id uuid,
  target_review_id uuid,
  visible_value boolean,
  featured_value boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_review public.reviews%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;

  if featured_value and not visible_value then
    raise exception 'Featured reviews must remain visible';
  end if;

  select * into target_review
  from public.reviews
  where id = target_review_id
  for update;

  if target_review.id is null then
    raise exception 'Review was not found';
  end if;

  update public.reviews
  set is_visible = visible_value,
      is_featured = featured_value,
      updated_at = now()
  where id = target_review.id;

  insert into public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) values (
    target_admin_id,
    'review.moderated',
    'review',
    target_review.id::text,
    jsonb_build_object(
      'order_id', target_review.order_id,
      'previous_visible', target_review.is_visible,
      'previous_featured', target_review.is_featured,
      'visible', visible_value,
      'featured', featured_value
    )
  );

  return true;
end;
$$;

create or replace function public.upsert_journal_post(
  target_admin_id uuid,
  target_post_id uuid,
  title_value text,
  excerpt_value text,
  content_value text,
  content_type_value text,
  icon_key_value text,
  display_date_value date,
  cover_image_url_value text,
  video_url_value text,
  status_value public.journal_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_post_id uuid := coalesce(target_post_id, gen_random_uuid());
  target_post public.journal_posts%rowtype;
  normalized_title text := trim(title_value);
  normalized_excerpt text := nullif(trim(excerpt_value), '');
  normalized_content text := trim(content_value);
  generated_slug text;
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;

  if length(normalized_title) < 3 or length(normalized_title) > 120 then
    raise exception 'Journal title must contain between 3 and 120 characters';
  end if;

  if normalized_excerpt is not null and length(normalized_excerpt) > 240 then
    raise exception 'Journal excerpt cannot exceed 240 characters';
  end if;

  if length(normalized_content) < 10 or length(normalized_content) > 5000 then
    raise exception 'Journal content must contain between 10 and 5000 characters';
  end if;

  if content_type_value not in ('announcement', 'story', 'product_feature', 'video') then
    raise exception 'Journal content type is invalid';
  end if;

  if icon_key_value not in ('megaphone', 'sparkles', 'file_text', 'video') then
    raise exception 'Journal icon is invalid';
  end if;

  if display_date_value is null then
    raise exception 'Journal display date is required';
  end if;

  if target_post_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_title), '[^a-z0-9]+', '-', 'g'))
      || '-' || left(saved_post_id::text, 8);

    insert into public.journal_posts (
      id, title, slug, excerpt, content, content_type, icon_key, display_date,
      cover_image_url, video_url, status, published_at, author_id
    ) values (
      saved_post_id, normalized_title, generated_slug, normalized_excerpt,
      normalized_content, content_type_value, icon_key_value, display_date_value,
      nullif(trim(cover_image_url_value), ''), nullif(trim(video_url_value), ''),
      status_value, case when status_value = 'published' then now() else null end,
      target_admin_id
    );
    audit_action := 'journal.created';
  else
    select * into target_post
    from public.journal_posts
    where id = target_post_id
    for update;

    if target_post.id is null then
      raise exception 'Journal post was not found';
    end if;

    update public.journal_posts
    set title = normalized_title,
        excerpt = normalized_excerpt,
        content = normalized_content,
        content_type = content_type_value,
        icon_key = icon_key_value,
        display_date = display_date_value,
        cover_image_url = nullif(trim(cover_image_url_value), ''),
        video_url = nullif(trim(video_url_value), ''),
        status = status_value,
        published_at = case
          when status_value = 'draft' then null
          else coalesce(target_post.published_at, now())
        end,
        updated_at = now()
    where id = target_post_id;
    audit_action := 'journal.updated';
  end if;

  insert into public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) values (
    target_admin_id,
    audit_action,
    'journal_post',
    saved_post_id::text,
    jsonb_build_object(
      'title', normalized_title,
      'content_type', content_type_value,
      'icon_key', icon_key_value,
      'display_date', display_date_value,
      'status', status_value
    )
  );

  return saved_post_id;
end;
$$;

create or replace function public.update_catalog_product(
  target_admin_id uuid,
  target_product_id uuid,
  description_value text,
  price_per_piece_value numeric,
  active_value boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product public.products%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(trim(description_value)) < 10 or length(trim(description_value)) > 500 then
    raise exception 'Product description must contain between 10 and 500 characters';
  end if;
  if price_per_piece_value is null or price_per_piece_value < 0 or price_per_piece_value > 10000 then
    raise exception 'Product price is invalid';
  end if;

  select * into target_product from public.products where id = target_product_id for update;
  if target_product.id is null then raise exception 'Product was not found'; end if;

  update public.products
  set description = trim(description_value), price_per_piece = price_per_piece_value,
      is_active = active_value, updated_at = now()
  where id = target_product_id;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, 'catalog.product_updated', 'product', target_product_id::text,
    jsonb_build_object('previous_price', target_product.price_per_piece, 'price', price_per_piece_value,
      'previous_active', target_product.is_active, 'active', active_value));
  return true;
end;
$$;

create or replace function public.update_catalog_variant(
  target_admin_id uuid,
  target_variant_id uuid,
  active_value boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_variant public.product_variants%rowtype;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  select * into target_variant from public.product_variants where id = target_variant_id for update;
  if target_variant.id is null then raise exception 'Product variant was not found'; end if;
  if target_variant.piece_count not in (4, 6, 8) then raise exception 'Unsupported box size'; end if;

  update public.product_variants set is_active = active_value, updated_at = now() where id = target_variant_id;
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, 'catalog.variant_updated', 'product_variant', target_variant_id::text,
    jsonb_build_object('piece_count', target_variant.piece_count, 'previous_active', target_variant.is_active, 'active', active_value));
  return true;
end;
$$;

create or replace function public.upsert_catalog_coating(
  target_admin_id uuid,
  target_coating_id uuid,
  name_value text,
  description_value text,
  image_url_value text,
  additional_type_price_value numeric,
  active_value boolean,
  allergen_value boolean,
  allergen_note_value text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid := coalesce(target_coating_id, gen_random_uuid());
  target_coating public.coatings%rowtype;
  normalized_name text := trim(name_value);
  normalized_description text := trim(description_value);
  normalized_image text := trim(image_url_value);
  generated_slug text;
  next_sort integer;
  audit_action text;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then raise exception 'Coating name must contain between 2 and 80 characters'; end if;
  if length(normalized_description) < 10 or length(normalized_description) > 300 then raise exception 'Coating description must contain between 10 and 300 characters'; end if;
  if normalized_image = '' or length(normalized_image) > 1000 then raise exception 'Coating image is required'; end if;
  if additional_type_price_value is null or additional_type_price_value < 0 or additional_type_price_value > 10000 then raise exception 'Coating price is invalid'; end if;
  if allergen_value and nullif(trim(allergen_note_value), '') is null then raise exception 'Allergen note is required'; end if;

  if target_coating_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(saved_id::text, 8);
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.coatings;
    insert into public.coatings (id, name, slug, description, image_url, additional_type_price, is_active, is_allergen, allergen_note, sort_order)
    values (saved_id, normalized_name, generated_slug, normalized_description, normalized_image,
      additional_type_price_value, active_value, allergen_value, nullif(trim(allergen_note_value), ''), next_sort);
    audit_action := 'catalog.coating_created';
  else
    select * into target_coating from public.coatings where id = target_coating_id for update;
    if target_coating.id is null then raise exception 'Coating was not found'; end if;
    update public.coatings set name = normalized_name, description = normalized_description,
      image_url = normalized_image, additional_type_price = additional_type_price_value,
      is_active = active_value, is_allergen = allergen_value,
      allergen_note = nullif(trim(allergen_note_value), ''), updated_at = now()
    where id = target_coating_id;
    audit_action := 'catalog.coating_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, audit_action, 'coating', saved_id::text,
    jsonb_build_object('name', normalized_name, 'price', additional_type_price_value, 'active', active_value));
  return saved_id;
end;
$$;

drop function if exists public.update_catalog_addon(uuid, uuid, numeric, boolean);

create or replace function public.upsert_catalog_addon(
  target_admin_id uuid,
  target_addon_id uuid,
  name_value text,
  price_value numeric,
  active_value boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid := coalesce(target_addon_id, gen_random_uuid());
  target_addon public.addons%rowtype;
  normalized_name text := trim(name_value);
  generated_slug text;
  audit_action text;
begin
  if not exists (select 1 from public.profiles where id = target_admin_id and role = 'admin' and is_active) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then raise exception 'Add-on name must contain between 2 and 80 characters'; end if;
  if price_value is null or price_value < 0 or price_value > 10000 then raise exception 'Add-on price is invalid'; end if;

  if target_addon_id is null then
    generated_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(saved_id::text, 8);
    insert into public.addons (id, name, slug, price, is_active)
    values (saved_id, normalized_name, generated_slug, price_value, active_value);
    audit_action := 'catalog.addon_created';
  else
    select * into target_addon from public.addons where id = target_addon_id for update;
    if target_addon.id is null then raise exception 'Add-on was not found'; end if;
    update public.addons
    set name = normalized_name, price = price_value, is_active = active_value, updated_at = now()
    where id = target_addon_id;
    audit_action := 'catalog.addon_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (target_admin_id, audit_action, 'addon', saved_id::text,
    jsonb_build_object('name', normalized_name, 'price', price_value, 'active', active_value));
  return saved_id;
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
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
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

create or replace function public.get_public_pickup_settings()
returns table (
  minimum_lead_days integer,
  daily_cutoff_time time,
  pickup_grace_minutes integer,
  operating_start time,
  operating_end time
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select (value #>> '{}')::integer from public.business_settings where key = 'minimum_lead_days'), 1),
    coalesce((select (value #>> '{}')::time from public.business_settings where key = 'daily_cutoff_time'), '17:00'::time),
    coalesce((select (value #>> '{}')::integer from public.business_settings where key = 'pickup_grace_minutes'), 15),
    coalesce((select (value ->> 'start')::time from public.business_settings where key = 'pickup_operating_hours'), '07:00'::time),
    coalesce((select (value ->> 'end')::time from public.business_settings where key = 'pickup_operating_hours'), '19:00'::time);
$$;

create or replace function public.get_public_stocked_pickup_dates()
returns table (pickup_date date)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct daily_inventory.pickup_date
  from public.daily_inventory
  join public.pickup_dates on pickup_dates.pickup_date = daily_inventory.pickup_date
  where pickup_dates.is_open
    and pickup_dates.availability_mode in ('READY_STOCK', 'HYBRID')
    and daily_inventory.is_available
    and daily_inventory.stock_total - daily_inventory.stock_reserved - daily_inventory.stock_sold > 0;
$$;

create or replace function public.upsert_pickup_schedule(
  target_admin_id uuid,
  target_pickup_date_id uuid,
  pickup_date_value date,
  availability_mode_value public.pickup_availability_mode,
  open_value boolean,
  notes_value text,
  windows_value jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_date_id uuid := coalesce(target_pickup_date_id, gen_random_uuid());
  target_date public.pickup_dates%rowtype;
  window_value jsonb;
  saved_window_id uuid;
  window_start time;
  window_end time;
  location_ids uuid[];
  window_position integer := 0;
  operating_start time;
  operating_end time;
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if pickup_date_value is null
    or pickup_date_value < (current_timestamp at time zone 'Asia/Manila')::date
  then
    raise exception 'Pickup date must be today or later';
  end if;
  if notes_value is not null and length(trim(notes_value)) > 500 then
    raise exception 'Pickup note cannot exceed 500 characters';
  end if;
  if jsonb_typeof(windows_value) <> 'array'
    or jsonb_array_length(windows_value) < 1
    or jsonb_array_length(windows_value) > 12
  then
    raise exception 'Pickup schedule requires between 1 and 12 windows';
  end if;

  select
    coalesce((select (value ->> 'start')::time from public.business_settings where key = 'pickup_operating_hours'), '07:00'::time),
    coalesce((select (value ->> 'end')::time from public.business_settings where key = 'pickup_operating_hours'), '19:00'::time)
  into operating_start, operating_end;

  if target_pickup_date_id is null then
    insert into public.pickup_dates (
      id, pickup_date, availability_mode, is_open, notes
    ) values (
      saved_date_id, pickup_date_value, availability_mode_value,
      coalesce(open_value, false), nullif(trim(notes_value), '')
    );
    audit_action := 'pickup.created';
  else
    select * into target_date
    from public.pickup_dates
    where id = target_pickup_date_id
    for update;

    if target_date.id is null then
      raise exception 'Pickup date was not found';
    end if;
    if exists (
      select 1 from public.daily_inventory
      where pickup_date = target_date.pickup_date
    ) or exists (
      select 1
      from public.orders
      join public.pickup_windows on pickup_windows.id = orders.pickup_window_id
      where pickup_windows.pickup_date_id = target_date.id
        and orders.status not in ('CANCELLED', 'EXPIRED')
    ) then
      raise exception 'Pickup schedule is locked by orders or inventory';
    end if;

    update public.pickup_dates
    set pickup_date = pickup_date_value,
        availability_mode = availability_mode_value,
        is_open = coalesce(open_value, false),
        notes = nullif(trim(notes_value), ''),
        updated_at = now()
    where id = target_date.id;
    delete from public.pickup_windows where pickup_date_id = target_date.id;
    audit_action := 'pickup.updated';
  end if;

  for window_value in select value from jsonb_array_elements(windows_value)
  loop
    if jsonb_typeof(window_value) <> 'object'
      or coalesce(window_value ->> 'start_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(window_value ->> 'end_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or jsonb_typeof(window_value -> 'location_ids') <> 'array'
      or jsonb_array_length(window_value -> 'location_ids') < 1
    then
      raise exception 'Pickup window is invalid';
    end if;

    window_start := (window_value ->> 'start_time')::time;
    window_end := (window_value ->> 'end_time')::time;
    select array_agg(distinct value::uuid)
    into location_ids
    from jsonb_array_elements_text(window_value -> 'location_ids');

    if window_end <= window_start
      or window_start < operating_start
      or window_end > operating_end
    then
      raise exception 'Pickup window falls outside the configured rules';
    end if;
    if cardinality(location_ids) <> jsonb_array_length(window_value -> 'location_ids')
      or (select count(*) from public.pickup_locations where id = any(location_ids) and is_active) <> cardinality(location_ids)
    then
      raise exception 'Pickup window contains an unavailable location';
    end if;

    insert into public.pickup_windows (
      pickup_date_id, start_time, end_time, is_open, sort_order
    ) values (
      saved_date_id, window_start, window_end, true, window_position
    ) returning id into saved_window_id;
    insert into public.pickup_window_locations (pickup_window_id, pickup_location_id, is_open)
    select saved_window_id, unnest(location_ids), true;
    window_position := window_position + 1;
  end loop;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id, audit_action, 'pickup_date', saved_date_id::text,
    jsonb_build_object(
      'pickup_date', pickup_date_value,
      'availability_mode', availability_mode_value,
      'is_open', coalesce(open_value, false),
      'window_count', jsonb_array_length(windows_value)
    )
  );
  return saved_date_id;
end;
$$;

create or replace function public.upsert_pickup_location(
  target_admin_id uuid,
  target_location_id uuid,
  name_value text,
  description_value text,
  active_value boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_location_id uuid := coalesce(target_location_id, gen_random_uuid());
  target_location public.pickup_locations%rowtype;
  normalized_name text := trim(name_value);
  audit_action text;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 100 then
    raise exception 'Pickup location name must contain between 2 and 100 characters';
  end if;
  if description_value is not null and length(trim(description_value)) > 300 then
    raise exception 'Pickup location description cannot exceed 300 characters';
  end if;

  if target_location_id is null then
    insert into public.pickup_locations (
      id, name, description, is_active, sort_order
    ) values (
      saved_location_id, normalized_name, nullif(trim(description_value), ''),
      coalesce(active_value, false),
      coalesce((select max(sort_order) + 1 from public.pickup_locations), 1)
    );
    audit_action := 'pickup.location_created';
  else
    select * into target_location
    from public.pickup_locations
    where id = target_location_id
    for update;
    if target_location.id is null then raise exception 'Pickup location was not found'; end if;

    update public.pickup_locations
    set name = normalized_name,
        description = nullif(trim(description_value), ''),
        is_active = coalesce(active_value, false),
        updated_at = now()
    where id = target_location.id;
    audit_action := 'pickup.location_updated';
  end if;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id, audit_action, 'pickup_location', saved_location_id::text,
    jsonb_build_object('name', normalized_name, 'is_active', coalesce(active_value, false))
  );
  return saved_location_id;
end;
$$;

create or replace function public.set_pickup_date_open(
  target_admin_id uuid,
  target_pickup_date_id uuid,
  open_value boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_date public.pickup_dates%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  select * into target_date from public.pickup_dates
  where id = target_pickup_date_id for update;
  if target_date.id is null then raise exception 'Pickup date was not found'; end if;

  update public.pickup_dates
  set is_open = coalesce(open_value, false), updated_at = now()
  where id = target_date.id;
  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id,
    case when open_value then 'pickup.published' else 'pickup.closed' end,
    'pickup_date', target_date.id::text,
    jsonb_build_object('pickup_date', target_date.pickup_date, 'previous_open', target_date.is_open, 'is_open', open_value)
  );
  return coalesce(open_value, false);
end;
$$;

create or replace function public.update_pickup_settings(
  target_admin_id uuid,
  minimum_lead_days_value integer,
  daily_cutoff_time_value time,
  grace_minutes_value integer,
  operating_start_value time,
  operating_end_value time
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin_id and role = 'admin' and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;
  if minimum_lead_days_value < 0 or minimum_lead_days_value > 30
    or grace_minutes_value < 0 or grace_minutes_value > 120
    or daily_cutoff_time_value is null
    or operating_start_value is null
    or operating_end_value is null
    or operating_end_value <= operating_start_value
  then
    raise exception 'Pickup rules are invalid';
  end if;
  if exists (
    select 1
    from public.pickup_windows
    join public.pickup_dates on pickup_dates.id = pickup_windows.pickup_date_id
    where pickup_dates.pickup_date >= (current_timestamp at time zone 'Asia/Manila')::date
      and pickup_dates.is_open and pickup_windows.is_open
      and (pickup_windows.start_time < operating_start_value or pickup_windows.end_time > operating_end_value)
  ) then
    raise exception 'Open pickup windows must fit inside the new operating hours';
  end if;

  insert into public.business_settings (key, value) values
    ('minimum_lead_days', to_jsonb(minimum_lead_days_value)),
    ('daily_cutoff_time', to_jsonb(daily_cutoff_time_value::text)),
    ('pickup_grace_minutes', to_jsonb(grace_minutes_value)),
    ('pickup_operating_hours', jsonb_build_object('start', operating_start_value::text, 'end', operating_end_value::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  values (
    target_admin_id, 'pickup.settings_updated', 'business_settings', 'pickup',
    jsonb_build_object(
      'minimum_lead_days', minimum_lead_days_value,
      'daily_cutoff_time', daily_cutoff_time_value,
      'pickup_grace_minutes', grace_minutes_value,
      'operating_start', operating_start_value,
      'operating_end', operating_end_value
    )
  );
  return true;
end;
$$;

create or replace function public.transition_order_status(
  target_admin_id uuid,
  target_order_id uuid,
  expected_status public.order_status,
  next_status public.order_status
)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
begin
  if not exists (
    select 1
    from public.profiles
    where id = target_admin_id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'Active administrator access is required';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if target_order.id is null then
    raise exception 'Order was not found';
  end if;

  if target_order.status is distinct from expected_status then
    raise exception 'Order status changed before this update';
  end if;

  if target_order.payment_status <> 'PAID' then
    raise exception 'Only paid orders can enter fulfillment';
  end if;

  if not (
    (expected_status = 'CONFIRMED' and next_status = 'PREPARING')
    or (expected_status = 'PREPARING' and next_status = 'READY_FOR_PICKUP')
    or (expected_status = 'READY_FOR_PICKUP' and next_status = 'COMPLETED')
  ) then
    raise exception 'That order status transition is not allowed';
  end if;

  update public.orders
  set status = next_status,
      completed_at = case
        when next_status = 'COMPLETED' then now()
        else completed_at
      end,
      updated_at = now()
  where id = target_order.id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    target_admin_id,
    'order.status_changed',
    'order',
    target_order.id::text,
    jsonb_build_object(
      'order_number', target_order.order_number,
      'from_status', expected_status,
      'to_status', next_status
    )
  );

  return next_status;
end;
$$;

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
  terms_version_value text
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
  customer_profile public.profiles%rowtype;
  existing_order public.orders%rowtype;
  pickup_date_value date;
  pickup_mode public.pickup_availability_mode;
  pickup_start_time time;
  pickup_end_time time;
  pickup_location_name text;
  requested_box_count integer;
  payment_expiry_minutes integer := 15;
  minimum_lead_days integer := 1;
  daily_cutoff_time time := '17:00';
  current_manila_date date := (current_timestamp at time zone 'Asia/Manila')::date;
  current_manila_time time := (current_timestamp at time zone 'Asia/Manila')::time;
  generated_order_id uuid := gen_random_uuid();
  generated_order_number text;
  line jsonb;
  coating jsonb;
  addon jsonb;
  inserted_order_item_id uuid;
  requested_product record;
begin
  perform public.expire_pending_orders();

  if target_user_id is null or checkout_key is null then
    raise exception 'Customer and checkout identifiers are required';
  end if;

  select * into customer_profile
  from public.profiles
  where id = target_user_id
  for update;

  if customer_profile.id is null
    or not customer_profile.is_active
    or customer_profile.deletion_scheduled_for is not null
  then
    raise exception 'Account is not eligible for checkout';
  end if;

  select * into existing_order
  from public.orders
  where user_id = target_user_id
    and checkout_idempotency_key = checkout_key;

  if existing_order.id is not null then
    return query select
      existing_order.id,
      existing_order.order_number,
      existing_order.total,
      false;
    return;
  end if;

  if jsonb_typeof(priced_lines) <> 'array'
    or jsonb_array_length(priced_lines) < 1
    or jsonb_array_length(priced_lines) > 20
  then
    raise exception 'Priced order lines are invalid';
  end if;

  if subtotal_value < 0
    or discount_value < 0
    or discount_value > subtotal_value
    or total_value <> subtotal_value - discount_value
    or subtotal_value <> coalesce((
      select sum((entry ->> 'line_subtotal')::numeric)
      from jsonb_array_elements(priced_lines) entry
    ), 0)
  then
    raise exception 'Priced order totals are inconsistent';
  end if;

  select
    pickup_dates.pickup_date,
    pickup_dates.availability_mode,
    pickup_windows.start_time,
    pickup_windows.end_time,
    pickup_locations.name
  into
    pickup_date_value,
    pickup_mode,
    pickup_start_time,
    pickup_end_time,
    pickup_location_name
  from public.pickup_windows
  join public.pickup_dates
    on pickup_dates.id = pickup_windows.pickup_date_id
  join public.pickup_window_locations
    on pickup_window_locations.pickup_window_id = pickup_windows.id
  join public.pickup_locations
    on pickup_locations.id = pickup_window_locations.pickup_location_id
  where pickup_windows.id = selected_pickup_window_id
    and pickup_locations.id = selected_pickup_location_id
    and pickup_dates.is_open
    and pickup_windows.is_open
    and pickup_window_locations.is_open
    and pickup_locations.is_active
    and pickup_dates.pickup_date >= (current_timestamp at time zone 'Asia/Manila')::date
  for update of pickup_windows;

  if pickup_date_value is null then
    raise exception 'The selected pickup option is unavailable';
  end if;

  select coalesce((value #>> '{}')::integer, 1)
  into minimum_lead_days
  from public.business_settings
  where key = 'minimum_lead_days';
  minimum_lead_days := coalesce(minimum_lead_days, 1);

  select coalesce((value #>> '{}')::time, '17:00'::time)
  into daily_cutoff_time
  from public.business_settings
  where key = 'daily_cutoff_time';
  daily_cutoff_time := coalesce(daily_cutoff_time, '17:00'::time);

  if pickup_date_value = current_manila_date and pickup_end_time <= current_manila_time then
    raise exception 'The selected pickup window has already ended';
  end if;
  if pickup_mode = 'MADE_TO_ORDER' and pickup_date_value = current_manila_date then
    raise exception 'Made-to-order pickup requires an advance date';
  end if;
  if pickup_mode in ('MADE_TO_ORDER', 'HYBRID')
    and pickup_date_value > current_manila_date
    and pickup_date_value < current_manila_date
      + minimum_lead_days
      + (case when current_manila_time >= daily_cutoff_time then 1 else 0 end)
  then
    raise exception 'The selected pickup date is inside the lead-time or cutoff window';
  end if;

  select coalesce(sum((entry ->> 'quantity')::integer), 0)
  into requested_box_count
  from jsonb_array_elements(priced_lines) entry;

  if requested_box_count < 1
    or requested_box_count > 100
  then
    raise exception 'The order contains an invalid box quantity';
  end if;

  if pickup_mode = 'READY_STOCK'
    or (
      pickup_mode = 'HYBRID'
      and pickup_date_value = (current_timestamp at time zone 'Asia/Manila')::date
    )
  then
    for requested_product in
      select
        product_variants.product_id,
        sum((entry ->> 'quantity')::integer * product_variants.piece_count)::integer as piece_count
      from jsonb_array_elements(priced_lines) entry
      join public.product_variants
        on product_variants.id = (entry ->> 'variant_id')::uuid
      group by product_variants.product_id
    loop
      update public.daily_inventory
      set stock_reserved = stock_reserved + requested_product.piece_count,
          updated_at = now()
      where pickup_date = pickup_date_value
        and product_id = requested_product.product_id
        and is_available
        and stock_total - stock_reserved - stock_sold >= requested_product.piece_count;

      if not found then
        raise exception 'Ready stock does not have enough pieces for the selected boxes';
      end if;
    end loop;
  end if;

  select coalesce((value #>> '{}')::integer, 15)
  into payment_expiry_minutes
  from public.business_settings
  where key = 'payment_expiry_minutes';
  payment_expiry_minutes := coalesce(payment_expiry_minutes, 15);

  generated_order_number := 'TL-'
    || lpad(nextval('public.order_number_sequence'::regclass)::text, 4, '0');

  insert into public.orders (
    id,
    order_number,
    user_id,
    checkout_idempotency_key,
    customer_name,
    customer_email,
    customer_mobile,
    pickup_date,
    pickup_window_id,
    pickup_location_id,
    pickup_window_snapshot,
    pickup_location_snapshot,
    customer_notes,
    subtotal,
    discount_total,
    total,
    terms_version,
    terms_accepted_at,
    payment_expires_at
  ) values (
    generated_order_id,
    generated_order_number,
    target_user_id,
    checkout_key,
    coalesce(nullif(trim(customer_name_value), ''), customer_profile.full_name),
    customer_profile.email,
    nullif(trim(customer_mobile_value), ''),
    pickup_date_value,
    selected_pickup_window_id,
    selected_pickup_location_id,
    to_char(pickup_start_time, 'FMHH12:MI AM') || '–'
      || to_char(pickup_end_time, 'FMHH12:MI AM'),
    pickup_location_name,
    nullif(trim(customer_notes_value), ''),
    subtotal_value,
    discount_value,
    total_value,
    terms_version_value,
    now(),
    now() + make_interval(mins => payment_expiry_minutes)
  );

  for line in select value from jsonb_array_elements(priced_lines)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name_snapshot,
      variant_name_snapshot,
      piece_count_snapshot,
      unit_price_snapshot,
      extra_coating_total_snapshot,
      quantity,
      line_subtotal
    ) values (
      generated_order_id,
      (line ->> 'product_id')::uuid,
      (line ->> 'variant_id')::uuid,
      line ->> 'product_name',
      line ->> 'variant_name',
      (line ->> 'piece_count')::integer,
      (line ->> 'base_unit_price')::numeric,
      (line ->> 'extra_coating_total')::numeric,
      (line ->> 'quantity')::integer,
      (line ->> 'line_subtotal')::numeric
    ) returning id into inserted_order_item_id;

    for coating in select value from jsonb_array_elements(line -> 'coatings')
    loop
      insert into public.order_item_coatings (
        order_item_id,
        coating_id,
        coating_name_snapshot,
        piece_count,
        additional_price_snapshot,
        is_included_type
      ) values (
        inserted_order_item_id,
        (coating ->> 'id')::uuid,
        coating ->> 'name',
        (coating ->> 'piece_count')::integer,
        (coating ->> 'additional_price')::numeric,
        (coating ->> 'is_included_type')::boolean
      );
    end loop;

    addon := line -> 'addon';
    if addon is not null and addon <> 'null'::jsonb then
      insert into public.order_item_addons (
        order_item_id,
        addon_id,
        addon_name_snapshot,
        unit_price_snapshot,
        quantity,
        line_total
      ) values (
        inserted_order_item_id,
        (addon ->> 'id')::uuid,
        addon ->> 'name',
        (addon ->> 'unit_price')::numeric,
        (addon ->> 'quantity')::integer,
        (addon ->> 'line_total')::numeric
      );
    end if;
  end loop;

  return query select generated_order_id, generated_order_number, total_value, true;
end;
$$;

create or replace function public.prepare_paymongo_checkout(
  target_order_id uuid,
  target_user_id uuid
)
returns table (
  prepared_payment_id uuid,
  prepared_order_id uuid,
  prepared_order_number text,
  prepared_amount numeric,
  prepared_customer_name text,
  prepared_customer_email text,
  prepared_customer_mobile text,
  existing_checkout_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
begin
  perform public.expire_pending_orders();

  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Pending order is unavailable';
  end if;
  if target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'PENDING'
    or target_order.payment_expires_at is null
    or target_order.payment_expires_at <= now()
  then
    raise exception 'Order is not eligible for payment';
  end if;

  insert into public.payments (order_id, amount)
  values (target_order.id, target_order.total)
  on conflict (order_id) do nothing;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  if target_payment.id is null
    or target_payment.provider <> 'paymongo'
    or target_payment.status <> 'PENDING'
    or target_payment.currency <> 'PHP'
    or target_payment.amount <> target_order.total
  then
    raise exception 'Payment record is inconsistent with the order';
  end if;

  return query select
    target_payment.id,
    target_order.id,
    target_order.order_number,
    target_order.total,
    target_order.customer_name,
    target_order.customer_email,
    target_order.customer_mobile,
    target_payment.provider_checkout_url;
end;
$$;

create or replace function public.attach_paymongo_checkout(
  target_payment_id uuid,
  checkout_id text,
  checkout_url text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment public.payments%rowtype;
begin
  if checkout_id !~ '^cs_[A-Za-z0-9_-]+$'
    or checkout_url !~ '^https://checkout[.]paymongo[.]com/'
  then
    raise exception 'PayMongo checkout reference is invalid';
  end if;

  select * into target_payment
  from public.payments
  where id = target_payment_id
  for update;

  if target_payment.id is null or target_payment.status <> 'PENDING' then
    raise exception 'Pending payment is unavailable';
  end if;

  if target_payment.provider_checkout_id is not null then
    if target_payment.provider_checkout_id <> checkout_id
      or target_payment.provider_checkout_url <> checkout_url
    then
      raise exception 'A different PayMongo checkout is already attached';
    end if;
    return false;
  end if;

  update public.payments
  set provider_checkout_id = checkout_id,
      provider_checkout_url = checkout_url,
      updated_at = now()
  where id = target_payment.id;

  return true;
end;
$$;

create or replace function public.process_paymongo_paid_event(
  event_key text,
  target_order_id uuid,
  target_order_number text,
  checkout_id text,
  payment_id text,
  paid_amount numeric,
  event_summary jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_event_id uuid;
  target_payment public.payments%rowtype;
  target_order public.orders%rowtype;
begin
  if event_key is null or length(event_key) > 255
    or checkout_id !~ '^cs_[A-Za-z0-9_-]+$'
    or payment_id !~ '^pay_[A-Za-z0-9_-]+$'
    or paid_amount <= 0
  then
    raise exception 'PayMongo payment event is invalid';
  end if;

  insert into public.payment_webhook_events (
    provider,
    provider_event_id,
    event_type,
    payload
  ) values (
    'paymongo',
    event_key,
    'checkout_session.payment.paid',
    event_summary
  )
  on conflict (provider_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return false;
  end if;

  select * into target_payment
  from public.payments
  where provider = 'paymongo'
    and provider_checkout_id = checkout_id
  for update;

  if target_payment.id is null then
    raise exception 'PayMongo checkout is not attached to a payment';
  end if;

  select * into target_order
  from public.orders
  where id = target_payment.order_id
  for update;

  if target_order.id is null
    or target_order.id <> target_order_id
    or target_order.order_number <> target_order_number
    or target_order.status <> 'PENDING_PAYMENT'
    or target_order.payment_status <> 'PENDING'
    or target_payment.status <> 'PENDING'
    or target_payment.amount <> paid_amount
    or target_order.total <> paid_amount
  then
    raise exception 'PayMongo payment does not match an eligible pending order';
  end if;

  update public.payments
  set provider_payment_id = payment_id,
      status = 'PAID',
      paid_at = now(),
      updated_at = now()
  where id = target_payment.id;

  update public.orders
  set payment_status = 'PAID',
      status = 'CONFIRMED',
      updated_at = now()
  where id = target_order.id;

  update public.payment_webhook_events
  set processed_at = now()
  where id = inserted_event_id;

  return true;
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
alter table public.mutation_rate_limit_buckets enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_active_user() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_public_pickup_settings() to anon, authenticated;
grant execute on function public.get_public_stocked_pickup_dates() to anon, authenticated;
grant execute on function public.promote_admin_by_email(text) to service_role;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.deactivate_due_account(uuid) to service_role;
grant execute on function public.consume_mutation_rate_limit(text[], integer, integer)
  to service_role;
grant execute on function public.prune_mutation_rate_limit_buckets() to service_role;
grant execute on function public.expire_pending_orders() to service_role;
grant execute on function public.list_due_paymongo_checkouts(integer) to service_role;
grant execute on function public.expire_paymongo_order(uuid, text) to service_role;
grant execute on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text
) to service_role;
grant execute on function public.prepare_paymongo_checkout(uuid, uuid) to service_role;
grant execute on function public.attach_paymongo_checkout(uuid, text, text) to service_role;
grant execute on function public.process_paymongo_paid_event(
  text, uuid, text, text, text, numeric, jsonb
) to service_role;
grant execute on function public.prepare_order_cancellation(uuid, uuid) to service_role;
grant execute on function public.cancel_unpaid_order(uuid, uuid, text) to service_role;
grant execute on function public.request_paid_order_refund(uuid, uuid) to service_role;
grant execute on function public.record_paymongo_refund_result(
  uuid, text, text, text, text
) to service_role;
grant execute on function public.fail_paymongo_refund_request(uuid, text, text) to service_role;
grant execute on function public.process_paymongo_refund_event(
  text, text, text, numeric, text, jsonb
) to service_role;
grant execute on function public.request_manual_refund_fallback(
  uuid, uuid, text, text, text
) to service_role;
grant execute on function public.transition_order_status(
  uuid, uuid, public.order_status, public.order_status
) to service_role;
grant execute on function public.submit_order_review(
  uuid, uuid, integer, text
) to service_role;
grant execute on function public.moderate_order_review(
  uuid, uuid, boolean, boolean
) to service_role;
grant execute on function public.upsert_journal_post(
  uuid, uuid, text, text, text, text, text, date, text, text, public.journal_status
) to service_role;
grant execute on function public.update_catalog_product(uuid, uuid, text, numeric, boolean) to service_role;
grant execute on function public.update_catalog_variant(uuid, uuid, boolean) to service_role;
grant execute on function public.upsert_catalog_coating(
  uuid, uuid, text, text, text, numeric, boolean, boolean, text
) to service_role;
grant execute on function public.upsert_catalog_addon(uuid, uuid, text, numeric, boolean) to service_role;
grant execute on function public.upsert_daily_inventory(
  uuid, date, uuid, integer, boolean, text
) to service_role;
grant execute on function public.record_inventory_consumption(
  uuid, uuid, integer, text, text
) to service_role;
grant execute on function public.upsert_pickup_schedule(
  uuid, uuid, date, public.pickup_availability_mode, boolean, text, jsonb
) to service_role;
grant execute on function public.upsert_pickup_location(uuid, uuid, text, text, boolean) to service_role;
grant execute on function public.set_pickup_date_open(uuid, uuid, boolean) to service_role;
grant execute on function public.update_pickup_settings(
  uuid, integer, time, integer, time, time
) to service_role;

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
    or (user_id = (select auth.uid()) and public.is_active_user())
    or public.is_admin()
  );

create policy profiles_read_own_or_admin
  on public.profiles for select to authenticated
  using ((id = (select auth.uid()) and public.is_active_user()) or public.is_admin());
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.is_active_user())
  with check (id = (select auth.uid()) and public.is_active_user());
create policy orders_read_own_or_admin
  on public.orders for select to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());
create policy order_items_read_own_or_admin
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and (
          (orders.user_id = (select auth.uid()) and public.is_active_user())
          or public.is_admin()
        )
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
        and (
          (orders.user_id = (select auth.uid()) and public.is_active_user())
          or public.is_admin()
        )
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
        and (
          (orders.user_id = (select auth.uid()) and public.is_active_user())
          or public.is_admin()
        )
    )
  );
create policy payments_read_own_or_admin
  on public.payments for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = payments.order_id
        and (
          (orders.user_id = (select auth.uid()) and public.is_active_user())
          or public.is_admin()
        )
    )
  );
create policy refunds_read_own_or_admin
  on public.refunds for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = refunds.order_id
        and (
          (orders.user_id = (select auth.uid()) and public.is_active_user())
          or public.is_admin()
        )
    )
  );
create policy loyalty_accounts_read_own_or_admin
  on public.loyalty_accounts for select to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());
create policy loyalty_rewards_read_own_or_admin
  on public.loyalty_rewards for select to authenticated
  using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());

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
comment on function public.request_account_deletion() is
  'Schedules the authenticated customer account for deletion after a fixed 90-day grace period.';
comment on function public.cancel_account_deletion() is
  'Cancels the authenticated customer account deletion request during its grace period.';
comment on function public.deactivate_due_account(uuid) is
  'Service-role-only processor that marks an eligible due customer profile inactive while preserving its relational data.';
comment on function public.expire_pending_orders() is
  'Service-role-only processor that expires overdue unpaid orders without an attached provider checkout and releases ready-stock reservations.';
comment on function public.list_due_paymongo_checkouts(integer) is
  'Lists overdue provider-bound payments for trusted PayMongo expiry coordination.';
comment on function public.expire_paymongo_order(uuid, text) is
  'Finalizes an overdue order only after trusted server code expires the exact PayMongo checkout.';
comment on function public.transition_order_status(
  uuid, uuid, public.order_status, public.order_status
) is
  'Service-role-only fulfillment transition with active-Admin validation, optimistic status matching, and audit logging.';
comment on function public.get_public_pickup_settings() is
  'Returns only customer-safe lead-time, cutoff, grace-period, and operating-hour settings used by Checkout.';
comment on function public.get_public_stocked_pickup_dates() is
  'Returns only published dates that currently have at least one sellable prepared piece; exact stock balances remain private.';
comment on function public.upsert_pickup_schedule(
  uuid, uuid, date, public.pickup_availability_mode, boolean, text, jsonb
) is
  'Service-role-only Pickup schedule writer with active-Admin validation, immutable booked/inventoried schedules, and audit logging.';
comment on function public.upsert_pickup_location(uuid, uuid, text, text, boolean) is
  'Service-role-only Pickup location create/update function with active-Admin validation and audit logging.';
comment on function public.set_pickup_date_open(uuid, uuid, boolean) is
  'Service-role-only publication toggle for an existing Pickup date with active-Admin validation and audit logging.';
comment on function public.update_pickup_settings(
  uuid, integer, time, integer, time, time
) is
  'Service-role-only Pickup rules writer for lead time, cutoff, grace, and operating hours.';
comment on function public.submit_order_review(uuid, uuid, integer, text) is
  'Service-role-only customer review writer that enforces active ownership, completed fulfillment, and one review per order.';
comment on function public.moderate_order_review(uuid, uuid, boolean, boolean) is
  'Service-role-only review moderation with active-Admin validation and audit logging.';
comment on function public.upsert_journal_post(
  uuid, uuid, text, text, text, text, text, date, text, text, public.journal_status
) is
  'Service-role-only Journal draft/publication writer with active-Admin validation and audit logging.';
comment on function public.create_pending_order(
  uuid, uuid, uuid, uuid, text, text, text, jsonb, numeric, numeric, numeric, text
) is 'Service-role-only atomic order writer. Next.js must reload and validate active catalog prices before calling it.';
comment on function public.prepare_paymongo_checkout(uuid, uuid) is
  'Service-role-only payment initializer that creates at most one pending PayMongo payment per eligible order.';
comment on function public.attach_paymongo_checkout(uuid, text, text) is
  'Service-role-only writer that immutably attaches one PayMongo checkout session to a pending payment.';
comment on function public.process_paymongo_paid_event(text, uuid, text, text, text, numeric, jsonb) is
  'Service-role-only idempotent transition for verified PayMongo checkout_session.payment.paid events.';
comment on function public.prepare_order_cancellation(uuid, uuid) is
  'Service-role-only ownership and eligibility check for customer cancellation.';
comment on function public.cancel_unpaid_order(uuid, uuid, text) is
  'Service-role-only unpaid cancellation. An attached checkout must be expired through PayMongo first.';
comment on function public.request_paid_order_refund(uuid, uuid) is
  'Service-role-only paid cancellation that records a separately tracked full refund request.';
comment on function public.record_paymongo_refund_result(uuid, text, text, text, text) is
  'Records an authenticated PayMongo refund API result and settles payment state only after success.';
comment on function public.process_paymongo_refund_event(text, text, text, numeric, text, jsonb) is
  'Idempotently applies a signed PayMongo refund event to the exact payment and refund.';
comment on function public.request_manual_refund_fallback(uuid, uuid, text, text, text) is
  'Stores an encrypted customer refund destination only after original-method refund failure.';
comment on function public.update_catalog_product(uuid, uuid, text, numeric, boolean) is
  'Service-role-only audited product price, description, and availability update.';
comment on function public.update_catalog_variant(uuid, uuid, boolean) is
  'Service-role-only audited availability update for approved 4, 6, and 8 piece boxes.';
comment on function public.upsert_catalog_coating(uuid, uuid, text, text, text, numeric, boolean, boolean, text) is
  'Service-role-only audited coating create or update used by the public builder and checkout.';
comment on function public.upsert_catalog_addon(uuid, uuid, text, numeric, boolean) is
  'Service-role-only audited add-on create or update used by the public builder and checkout.';
comment on function public.upsert_daily_inventory(uuid, date, uuid, integer, boolean, text) is
  'Service-role-only audited ready-stock writer. Stock is counted in individual product pieces shared by every box size.';
comment on function public.record_inventory_consumption(uuid, uuid, integer, text, text) is
  'Service-role-only audited waste writer that removes unusable uncommitted pieces.';
comment on table public.manual_refund_destinations is
  'Restricted fallback data used only after an automatic PayMongo refund is unsupported or fails.';
