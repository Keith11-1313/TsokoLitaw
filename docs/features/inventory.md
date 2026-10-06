# Pickup and inventory

These are separate Admin responsibilities, feeding the same checkout.

| Mode            | Publication                                           | Prepared stock requirement                                                     |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `MADE_TO_ORDER` | Explicit date/windows/locations, lead time and cutoff | None                                                                           |
| `READY_STOCK`   | Explicit date/windows/locations                       | Prepared pieces for that date                                                  |
| `HYBRID`        | Explicit date/windows/locations                       | Same-day uses prepared pieces; eligible advance orders use made-to-order rules |

Every mode requires website checkout and a configured payment path: PayMongo, Manual GCash, or
tracked Pay at the Counter. No automatic daily availability,
delivery addresses, cash sales, walk-in stock writer, or redundant Inventory availability switch exists.

## Execution paths

Pickup rules contain lead days, daily cutoff and operating hours only. The unused pickup grace
setting was removed and folded into the clean pre-v1 baseline on October 5; it never extended
windows or enforced late/no-show handling. The five-argument `update_pickup_settings` RPC requires
matching application code. Dev was explicitly reset for the consolidated baseline; Production has
not received that reset. Historic audit metadata in older retained environments may include the setting.
The four rule fields share one row on desktop, two columns on tablet, and stack on phones.
Admin rule times are normalized to `HH:mm` when loading the form. The save action also accepts
database-style `HH:mm:00`, normalizes it before validation, and shows field-specific invalid-time
errors. Nonzero seconds and malformed times remain invalid; lead-day/cutoff eligibility is unchanged.

- `/admin/pickup` → `pickup-manager.tsx` → Pickup `actions.ts` → `server-pickup.ts` →
  `upsert_pickup_schedule`, `set_pickup_date_open`, `upsert_pickup_location`, `update_pickup_settings`.
- `/admin/inventory` → `inventory-manager.tsx` → Inventory `actions.ts` → `server-inventory.ts` →
  `upsert_daily_inventory`, `record_inventory_consumption`.
- Checkout reads `server-commerce.ts` published definitions and public inventory projection;
  `pickup.ts` supplies shared date/time helpers. `create_checkout_order` rechecks rules under locks.

SQL definitions are linked in the [RPC map](../architecture/database.md). Schedule structural edits
are blocked once orders or stock depend on them, but publication can be closed/restored.
Inventory attaches only to existing eligible dates; it cannot invent a pickup schedule.
The pickup date editor shows the current operating hours and prevents out-of-range windows before
submission. PostgreSQL remains authoritative and rejects any window outside those hours.

## Piece accounting

The always-visible Stock history section has its own pickup-date selector (independent of the stock editor), showing its latest 50 inventory
adjustments, newest first: signed piece changes, reason, optional note and Manila timestamp.
The reader uses the authenticated Admin RLS policy; no extra database permissions are granted.
Customer order reservations are not adjustment entries. Blank notes display “No note provided.”

`daily_inventory` is per **product and pickup date**. All 4/6/8-piece boxes share the balance.
Requested demand is `quantity × piece count`. Available pieces are
`stock_total - stock_reserved - stock_sold`; consumed/waste quantities use this same balance.
Do not reinterpret stored counter names as separate box inventories.

The exact prepared total cannot fall below accounted-for pieces. A new date starts an independent
balance; it is not a reset of the previous day's row. Admin writes are audited and SQL enforces
nonnegative remaining pieces. Expiry/cancellation releases pieces atomically with state changes;
provider-bound orders require PayMongo expiry first.

The additive `20261006020000_stock_release_snapshots.sql` repairs customer cancellation and both
expiry paths: Hybrid eligibility uses the order's original Manila placement date, never the processing
date. Piece release uses `quantity × piece_count_snapshot`, not the current catalog. Each product is
updated in deterministic order; insufficient/missing reserved inventory aborts the transaction rather
than silently clamping stock to zero. Local `018_stock_release.test.sql` covers cross-midnight,
advance, Ready-stock, Made-to-order, changed-catalog, rollback and retry cases for all three paths.

## Where to change it

Schedule fields: `ScheduleEditor`; business pickup settings: `PickupRules`; locations: `LocationEditor`.
Inventory amounts: `StockEditor`/`ConsumptionForm`. Change customer wording in checkout, but change
eligibility rules in server/SQL together. Tests: local `008_inventory.test.sql`, `009_pickup.test.sql`,
`002_payments.test.sql`, plus responsive form checks and sold-out/concurrent checkout cases.
