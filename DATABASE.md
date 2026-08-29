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
| Campus pickup only | admin-managed dates, windows, locations, lead/cutoff settings, and historical order snapshots; no delivery address |
| Five admins share one role | bootstrap one approved Google-backed admin now and add up to four later; all authorization remains server-side |
| Cancellation closes at preparation | cancel through `CONFIRMED`; paid cancellation creates a separately tracked refund; prepared/no-show orders are non-refundable |
| Reviews require completed orders | unique review per order plus ownership/status validation |
| Review publication is moderated | new reviews are hidden by default; service-only Admin moderation controls visibility/featured state and creates audit records |
| Journal supports multiple content types | `journal_posts.content_type`, publication state, and optional media |
| Admin mirrors customer operations | admin mutations update the same catalog, pickup, order, review, and Journal records customers consume |
| Fulfillment is forward-only | `transition_order_status` locks the order, requires an active Admin and paid order, permits only `CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED`, and writes an audit record |
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

The application validates coating media before upload. Customer catalog images use a square 1:1 presentation; `catalog-media` accepts only JPG, PNG, or WebP files up to 3 MB, while the Admin client rejects non-square dimensions before submission. Database `image_url` stores only the resulting approved asset location, never a browser data URL.

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
primary key(pickup_window_id, pickup_location_id)
```

This join lets Admin offer one window at one or both campus pickup locations without duplicating the window record.

`pickup_dates` is the source of truth for whether a date exists and whether it is published. Every mode requires a row plus at least one eligible window/location combination. Admin Pickup owns these records. Admin Inventory must not create them; it may attach prepared stock only to an upcoming `READY_STOCK` or `HYBRID` date. `MADE_TO_ORDER` needs no `daily_inventory` record.

Pickup writes use service-role-only `upsert_pickup_schedule`, `set_pickup_date_open`, and `update_pickup_settings` functions. Each rechecks the active Admin and writes `admin_audit_logs`. A schedule with an order or `daily_inventory` dependency cannot have its date, mode, windows, or locations rewritten; its publication state may still be closed or restored. `get_public_pickup_settings` exposes customer-safe lead-time, cutoff, grace-period, and operating-hour values. `get_public_pickup_inventory` exposes the active product's remaining prepared pieces by eligible date for Checkout guidance. The atomic order writer independently rechecks all rules and stock so cached guidance cannot authorize an oversell.

## 7. Inventory

### `daily_inventory`

```text
id uuid primary key
pickup_date date
product_id uuid references products(id)
stock_total integer check stock_total >= 0
stock_reserved integer default 0 check stock_reserved >= 0
stock_sold integer default 0 check stock_sold >= 0
is_available boolean default true
created_at timestamptz
updated_at timestamptz
unique(pickup_date, product_id)
```

Available stock:

```text
stock_total - stock_reserved - stock_sold
```

Stock is counted in individual prepared Palitaw pieces, not boxes. Every 4-, 6-, and 8-piece box draws from the same product balance for its pickup date. For example, 10 available pieces can fulfill two 4-piece boxes and leave 2 pieces. For a `READY_STOCK` or same-day `HYBRID` pickup date, checkout reserves `box quantity × variant piece count` atomically. Admin-recorded waste reduces the same daily balance used by online checkout. All sales use website checkout and online payment.

`stock_total` is the exact prepared-piece upper limit for that date and product. It is not a global total and is never carried into another date. The database constraint `stock_reserved + stock_sold <= stock_total` explains why Admin cannot lower a total below pieces already committed or removed. For example, 84 reserved plus 8 removed means the existing record's lowest valid total is 92; publishing 50 belongs on a different pickup date with a new independent inventory row.

`is_available` remains an internal reservation guard for compatibility, defaults to true, and is not presented as an independent Admin Inventory checkbox. Customer availability is governed operationally by the pickup date/window publication state and sufficient remaining pieces.

### `inventory_adjustments`

```text
id uuid primary key
daily_inventory_id uuid references daily_inventory(id)
quantity_delta integer check quantity_delta <> 0
reason text check reason in ('RESTOCK', 'WASTE', 'CORRECTION')
created_by uuid references profiles(id)
created_at timestamptz
```

This audit trail keeps waste, restocks, and corrections from silently causing online overselling. Controlled Admin mutations reject a total below already committed or consumed pieces.

Optional coating and add-on availability may use separate dated inventory tables if operations need quantity-level tracking; otherwise active/available flags are sufficient for V1.

## 8. Orders

### `orders`

```text
id uuid primary key
order_number text unique, generated from the global `order_number_sequence` as `TL-0001`
user_id uuid references profiles(id)
checkout_idempotency_key uuid nullable
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

`discount_total` remains as a zero-valued historical accounting field for order and payment compatibility. TsokoLitaw does not expose an active Promotions feature.

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

`(user_id, checkout_idempotency_key)` is unique when both values are present. The browser creates a UUID for one checkout attempt and reuses it on retries; the atomic writer returns the existing order instead of inserting a duplicate.

`order_number_sequence` generates a short, concurrency-safe kiosk number such as `TL-0001`. The same stored value is shown to the customer and to Admin operations; it is never generated separately in either UI.

The service-role-only `create_pending_order` function is the transaction boundary for Phase 9. Next.js first reloads the active catalog and calculates trusted snapshot values, then the function expires overdue unpaid orders, locks the signed-in profile and pickup window, rechecks account and pickup eligibility, enforces bounded order quantities, reserves ready stock when required, inserts the order and all item/coating/add-on snapshots, and records the current Terms version. Active admins may place their own storefront orders because the server action always binds `target_user_id` to the authenticated profile; it cannot submit for an arbitrary customer. The service-role-only `expire_pending_orders` function directly expires only overdue orders that do not have an attached active provider checkout. Provider-bound orders use the coordinated PayMongo expiry functions described below. Authenticated browser clients cannot execute these functions directly.

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
provider_checkout_url text nullable
provider_payment_id text nullable
amount numeric(10,2)
currency text default 'PHP'
status text
paid_at timestamptz nullable
refunded_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

Each order has at most one payment row. The service-only checkout initializer creates or returns that row, and the provider checkout ID/URL can be attached only once. PayMongo checkout creation uses the payment UUID as the stable idempotency source. A signed paid webhook must match the stored checkout ID, order UUID, kiosk order number, PHP currency, and exact server total before the payment and order transition atomically.

`list_due_paymongo_checkouts` exposes only overdue pending provider references to trusted server code. After the server successfully expires a checkout through PayMongo, `expire_paymongo_order` locks and rechecks the exact payment/order pair before marking the payment `FAILED`, the order `EXPIRED`, and releasing applicable ready-stock reservations. If provider expiry fails or a paid webhook wins the race, the expiry transition does not release stock.

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

Service-only cancellation functions lock and recheck ownership, fulfillment state, payment state, and provider references. An attached unpaid checkout must be expired through PayMongo before `cancel_unpaid_order` releases its reservation. A paid cancellation atomically sets the order to `CANCELLED` and creates one full `REQUESTED` refund while leaving payment state `PAID`. The authenticated PayMongo create-refund response or an idempotently processed signed refund webhook may advance the refund to `PROCESSING`, `REFUNDED`, or `FAILED`; terminal success also changes the payment and order payment snapshot to `REFUNDED`.

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

The account reference is encrypted with AES-256-GCM by server-only code and is never customer-readable through RLS. The fallback writer accepts a destination only for an owned, cancelled order whose original-method refund has already failed.

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

The unique provider event key supports idempotent processing. For PayMongo Hosted Checkout paid events, the key is derived from the event type, checkout-session ID, and provider payment ID so it remains stable even when the current v2 webhook envelope does not expose a separate `evt_*` identifier. Only a reduced, non-billing event summary is retained; raw webhook payloads containing customer billing data are not stored.

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
is_visible boolean default false
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
icon_key text
display_date date
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

`upsert_journal_post` is executable only by trusted server code. It verifies an active Admin, validates content/type/icon/date values, preserves stable slugs during edits, controls publication timestamps, and records `journal.created` or `journal.updated` in `admin_audit_logs`. Optional cover images are stored in the public-read `journal-media` bucket with a 3 MB limit and an image-only MIME allowlist.

## 13. Loyalty

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
redeemed_order_id uuid references orders(id) nullable unique
created_at timestamptz
```

Initial loyalty rule: seven completed orders earn one free 4-piece reward. An order-completion trigger locks the customer's loyalty account, increments the count once, and creates the threshold reward. The atomic checkout writer locks an earned reward, verifies an eligible 4-piece line, binds it through `redeemed_order_id`, and discounts only that line's base price. Cancelled or expired redemption orders restore the reward. Zero-total reward orders record a paid `loyalty` settlement without PayMongo. The bounded Admin customer summary reports the configured threshold plus available and redeemed reward counts; redeemed counts exclude rewards restored after cancellation or expiry. The account summary includes customer and Admin profiles and returns each role so the UI can label them explicitly.

## 14. Terms and Operational Configuration

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

Internal keys owned by their operational feature:

- `payment_expiry_minutes`
- `pickup_grace_minutes`
- `minimum_lead_days`
- `daily_cutoff_time`
- `extra_coating_type_price`
- `loyalty_threshold`

Do not expose this table as a generic Admin Settings form. Pickup Management owns pickup keys; future Loyalty work owns its threshold. Do not store provider secrets or the fixed TsokoLitaw brand identity here.

### `mutation_rate_limit_buckets`

```text
bucket_key_hash text
window_started_at timestamptz
request_count integer
updated_at timestamptz
primary key (bucket_key_hash, window_started_at)
```

Expensive customer mutations use this table as a distributed fixed-window limiter shared by every Vercel instance. The application sends SHA-256 hashes for the authenticated user and request IP; raw user identifiers and IP addresses are never stored in the bucket. `consume_mutation_rate_limit` performs the increment and decision atomically and is executable only by `service_role`. RLS is enabled with no anonymous or authenticated table access. The daily trusted account-deletion job also invokes the service-only prune function to remove buckets older than two days.

Rate limiting is backpressure, not an authorization boundary. Every mutation must still enforce authentication, ownership, valid state transitions, idempotency, and database constraints.

## 15. RLS and Authorization

Customers may:

- read/update their own profile
- read their own orders and payments
- submit one eligible review for their own completed order
- read public catalog, pickup, Journal, and visible review data

Customers may not:

- access another customer’s data
- set server-authoritative prices or totals
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
- loyalty threshold

Do not seed production secrets or pretend mock customer/order records are real data.
