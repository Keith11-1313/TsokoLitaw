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
Stable slugs, publication timestamps, and audit entries are handled by SQL. Public `/journal`
loads published content plus visible featured order reviews. Reviews remain in `reviews`, not
duplicated Journal posts; moderation actions are under `src/app/admin/reviews/actions.ts`.

## Maintaining an editor

Start with the named editor in the [project map](../architecture/project-map.md), its route action,
and its server module. Keep form validation, dirty-close confirmation, pending state, focus return,
and failed-save error feedback. Do not split each input into its own wrapper or duplicate client/server rules.
Read [shared control contracts](../ui/design.md#forms-and-editors).

The fixed brand, credentials, and arbitrary global settings are not Admin-editable features.
New capabilities require an operational purpose and approval, not just a new table/control.

## Dashboard reporting

The Dashboard defaults to the last seven Manila calendar days through the current time and also
supports 30 days, this month to date, and the complete previous month. Paid sales and paid-order trends use the confirmed
payment timestamp rather than order creation time. Comparisons use the immediately preceding range
of equal length. A zero previous value is presented as new or unchanged instead of a fabricated
percentage.

Admins can also choose an inclusive custom Manila date range of up to 366 days. The sales chart
keeps daily points for short ranges and groups longer ranges into seven-day periods so labels and
values remain readable. Bars expose the exact paid value and order count on pointer hover and
keyboard focus.

Headline KPIs cover paid sales, paid orders, average order value for revenue-bearing orders, and
repeat-buyer share. Zero-total loyalty orders remain paid orders but do not lower average order
value. A returning buyer is an identified customer who paid during the selected period and had a
paid order before that period. These aggregates cover the full selected range and are independent
of the bounded Orders review/recent list.

The supporting sales row uses immutable paid-order item snapshots for boxes and pieces sold,
reports paid add-on value separately from the complimentary per-box extra, and shows sales per
purchasing customer. Product mix groups paid boxes by their saved variant name; payment mix groups
confirmed order value and count by provider. These figures follow the same selected period and
previous-period comparison as the headline KPIs.

Completion rate uses paid orders from the selected payment period and reports how many are now
completed. Cancelled or expired rate uses orders created in the selected period. Average fulfillment
time runs from confirmed payment to completion, and appears only when a completed sample exists.
Coating mix counts immutable paid-order piece allocations; extra mix excludes the complimentary
per-box extra. Review count and average rating follow the selected period. These sections remain
separate from current operational workload such as receipt-review age and upcoming inventory.

The paid-sales chart groups by `payments.paid_at`. The order-outcomes chart is a creation cohort:
it groups orders created during the selected period by their current fulfillment status. Current
active fulfillment, receipts awaiting review, and upcoming available stock are operational counts
and do not inherit the historical reporting filter. Paid sales are order values after discounts,
not profit, provider settlement, or net revenue after fees.

Tests: `editor-contracts.test.tsx`, form/image validation tests, and matching local pgTAP suites,
including `013_dashboard`. Check mobile cards/drawer, tablet editors, desktop
tables, keyboard focus, save/discard/stay, and unsuccessful server mutations.
