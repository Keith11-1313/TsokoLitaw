# TsokoLitaw — Database Design

## 1. Database

Use Supabase PostgreSQL.

---

## 2. Profiles

### `profiles`

```text
id uuid primary key references auth.users(id)
full_name text
email text
mobile_number text nullable
role text default 'customer'
created_at timestamptz
updated_at timestamptz
```

Roles:

- `customer`
- `admin`

---

## 3. Products

### `products`

```text
id uuid primary key
name text
slug text unique
description text
image_url text nullable
is_active boolean
created_at timestamptz
updated_at timestamptz
```

### `product_variants`

```text
id uuid primary key
product_id uuid references products(id)
name text
piece_count integer
price numeric(10,2)
is_active boolean
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Initial seed:

- 4-piece box — 60
- 6-piece box — 85
- 8-piece box — 110

---

## 4. Toppings

### `toppings`

```text
id uuid primary key
name text
additional_price numeric(10,2)
is_active boolean
is_allergen boolean
allergen_note text nullable
sort_order integer
created_at timestamptz
updated_at timestamptz
```

Initial values:

- Grated coconut
- Toasted sesame seeds
- Crushed peanuts
- Cookie crumbs
- Chocolate sprinkles
- Cocoa powder
- Powdered milk

---

## 5. Add-ons

### `addons`

```text
id uuid primary key
name text
price numeric(10,2)
is_active boolean
created_at timestamptz
updated_at timestamptz
```

Initial add-on:

- Extra sea salt cream

---

## 6. Pickup Dates

### `pickup_dates`

```text
id uuid primary key
pickup_date date unique
is_open boolean
notes text nullable
created_at timestamptz
updated_at timestamptz
```

---

## 7. Pickup Locations

### `pickup_locations`

```text
id uuid primary key
name text
description text nullable
is_active boolean
sort_order integer
created_at timestamptz
updated_at timestamptz
```

---

## 8. Inventory

### `daily_inventory`

```text
id uuid primary key
pickup_date date
product_variant_id uuid references product_variants(id)
stock_total integer
stock_reserved integer default 0
stock_sold integer default 0
is_available boolean default true
created_at timestamptz
updated_at timestamptz
unique(pickup_date, product_variant_id)
```

Available:

```text
stock_total - stock_reserved - stock_sold
```

---

## 9. Orders

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
pickup_time time nullable
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

- `PENDING_PAYMENT`
- `PAID`
- `CONFIRMED`
- `PREPARING`
- `READY_FOR_PICKUP`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`

Payment statuses:

- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED`

---

## 10. Order Items

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

quantity integer
line_subtotal numeric(10,2)
free_topping_count integer default 1
created_at timestamptz
```

Historical snapshots are required.

---

## 11. Order Toppings

### `order_item_toppings`

```text
id uuid primary key
order_item_id uuid references order_items(id)
topping_id uuid references toppings(id)

topping_name_snapshot text
price_snapshot numeric(10,2)
is_free boolean
created_at timestamptz
```

---

## 12. Order Add-ons

### `order_item_addons`

```text
id uuid primary key
order_item_id uuid references order_items(id)
addon_id uuid references addons(id)

addon_name_snapshot text
unit_price_snapshot numeric(10,2)
quantity integer
line_total numeric(10,2)
created_at timestamptz
```

---

## 13. Payments

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
raw_reference jsonb nullable
created_at timestamptz
updated_at timestamptz
```

Do not store card details.

---

## 14. Webhook Events

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

Use for idempotency.

---

## 15. Feedback

### `feedback`

```text
id uuid primary key
user_id uuid references profiles(id)
order_id uuid references orders(id)
rating integer check (rating between 1 and 5)
comment text
is_visible boolean default true
created_at timestamptz
updated_at timestamptz
```

Prefer one review per completed order.

---

## 16. Promotions

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

Example:

```json
{
  "buy_boxes": 2,
  "free_pieces": 2
}
```

---

## 17. Loyalty

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
source_order_id uuid references orders(id) nullable
created_at timestamptz
```

Initial rule:

- 7 completed orders → free 4-piece reward

---

## 18. Terms Versions

### `terms_versions`

```text
id uuid primary key
version text unique
content text
effective_at timestamptz
is_current boolean
created_at timestamptz
```

---

## 19. Business Settings

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
- `support_email`
- `free_toppings_per_item`

Do not store secrets here.

---

## 20. RLS

Customers may:

- read/update their own profile
- read their own orders
- submit eligible feedback
- read public products
- read active toppings/add-ons
- read available pickup data
- read visible feedback

Customers may not:

- read another user's order
- change prices
- change stock
- change payment state
- perform admin mutations

Admin operations should still be handled server-side.

---

## 21. Seed Data

Seed:

- TsokoLitaw product
- 4-piece variant
- 6-piece variant
- 8-piece variant
- initial prices
- toppings
- extra sauce
- default settings
- launch promotion
- loyalty threshold
