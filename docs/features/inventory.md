# Pickup and inventory

These are separate Admin responsibilities, feeding the same checkout.

| Mode            | Publication                                           | Prepared stock requirement                                                     |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `MADE_TO_ORDER` | Explicit date/windows/locations, lead time and cutoff | None                                                                           |
| `READY_STOCK`   | Explicit date/windows/locations                       | Prepared pieces for that date                                                  |
| `HYBRID`        | Explicit date/windows/locations                       | Same-day uses prepared pieces; eligible advance orders use made-to-order rules |

Every mode requires website checkout and online payment. No automatic daily availability,
delivery addresses, cash sales, walk-in stock writer, or redundant Inventory availability switch exists.

## Execution paths

- `/admin/pickup` → `pickup-manager.tsx` → Pickup `actions.ts` → `server-pickup.ts` →
  `upsert_pickup_schedule`, `set_pickup_date_open`, `upsert_pickup_location`, `update_pickup_settings`.
- `/admin/inventory` → `inventory-manager.tsx` → Inventory `actions.ts` → `server-inventory.ts` →
  `upsert_daily_inventory`, `record_inventory_consumption`.
- Checkout reads `server-commerce.ts` published definitions and public inventory projection;
  `pickup.ts` supplies shared date/time helpers. `create_checkout_order` rechecks rules under locks.

SQL definitions are linked in the [RPC map](../architecture/database.md). Schedule structural edits
are blocked once orders or stock depend on them, but publication can be closed/restored.
Inventory attaches only to existing eligible dates; it cannot invent a pickup schedule.

## Piece accounting

`daily_inventory` is per **product and pickup date**. All 4/6/8-piece boxes share the balance.
Requested demand is `quantity × piece count`. Available pieces are
`stock_total - stock_reserved - stock_sold`; consumed/waste quantities use this same balance.
Do not reinterpret stored counter names as separate box inventories.

The exact prepared total cannot fall below accounted-for pieces. A new date starts an independent
balance; it is not a reset of the previous day's row. Admin writes are audited and SQL enforces
nonnegative remaining pieces. Expiry/cancellation releases pieces atomically with state changes;
provider-bound orders require PayMongo expiry first.

## Where to change it

Schedule fields: `ScheduleEditor`; business pickup settings: `PickupRules`; locations: `LocationEditor`.
Inventory amounts: `StockEditor`/`ConsumptionForm`. Change customer wording in checkout, but change
eligibility rules in server/SQL together. Tests: local `008_inventory.test.sql`, `009_pickup.test.sql`,
`002_payments.test.sql`, plus responsive form checks and sold-out/concurrent checkout cases.
