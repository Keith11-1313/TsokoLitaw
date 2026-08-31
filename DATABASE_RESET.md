# TsokoLitaw Database Reset Runbook

This runbook returns a TsokoLitaw environment to a clean operational state while preserving the accounts, Admin roles, reference catalog, storage assets, secrets, and Cron job definitions that the application still needs.

Use this only for:

- the local Supabase environment;
- the isolated hosted Dev Supabase project; or
- Production before public launch, while it contains no real customer orders or payments.

Do **not** use the hosted reset procedure after launch or when the database contains records that must be retained. Orders, payments, refunds, notifications, reviews, and audit records are intentionally deleted and cannot be recovered without a backup.

## What the hosted reset preserves

The hosted reset does not delete or modify:

- Supabase Auth users;
- `public.profiles`, including Admin roles;
- products, box variants, coatings, and add-ons;
- pickup locations;
- business settings and Terms versions;
- files in Supabase Storage;
- Supabase Vault secrets;
- Supabase Cron job definitions;
- schema migrations, functions, triggers, policies, or indexes.

## What the hosted reset deletes

The reset deletes:

- pickup dates, windows, and their location assignments;
- prepared inventory and inventory adjustments;
- orders and all order-item snapshots;
- payments, refunds, and encrypted manual-refund destinations;
- PayMongo webhook-event records;
- notification deliveries and Resend webhook-event records;
- reviews and Journal posts;
- loyalty account progress and rewards;
- Admin audit logs;
- distributed rate-limit buckets;
- pg_net HTTP response history.

Afterward, the next order number is `TL-0001` and the next pg_net request/response ID is `1`. UUID primary keys remain UUIDs and do not have a numeric counter to reset.

## A. Local database reset

For local development, use the repository reset command instead of the hosted cleanup SQL:

```powershell
npm run db:reset
```

This recreates the local schema from migrations and applies `supabase/seed.sql`.

Validate it afterward:

```powershell
npm run db:lint
npm run db:test
```

Do not use `supabase db reset --linked` for Dev or Production.

## B. Hosted Dev or pre-launch Production reset

Perform every section below in the Supabase Dashboard SQL Editor for the environment being cleaned.

Run the procedure separately for Dev and Production. Never copy Dev data into Production.

### 1. Confirm the selected project

Before running destructive SQL, confirm the project name and project reference shown in the Supabase Dashboard header.

Record the environment you are about to reset:

```text
Environment: Dev / Production
Project name:
Project reference:
Reset date:
Operator:
```

Stop if the selected project is not the intended target.

### 2. Confirm the reset is allowed

For Production, all of these must be true:

- the public launch has not started;
- no real customer order or payment must be retained;
- no PayMongo payment or refund is currently processing;
- no Resend or PayMongo webhook delivery is expected;
- a backup or accepted recovery point exists if any existing data matters.

Once Production accepts real orders, do not use this runbook as routine cleanup.

### 3. Inspect the Cron jobs

```sql
select
  jobid,
  jobname,
  schedule,
  active
from cron.job
order by jobname;
```

Confirm these three jobs exist:

- `tsokolitaw-payment-expirations`
- `tsokolitaw-notification-retries`
- `tsokolitaw-account-deletions`

### 4. Pause the TsokoLitaw Cron jobs

```sql
update cron.job
set active = false
where jobname in (
  'tsokolitaw-payment-expirations',
  'tsokolitaw-notification-retries',
  'tsokolitaw-account-deletions'
)
returning jobid, jobname, active;
```

The result must show the three jobs with `active = false`.

If a later step fails, keep the jobs paused while investigating. Section 9 contains the reactivation SQL.

### 5. Wait for pg_net to finish queued HTTP requests

Wait approximately 15 seconds, then run:

```sql
select count(*) as queued_requests
from net.http_request_queue;
```

Continue only when `queued_requests` is `0`.

If it is greater than zero, wait and run the query again. Do not clear the queue and do not reset its sequence while a request is pending.

### 6. Delete operational application data

Review the preserved and deleted lists at the top of this document again. Then run this entire block at once:

```sql
begin;

truncate table
  public.admin_audit_logs,
  public.inventory_adjustments,
  public.manual_refund_destinations,
  public.notification_webhook_events,
  public.notification_deliveries,
  public.payment_webhook_events,
  public.loyalty_rewards,
  public.loyalty_accounts,
  public.reviews,
  public.journal_posts,
  public.refunds,
  public.payments,
  public.order_item_addons,
  public.order_item_coatings,
  public.order_items,
  public.orders,
  public.daily_inventory,
  public.pickup_window_locations,
  public.pickup_windows,
  public.pickup_dates,
  public.mutation_rate_limit_buckets
restart identity cascade;

alter sequence public.order_number_sequence restart with 1;

commit;
```

`RESTART IDENTITY` resets sequences owned by the truncated tables. `order_number_sequence` is reset explicitly because it generates the shared kiosk-style order number.

### 7. Clear pg_net history and reset its numeric ID

This is operational cleanup only. pg_net normally keeps response rows temporarily, and clearing them is not required for application correctness.

Run this block only after Section 5 returned `0`:

```sql
begin;

lock table net.http_request_queue in access exclusive mode;

do $$
declare
  queued_requests bigint;
begin
  select count(*)
  into queued_requests
  from net.http_request_queue;

  if queued_requests > 0 then
    raise exception
      'Cannot reset pg_net: % HTTP request(s) are still queued',
      queued_requests;
  end if;
end
$$;

delete from net._http_response;

select setval(
  pg_get_serial_sequence(
    'net.http_request_queue',
    'id'
  )::regclass,
  1,
  false
);

commit;
```

The request queue allocates the ID and `_http_response` stores the same ID for the resulting response. Passing `false` to `setval` makes the next request receive ID `1`.

### 8. Verify the clean state before restarting Cron

#### Operational row counts

```sql
select *
from (
  values
    ('admin_audit_logs', (select count(*) from public.admin_audit_logs)),
    ('daily_inventory', (select count(*) from public.daily_inventory)),
    ('inventory_adjustments', (select count(*) from public.inventory_adjustments)),
    ('journal_posts', (select count(*) from public.journal_posts)),
    ('loyalty_accounts', (select count(*) from public.loyalty_accounts)),
    ('loyalty_rewards', (select count(*) from public.loyalty_rewards)),
    ('manual_refund_destinations', (select count(*) from public.manual_refund_destinations)),
    ('mutation_rate_limit_buckets', (select count(*) from public.mutation_rate_limit_buckets)),
    ('notification_deliveries', (select count(*) from public.notification_deliveries)),
    ('notification_webhook_events', (select count(*) from public.notification_webhook_events)),
    ('order_item_addons', (select count(*) from public.order_item_addons)),
    ('order_item_coatings', (select count(*) from public.order_item_coatings)),
    ('order_items', (select count(*) from public.order_items)),
    ('orders', (select count(*) from public.orders)),
    ('payment_webhook_events', (select count(*) from public.payment_webhook_events)),
    ('payments', (select count(*) from public.payments)),
    ('pickup_dates', (select count(*) from public.pickup_dates)),
    ('pickup_window_locations', (select count(*) from public.pickup_window_locations)),
    ('pickup_windows', (select count(*) from public.pickup_windows)),
    ('refunds', (select count(*) from public.refunds)),
    ('reviews', (select count(*) from public.reviews)),
    ('net._http_response', (select count(*) from net._http_response)),
    ('net.http_request_queue', (select count(*) from net.http_request_queue))
) as reset_counts(table_name, row_count)
order by table_name;
```

Every displayed `row_count` must be `0`.

#### Preserved records

```sql
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.products) as products,
  (select count(*) from public.product_variants) as product_variants,
  (select count(*) from public.coatings) as coatings,
  (select count(*) from public.addons) as addons,
  (select count(*) from public.pickup_locations) as pickup_locations,
  (select count(*) from public.business_settings) as business_settings,
  (select count(*) from public.terms_versions) as terms_versions;
```

Confirm the expected reference records and profiles still exist.

Confirm Admin roles:

```sql
select
  id,
  email,
  role,
  is_active
from public.profiles
where role = 'admin'
order by email;
```

Confirm Storage objects were preserved:

```sql
select
  bucket_id,
  count(*) as object_count
from storage.objects
group by bucket_id
order by bucket_id;
```

Confirm Vault secret names were preserved without displaying decrypted values:

```sql
select name, created_at, updated_at
from vault.secrets
order by name;
```

#### Sequence state

```sql
select
  'public.order_number_sequence' as sequence_name,
  last_value,
  is_called
from public.order_number_sequence;

select
  'net.http_request_queue_id_seq' as sequence_name,
  last_value,
  is_called
from net.http_request_queue_id_seq;
```

Both should show `last_value = 1` and `is_called = false`. That means the next generated value will be `1`.

### 9. Reactivate the Cron jobs

```sql
update cron.job
set active = true
where jobname in (
  'tsokolitaw-payment-expirations',
  'tsokolitaw-notification-retries',
  'tsokolitaw-account-deletions'
)
returning jobid, jobname, schedule, active;
```

The result must show all three jobs with `active = true`.

This same statement is the emergency recovery step if the cleanup was stopped after Cron was paused.

### 10. Verify the first scheduled responses

After the next scheduled run, check:

```sql
select
  id,
  status_code,
  error_msg,
  content,
  created
from net._http_response
order by created desc
limit 10;
```

Expected behavior:

- new response IDs begin at `1` and continue upward;
- all three endpoints return HTTP `200`;
- an empty clean database may report zero examined, expired, sent, failed, or deactivated records;
- the exact order of IDs `1`, `2`, and `3` is not guaranteed when multiple jobs run together.

If an endpoint returns `401`, verify that the Vercel environment's `CRON_SECRET` exactly matches the `tsokolitaw_cron_secret` stored in the selected Supabase project's Vault.

## C. Final application checks

After resetting a hosted environment:

1. Open the matching site: Dev must use the Dev Supabase project, and Production must use the Production Supabase project.
2. Sign in with the preserved Admin account.
3. Confirm Admin Catalog still shows the launch products, variants, coatings, add-on, and images.
4. Confirm Admin Pickup has no published dates until an Admin creates one.
5. Confirm Inventory, Orders, Customers activity, Journal, reviews, and notification activity show valid empty states.
6. Create new pickup availability before attempting checkout.
7. Confirm the first new order is `TL-0001`.
8. Confirm no old customer/order data appears in either environment.

## D. Important limitations

- Resetting IDs is cosmetic and is not required for database correctness.
- UUID primary keys remain random UUIDs.
- Existing Supabase Cron `jobid` values are preserved because the jobs themselves are preserved. Do not modify pg_cron's internal job sequence merely to make its IDs start at `1`.
- Supabase Auth user IDs are preserved.
- Storage objects are preserved even when Journal records are deleted. Remove unused Storage files separately only after identifying exact unreferenced objects.
- Cron immediately creates new pg_net response rows after it is reactivated; this is expected.
- Never place this hosted cleanup SQL in a migration or `supabase/seed.sql`.
- Never run it automatically during deployment.
