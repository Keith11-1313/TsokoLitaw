# Admin and Journal

Admin remains under `/admin`. Server page guards and each action independently require an active
Admin. `server-<feature>.ts` prepares reads/writes; service-only RPCs validate the actor, input,
and business state, and record audited mutations. Browser visibility is not access control.

| Area      | Entry and implementation                                                          | Customer effect                                                      |
| --------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Dashboard | `/admin`, `dashboard-charts.tsx`, `server-dashboard.ts`                           | Period KPIs plus a separate current operational overview             |
| Orders    | `/admin/orders`, `order-management-table.tsx`, `server-orders.ts`                 | Paid fulfillment, readiness and completed-review eligibility         |
| Catalog   | `/admin/products`, `catalog-manager.tsx`, `server-catalog.ts`                     | Available boxes/coatings/add-ons, images and future prices           |
| Pickup    | `/admin/pickup`, `pickup-manager.tsx`, `server-pickup.ts`                         | Explicit published dates/windows/locations and rules                 |
| Inventory | `/admin/inventory`, `inventory-manager.tsx`, `server-inventory.ts`                | Prepared pieces on existing eligible pickup dates                    |
| Customers | `/admin/customers`, `server-customers.ts`                                         | Support directory with roles, completed-order and loyalty aggregates |
| Journal   | `/admin/journal`, `journal-manager.tsx`, `server-journal.ts`, `server-reviews.ts` | Published posts and moderated community highlights                   |

## Journal flow

Orders also owns [Manual GCash verification](payments.md#manual-gcash): open the payment review
from the order's payment status, inspect the receipt in the focused review dialog and compare it
with the actual receiving account, then approve or reject with a reason.
This is an audited active-Admin operation; it is not a separate Payments page. Review items remain
reserved until a decision. The list includes a bounded review queue as well as recent orders.

`src/app/admin/journal/actions.ts` → `server-journal.ts` → `upsert_journal_post`.
The editor controls type/display date/text, optional cover/video, and draft/published state.
Video posts require a secure video URL. Published cards use the summary (or a compact
content fallback) and link by stable slug to a full public post page; drafts are not publicly readable.
Cover uploads use `journal-media` and validated JPG/PNG/WebP ≤3 MiB (square not required).
The editor previews a selected local cover before Save; persistence and publication still occur only
after a successful server action.
Stable slugs, publication timestamps, and audit entries are handled by SQL. Public `/journal`
loads published content plus visible featured order reviews. Reviews remain in `reviews`, not
duplicated Journal posts; moderation actions are under `src/app/admin/reviews/actions.ts`. The review
queue intentionally exposes one publication action: `Publish in Journal` sets the required visible and
featured state together, while `Remove from Journal` clears both. This avoids unsupported intermediate
visibility states in the Admin interface.

## Maintaining an editor

Start with the named editor in the [project map](../architecture/project-map.md), its route action,
and its server module. Keep form validation, dirty-close confirmation, pending state, focus return,
and failed-save error feedback. Do not split each input into its own wrapper or duplicate client/server rules.
Read [shared control contracts](../ui/design.md#forms-and-editors).

The fixed brand, credentials, and arbitrary global settings are not Admin-editable features.
New capabilities require an operational purpose and approval, not just a new table/control.

## Dashboard reporting

The Dashboard defaults to the last seven Manila calendar days through the current time and also
supports 30 days, this month to date, and the complete previous month. Paid sales and paid-order
trends use the confirmed payment timestamp rather than order creation time. Fixed-day presets compare
equivalent Manila calendar windows, month-to-date compares the same elapsed portion of the preceding
month, and custom ranges use the immediately preceding equal-length range. A zero previous value is
presented as new or unchanged instead of a fabricated percentage.

Admins can also choose an inclusive custom Manila date range of up to 366 days. The sales trend keeps
daily points for short ranges, groups medium ranges into dated seven-day periods, and groups long
ranges by month. Revenue and paid-order volume have separate plots rather than an ambiguous dual
axis. A visible expandable table provides every exact value without hover or color dependence.

Headline KPIs cover paid sales, paid orders, average order value for revenue-bearing orders, and
repeat-buyer share. Zero-total loyalty orders remain paid orders but do not lower average order
value. A returning buyer is an identified customer who paid during the selected period and had a
paid order before that period. These aggregates cover the full selected range and are independent
of the bounded Orders review/recent list.

The supporting row surfaces paid-extra sales, sales per purchasing customer, new-customer count,
matured fulfillment completion, and cancelled-or-expired share. Product volume still reports boxes
and pieces from immutable snapshots. Product mix groups paid boxes by saved variant name; payment
mix groups confirmed order value and count by provider.

Completion rate uses paid orders from the selected payment period whose pickup date has passed and
reports how many are now completed; future-pickup orders do not count as failures. Cancelled or
expired rate uses orders created in the selected period. Payment-to-completion duration is labelled
literally and includes its sample size; it is not presented as preparation speed.
Coating mix counts immutable paid-order piece allocations; extra mix excludes the complimentary
per-box extra. Review count and average rating follow the selected period. These sections remain
separate from current operational workload such as receipt-review age and upcoming inventory.

The paid-sales chart groups by `payments.paid_at`. The conversion funnel follows one creation cohort
from created to paid to completed and separately reports cancelled/expired orders. Current active
fulfillment, overdue/due/ready orders, receipt review, counter-payment and review-moderation queues do
not inherit the historical reporting filter. Upcoming prepared stock is shown per open pickup date
and labels made-to-order dates separately. Paid sales are order values after discounts, not profit,
provider settlement, or net revenue after fees.

The dashboard receives lightweight recent orders and configuration counts from its authorized RPC;
it does not load full nested Orders, Catalog, Pickup and Journal datasets. Required RPC fields are
validated and an incomplete deployment contract fails visibly instead of silently becoming zero.

Tests: `editor-contracts.test.tsx`, form/image validation tests, and matching local pgTAP suites,
including `013_dashboard`. Check mobile cards/drawer, tablet editors, desktop
tables, keyboard focus, save/discard/stay, and unsuccessful server mutations.

### Dashboard simulation fixture

`supabase/fixtures/dashboard-simulation.sql` is an opt-in, repeatable local/disposable-Dev fixture,
not a migration and not part of `supabase/seed.sql`. It refreshes only its own tagged records and
creates 60 synthetic customers plus 360 orders over about 120 days. The distribution exercises paid
sales, returning customers, box/coating/payment mix, completion and cancellation, current fulfillment,
Manual GCash review, counter payment, review moderation, and upcoming inventory. Synthetic recipients
use the reserved `.invalid` domain, and the fixture removes their notification deliveries before commit.
It does not create or promote an Admin identity; use the normal controlled Admin bootstrap separately.

The SQL refuses to run unless the same session explicitly sets both guards:

```sql
set app.dashboard_fixture_scope = 'local'; -- or 'disposable-dev'
set app.dashboard_fixture_commit = 'true';
\i supabase/fixtures/dashboard-simulation.sql
```

Run it through `psql` from the repository root so `\i` resolves correctly. Confirm the exact database
before using `disposable-dev`; never enable or run this fixture against Production. Rerunning the file
replaces the previous simulation set while preserving unrelated records. The simulated Manual GCash
receipt paths deliberately have no Storage objects, so the dashboard queue is populated without
uploading fake files or suggesting that a receipt has been verified. Set
`app.dashboard_fixture_commit` to `false` for a full constraint-validating dry run; its final deliberate
exception aborts and rolls back every simulated record.

When local Supabase is running and host `psql` is unavailable, confirm the database container returned
by `docker ps` before using the current local project command:

```powershell
Get-Content supabase/fixtures/dashboard-simulation.sql -Raw |
  docker exec -i supabase_db_tsokolitaw psql -v ON_ERROR_STOP=1 -U postgres -d postgres `
    -c "set app.dashboard_fixture_scope = 'local'; set app.dashboard_fixture_commit = 'true';" -f -
```

This command is for the local Docker database only. It is not the hosted-Dev procedure.
