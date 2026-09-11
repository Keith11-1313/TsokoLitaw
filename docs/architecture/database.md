# Database: rules that intentionally live in SQL

The source of truth is `supabase/migrations/` **in timestamp order**, not the bootstrap alone.
The generated public schema in `src/types/database.generated.ts` helps explore tables/RPC signatures;
SQL is still required to understand grants, RLS, triggers, locks, and business invariants.

## Data families

| Tables                                                                          | Meaning                                                                                |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `profiles`                                                                      | Google-backed identity, protected role, active/deactivation state                      |
| `products`, `product_variants`, `coatings`, `addons`                            | Admin-managed catalog and current prices                                               |
| `pickup_dates`, `pickup_windows`, `pickup_locations`, `pickup_window_locations` | Explicitly published campus availability                                               |
| `daily_inventory`, `inventory_adjustments`                                      | Prepared pieces per product/date and audited changes                                   |
| `orders`, `order_items`, `order_item_coatings`, `order_item_addons`             | Immutable purchase and pickup snapshots                                                |
| `payments`, `payment_webhook_events`, `manual_payment_submissions`              | Provider references, exact totals, reported receipts, deduplicated payment transitions |
| `loyalty_accounts`, `loyalty_rewards`                                           | Completed-order earning and single-use reward binding                                  |
| `reviews`, `journal_posts`                                                      | Completed-order reviews and moderated/published public content                         |
| `notification_deliveries`, `notification_webhook_events`                        | Durable email queue and delivery evidence                                              |
| `terms_versions`, `business_settings`                                           | Current acceptance version and feature-owned operational settings                      |
| `admin_audit_logs`, `mutation_rate_limit_buckets`                               | Audited writes and atomic distributed backpressure                                     |

`auth.users`, Storage, Vault, and Cron are separate Supabase schemas/services. A public data-only
dump is not a complete backup of those services or their files.

## Important function definitions and callers

All functions below are defined in `supabase/migrations/20260911010000_pre_v1_baseline.sql`.

| Function(s)                                                                                          | Application caller / trigger           | Current definition                   | Invariant protected                                                                                           |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `create_checkout_order`                                                                              | `server-checkout.ts`                   | `20260911010000_pre_v1_baseline.sql` | Lock profile/pickup/inventory/reward, idempotent order graph and snapshots; zero-total loyalty settlement     |
| `prepare_paymongo_checkout`, `attach_paymongo_checkout`, `process_paymongo_paid_event`               | `server-payment.ts`, PayMongo route    | Initial                              | One payment, immutable checkout reference, exact provider/order/amount match and paid deduplication           |
| `expire_pending_orders`, `expire_paymongo_order`                                                     | Checkout writer / expiration processor | `20260911010000_pre_v1_baseline.sql` | Expired order and failed payment stay consistent; provider-bound release requires provider-first coordination |
| `list_due_paymongo_checkouts`                                                                        | `server-payment.ts`                    | Initial                              | Bounded due provider references                                                                               |
| `prepare_order_cancellation`                                                                         | `server-cancellation.ts`               | `20260911010000_pre_v1_baseline.sql` | Ownership and unpaid-only eligibility                                                                         |
| `cancel_unpaid_order`                                                                                | `server-cancellation.ts`               | `20260911010000_pre_v1_baseline.sql` | Locked unpaid transition and exact piece/reward release                                                       |
| `upsert_daily_inventory`, `record_inventory_consumption`                                             | `server-inventory.ts`                  | `20260911010000_pre_v1_baseline.sql` | Date-specific piece balance, nonnegative remaining quantity, Admin/audit checks                               |
| `upsert_catalog_coating`                                                                             | `server-catalog.ts`                    | `20260911010000_pre_v1_baseline.sql` | Per-piece price and active default, validated audited Admin write                                             |
| `update_catalog_product`, `update_catalog_variant`, `upsert_catalog_addon`                           | `server-catalog.ts`                    | Initial                              | Validated audited Admin catalog changes                                                                       |
| `upsert_pickup_schedule`, `set_pickup_date_open`, `upsert_pickup_location`, `update_pickup_settings` | `server-pickup.ts`                     | Initial                              | Published options, structural edit locks for dependent orders/stock, Admin audit                              |
| `get_public_pickup_settings`, `get_public_pickup_inventory`                                          | `server-commerce.ts`                   | Initial                              | Customer-safe read projections, not reservation authority                                                     |
| `transition_order_status`, `sync_completed_order_loyalty`                                            | `server-orders.ts` / order trigger     | Initial                              | Paid forward-only fulfillment and once-only threshold earning                                                 |
| `submit_order_review`, `moderate_order_review`, `upsert_journal_post`                                | Reviews/Journal server modules         | Initial                              | Completed-order ownership/uniqueness, controlled publication and Admin audit                                  |
| `get_admin_customer_summaries`                                                                       | `server-customers.ts`                  | Initial                              | Bounded authorized account/order/loyalty read                                                                 |
| `enqueue_transactional_order_email`                                                                  | Database triggers                      | Initial                              | Durable unique event keys from committed transitions                                                          |
| `process_resend_delivery_event`                                                                      | Resend route / sender reconciliation   | Initial                              | Event deduplication, newer delivery evidence only                                                             |
| `request_account_deletion`, `cancel_account_deletion`, `deactivate_due_account`                      | Profile actions / daily Cron           | Initial                              | 90-day grace, eligibility recheck, retained relationships and inactive access denial                          |
| `consume_mutation_rate_limit`, `prune_mutation_rate_limit_buckets`                                   | Rate-limit module / daily Cron         | Initial                              | Atomic shared counts, hashed identifiers, bounded retention                                                   |
| `is_admin`, `is_active_user`, `promote_admin_by_email`                                               | Policies / controlled bootstrap        | Initial                              | Active-role authorization; role promotion is not customer-editable                                            |

The pre-v1 baseline removes discarded migration markers, refund tables/functions/types,
phone fields, and the old checkout overload. `discount_total` remains active loyalty data.
Auth triggers, Storage bucket definitions, RLS, grants and atomic transitions are retained.

## Rules not to reproduce as client-side writes

`create_checkout_order` is the single atomic writer for both payment methods and loyalty.
`submit_manual_payment` / `review_manual_payment` own manual transitions.
`manual_payment_submissions` has owner/Admin read RLS. Its `reported_*` columns make the
customer-entered receipt claims distinct from verified `payments` data, and approved reported
references are unique.

- Inventory uses `stock_total - stock_reserved - stock_sold`, in **pieces**, shared across all box sizes.
  Existing consumed/waste and committed values constrain reductions. A new date has a new balance.
- Checkout and release must remain atomic with order/reward state. A read-then-update stock sequence oversells.
- Signed payment verification must match stored references and amount in one idempotent transition.
- Role, active-state, ownership, and review eligibility require database/server enforcement, not UI controls.
- Historical snapshots are not recalculated from the current catalog.

See [migration workflow](../operations/database-migrations.md) and [tests](../maintenance/testing.md).
