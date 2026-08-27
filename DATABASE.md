# TsokoLitaw — Approved Database Design

## 1. Status

The Phase 7 Supabase baseline is implemented as the canonical production bootstrap schema in `supabase/migrations/20260827000000_initial_schema.sql`, with controlled data in `supabase/seed.sql` and pgTAP checks in `supabase/tests/database/000_schema.test.sql`. The repository intentionally keeps one squashed migration for a fresh production project.

The schema and controlled seed have been applied to the linked hosted development project. That project retains the pre-squash migration history; do not replay the repository bootstrap file against it solely to align filenames. Database lint reported no schema errors.

## Decision-to-Schema Mapping

The proposed schema follows `DECISIONS.md` and the current workflow:

| Product decision | Database consequence |
| --- | --- |
| Google email is primary; mobile is optional | `profiles.email` required through Auth identity; `mobile_number` nullable |
| Boxes have 4, 6, or 8 pieces | `product_variants.piece_count`; totals derive from `products.price_per_piece` |
| Choices are coatings, not flavors | dedicated `coatings` table |
| Mixed boxes allocate every piece | `order_item_coatings.piece_count` totals must match the item snapshot |
| First coating type is included | snapshot which type was included and price additional distinct types server-side |
| Admin-managed seed pricing | ₱10 seeds the product's active per-piece price; checkout derives each box total server-side and orders preserve snapshots |
| Campus pickup only | admin-managed dates, windows, locations, lead/cutoff settings, capacity, and historical order snapshots; no delivery address |
| Five admins share one role | bootstrap one approved Google-backed admin now and add up to four later; all authorization remains server-side |
| Cancellation closes at preparation | cancel through `CONFIRMED`; paid cancellation creates a separately tracked refund; prepared/no-show orders are non-refundable |
| Reviews require completed orders | unique review per order plus ownership/status validation |
| Journal supports multiple content types | `journal_posts.content_type`, publication state, and optional media |
| Admin mirrors customer operations | admin mutations update the same catalog, pickup, order, review, and Journal records customers consume |
| Resend sends transactional email | store idempotency keys, provider message IDs, delivery status, and retry metadata without storing provider secrets |

Do not change the bootstrap schema directly from rough reference content. Reconfirm the decision log and business-policy items first, then fold an approved schema refinement into the canonical file.

## 2. Profiles

### `profiles`

```text
id uuid primary key references auth.users(id)
full_name text
email text
mobile_number text nullable
role text default 'customer' check role in ('customer', 'admin')
is_active boolean default true
deletion_requested_at timestamptz nullable
deletion_scheduled_for timestamptz nullable
deactivated_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Google remains the authentication source for email. Admin authorization must be checked server-side.

V1 supports five approved admin profiles using the same `admin` role. One Google identity may be configured initially and the remaining four added later through controlled backend data. Customers cannot assign or modify roles, and client-provided profile metadata must never grant admin access.

The two deletion timestamps are either both null or exactly 90 days apart. Active profiles have a null `deactivated_at`; inactive profiles require it. Authenticated customers use ownership-bound security-definer functions to schedule or cancel deletion; they cannot select a target user. Active orders/refunds block scheduling, and Admin profiles are excluded.

The daily service-role processor selects due active customer profiles, rechecks eligibility, and sets `is_active = false` plus `deactivated_at = now()`. It does not delete or anonymize the Auth identity, profile, orders, reviews, loyalty, notifications, or their links. The profile-to-Auth foreign key uses `on delete restrict` to prevent accidental hard deletion. RLS ownership branches require an active profile, and `is_admin()` also requires the Admin profile to be active.

## 3. Products and Box Variants

### `products`

```text
id uuid primary key
name text
slug text unique
description text
image_url text nullable
price_per_piece numeric(10,2) check price_per_piece >= 0
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
is_active boolean default true
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Initial product price and derived variants:

- base price per piece — ₱10
- 4-piece box — ₱40
- 6-piece box — ₱60
- 8-piece box — ₱80

The box amount is calculated as `product_variants.piece_count × products.price_per_piece`. The initial ₱10 per-piece value produces ₱40, ₱60, and ₱80 totals for the three launch sizes.

Authorized admins update the active product price per piece for future checkout calculations. Historical order-item box-total snapshots remain unchanged.

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

The initial `additional_type_price` is ₱5. It is an Admin-managed seed rather than a fixed business rule, and checkout reloads the active value before calculating the order.

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
availability_mode text check availability_mode in ('MADE_TO_ORDER', 'READY_STOCK', 'HYBRID') default 'MADE_TO_ORDER'
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
capacity integer nullable check capacity >= 0
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

### `pickup_window_locations`

```text
pickup_window_id uuid references pickup_windows(id)
pickup_location_id uuid references pickup_locations(id)
is_open boolean default true
capacity_override integer nullable check capacity_override >= 0
primary key(pickup_window_id, pickup_location_id)
```

This join lets Admin offer one window at one or both campus pickup locations without duplicating the window record.

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

For a `READY_STOCK` or `HYBRID` pickup date, same-day checkout is available only while the corresponding on-hand stock remains available. Admin-recorded walk-in sales must reduce the same daily inventory balance used by online checkout.

### `inventory_adjustments`

```text
id uuid primary key
daily_inventory_id uuid references daily_inventory(id)
quantity_delta integer check quantity_delta <> 0
reason text check reason in ('RESTOCK', 'WALK_IN_SALE', 'WASTE', 'CORRECTION')
created_by uuid references profiles(id)
created_at timestamptz
```

This audit trail keeps school walk-in sales and corrections from silently causing online overselling.

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
pickup_window_snapshot text
pickup_location_snapshot text
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

### `refunds`

```text
id uuid primary key
order_id uuid references orders(id)
payment_id uuid references payments(id)
provider text default 'paymongo'
provider_refund_id text nullable unique
amount numeric(10,2) check amount > 0
currency text default 'PHP'
status text check status in ('REQUESTED', 'PROCESSING', 'REFUNDED', 'FAILED')
method text check method in ('ORIGINAL_PAYMENT_METHOD', 'MANUAL_FALLBACK')
reason text
failure_code text nullable
failure_message text nullable
requested_at timestamptz
processed_at timestamptz nullable
refunded_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

An eligible paid cancellation creates a full refund to the original payment method. The order may already be `CANCELLED` while the refund remains pending. Only a verified provider result may set `REFUNDED`. Manual fallback destination details are collected only after an unsupported or failed PayMongo refund, stored separately with restricted access, and masked in Admin UI.

### `manual_refund_destinations`

```text
id uuid primary key
refund_id uuid unique references refunds(id)
destination_type text check destination_type in ('GCASH', 'MAYA', 'BANK')
account_name text
account_reference_encrypted text
collected_by uuid references profiles(id)
created_at timestamptz
deleted_at timestamptz nullable
```

The account reference must be encrypted by server-only code and is never customer-readable through RLS.

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

### `notification_deliveries`

```text
id uuid primary key
order_id uuid references orders(id) nullable
user_id uuid references profiles(id) nullable
provider text default 'resend'
event_type text
recipient_email text
idempotency_key text unique
provider_message_id text nullable unique
status text
attempt_count integer default 0
last_error text nullable
sent_at timestamptz nullable
delivered_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Transactional email is dispatched only by trusted server code. Resend delivery webhooks must be signature-verified and processed idempotently. Email status is operational metadata and never changes order or payment status by itself.

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
- `default_pickup_capacity`
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

Every public-schema table in the initial migration has RLS enabled. Grants are explicit: anonymous access is limited to publishable catalog/pickup/Journal/Terms data and safe review columns; active authenticated customers receive ownership-scoped reads and profile edits that exclude the `role` and `is_active` columns. Inactive identities receive no ownership-scoped access. Sensitive writes, profile deactivation, and the admin bootstrap function are reserved for trusted server-side code.

The database trigger rejects a sixth admin profile. The service-role-only bootstrap function can promote an approved email only after that Google identity has signed in and created its customer profile.

### `admin_audit_logs`

```text
id uuid primary key
admin_id uuid references profiles(id)
action text
entity_type text
entity_id text nullable
metadata jsonb
created_at timestamptz
```

Later Admin mutations must append audit entries from server-only code.

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
