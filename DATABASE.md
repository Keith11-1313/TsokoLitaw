# TsokoLitaw — Proposed Database Design

## 1. Status

No database has been implemented. This document describes the proposed Supabase PostgreSQL model for a later approved phase.

Before implementation, convert this design into reviewed migrations, constraints, indexes, RLS policies, and seed data.

## Decision-to-Schema Mapping

The proposed schema follows `DECISIONS.md` and the current workflow:

| Product decision | Database consequence |
| --- | --- |
| Google email is primary; mobile is optional | `profiles.email` required through Auth identity; `mobile_number` nullable |
| Boxes have 4, 6, or 8 pieces | `product_variants.piece_count` and price records |
| Choices are coatings, not flavors | dedicated `coatings` table |
| Mixed boxes allocate every piece | `order_item_coatings.piece_count` totals must match the item snapshot |
| First coating type is included | snapshot which type was included and price additional distinct types server-side |
| Campus pickup only | pickup date, window, and location references; no delivery-address requirement |
| Reviews require completed orders | unique review per order plus ownership/status validation |
| Journal supports multiple content types | `journal_posts.content_type`, publication state, and optional media |
| Admin mirrors customer operations | admin mutations update the same catalog, pickup, order, review, and Journal records customers consume |

Do not create migrations directly from rough reference content. Reconfirm the decision log and business-policy items first.

## 2. Profiles

### `profiles`

```text
id uuid primary key references auth.users(id)
full_name text
email text
mobile_number text nullable
role text default 'customer' check role in ('customer', 'admin')
created_at timestamptz
updated_at timestamptz
```

Google remains the authentication source for email. Admin authorization must be checked server-side.

## 3. Products and Box Variants

### `products`

```text
id uuid primary key
name text
slug text unique
description text
image_url text nullable
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

### `product_variants`

```text
id uuid primary key
product_id uuid references products(id)
name text
piece_count integer check piece_count > 0
price numeric(10,2) check price >= 0
is_active boolean default true
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Initial variants:

- 4-piece box — ₱60
- 6-piece box — ₱85
- 8-piece box — ₱110

Prices are seed values, not permanent hardcoded rules.

## 4. Coatings

### `coatings`

```text
id uuid primary key
name text
slug text unique
description text
image_url text nullable
additional_type_price numeric(10,2) default 5 check additional_type_price >= 0
is_active boolean default true
is_allergen boolean default false
allergen_note text nullable
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Initial values:

- Cocoa
- Milk
- Palitaw: sugar, niyog, and sesame seeds
- Crushed Nuts
- Plain
- Sesame Seeds
- Cookies and Cream

Pricing rule: one distinct coating type is included; additional distinct coating types add the configured charge. Server validation must count distinct positive allocations.

The application must validate coating media before upload. Customer catalog images use a square 1:1 presentation; future storage should retain image dimensions and reject unsupported or unsafe file types. Database `image_url` stores only the resulting approved asset location, never a browser data URL.

## 5. Add-ons

### `addons`

```text
id uuid primary key
name text
price numeric(10,2) check price >= 0
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

Initial add-on:

- Extra sea salt cream — temporary seed price ₱18

## 6. Pickup Configuration

### `pickup_dates`

```text
id uuid primary key
pickup_date date unique
is_open boolean default true
notes text nullable
created_at timestamptz
updated_at timestamptz
```

### `pickup_windows`

```text
id uuid primary key
pickup_date_id uuid references pickup_dates(id)
start_time time
end_time time
is_open boolean default true
sort_order integer
```

### `pickup_locations`

```text
id uuid primary key
name text
description text nullable
is_active boolean default true
sort_order integer
created_at timestamptz
updated_at timestamptz
```

## 7. Inventory

### `daily_inventory`

```text
id uuid primary key
pickup_date date
product_variant_id uuid references product_variants(id)
stock_total integer check stock_total >= 0
stock_reserved integer default 0 check stock_reserved >= 0
stock_sold integer default 0 check stock_sold >= 0
is_available boolean default true
created_at timestamptz
updated_at timestamptz
unique(pickup_date, product_variant_id)
```

Available stock:

```text
stock_total - stock_reserved - stock_sold
```

Optional coating and add-on availability may use separate dated inventory tables if operations need quantity-level tracking; otherwise active/available flags are sufficient for V1.

## 8. Orders

### `orders`

```text
id uuid primary key
order_number text unique
user_id uuid references profiles(id)
status text
payment_status text
customer_name text
customer_email text
customer_mobile text
pickup_date date
pickup_window_id uuid references pickup_windows(id)
pickup_location_id uuid references pickup_locations(id)
customer_notes text nullable
subtotal numeric(10,2)
discount_total numeric(10,2)
total numeric(10,2)
terms_version text
terms_accepted_at timestamptz
payment_expires_at timestamptz nullable
cancelled_at timestamptz nullable
completed_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Order statuses:

```text
PENDING_PAYMENT
PAID
CONFIRMED
PREPARING
READY_FOR_PICKUP
COMPLETED
CANCELLED
EXPIRED
```

Payment statuses:

```text
PENDING
PAID
FAILED
REFUNDED
```

Use database checks or controlled server transitions rather than unrestricted text updates.

## 9. Order Items and Coating Allocations

### `order_items`

```text
id uuid primary key
order_id uuid references orders(id)
product_id uuid references products(id)
variant_id uuid references product_variants(id)
product_name_snapshot text
variant_name_snapshot text
piece_count_snapshot integer
unit_price_snapshot numeric(10,2)
extra_coating_total_snapshot numeric(10,2)
quantity integer check quantity > 0
line_subtotal numeric(10,2)
created_at timestamptz
```

### `order_item_coatings`

```text
id uuid primary key
order_item_id uuid references order_items(id)
coating_id uuid references coatings(id)
coating_name_snapshot text
piece_count integer check piece_count > 0
additional_price_snapshot numeric(10,2)
is_included_type boolean
created_at timestamptz
unique(order_item_id, coating_id)
```

For every order item, the sum of coating piece counts must equal `piece_count_snapshot`. Enforce this through the server transaction and, where practical, a database constraint or deferred trigger.

### `order_item_addons`

```text
id uuid primary key
order_item_id uuid references order_items(id)
addon_id uuid references addons(id)
addon_name_snapshot text
unit_price_snapshot numeric(10,2)
quantity integer check quantity > 0
line_total numeric(10,2)
created_at timestamptz
```

Historical snapshots are required even if products, coatings, or prices later change.

## 10. Payments and Webhooks

### `payments`

```text
id uuid primary key
order_id uuid references orders(id)
provider text default 'paymongo'
provider_checkout_id text nullable
provider_payment_id text nullable
amount numeric(10,2)
currency text default 'PHP'
status text
paid_at timestamptz nullable
refunded_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Do not store card details or unnecessary raw sensitive payloads.

### `payment_webhook_events`

```text
id uuid primary key
provider text
provider_event_id text unique
event_type text
processed_at timestamptz nullable
payload jsonb
created_at timestamptz
```

The unique provider event ID supports idempotent processing.

## 11. Reviews

### `reviews`

```text
id uuid primary key
user_id uuid references profiles(id)
order_id uuid references orders(id) unique
rating integer check rating between 1 and 5
comment text
is_visible boolean default true
is_featured boolean default false
created_at timestamptz
updated_at timestamptz
```

Review creation requires an authenticated owner and a completed order. Public queries expose only safe display data.

## 12. Journal

### `journal_posts`

```text
id uuid primary key
title text
slug text unique
excerpt text nullable
content text
content_type text
cover_image_url text nullable
video_url text nullable
status text check status in ('draft', 'published')
published_at timestamptz nullable
author_id uuid references profiles(id)
created_at timestamptz
updated_at timestamptz
```

Suggested content types:

- `announcement`
- `story`
- `product_feature`
- `video`

Featured reviews remain in `reviews`; do not duplicate them as Journal posts.

## 13. Promotions and Loyalty

### `promotions`

```text
id uuid primary key
name text
type text
is_active boolean
starts_at timestamptz nullable
ends_at timestamptz nullable
config jsonb
created_at timestamptz
updated_at timestamptz
```

### `loyalty_accounts`

```text
id uuid primary key
user_id uuid references profiles(id) unique
completed_order_count integer default 0
updated_at timestamptz
```

### `loyalty_rewards`

```text
id uuid primary key
user_id uuid references profiles(id)
reward_type text
threshold integer
status text
earned_at timestamptz
redeemed_at timestamptz nullable
source_order_id uuid references orders(id)
created_at timestamptz
```

Initial loyalty seed: seven completed orders earn one free 4-piece reward.

## 14. Terms and Settings

### `terms_versions`

```text
id uuid primary key
version text unique
content text
effective_at timestamptz
is_current boolean
created_at timestamptz
```

### `business_settings`

```text
key text primary key
value jsonb
updated_at timestamptz
```

Possible keys:

- `payment_expiry_minutes`
- `pickup_grace_minutes`
- `minimum_lead_days`
- `daily_cutoff_time`
- `support_email`
- `extra_coating_type_price`
- `loyalty_threshold`

Do not store provider secrets or the fixed TsokoLitaw brand identity here.

## 15. RLS and Authorization

Customers may:

- read/update their own profile
- read their own orders and payments
- submit one eligible review for their own completed order
- read public catalog, pickup, promotion, Journal, and visible review data

Customers may not:

- access another customer’s data
- set prices or discounts
- change stock or payment state
- perform admin mutations
- feature or hide reviews

Admin mutations still require server-side authorization even with RLS.

## 16. Seed Data

Seed only through migrations or controlled scripts:

- TsokoLitaw product
- three box variants
- seven coatings
- extra sea salt cream
- initial operational settings
- launch promotion when approved
- loyalty threshold

Do not seed production secrets or pretend mock customer/order records are real data.
