# Admin and Journal

Admin remains under `/admin`. Server page guards and each action independently require an active
Admin. `server-<feature>.ts` prepares reads/writes; service-only RPCs validate the actor, input,
and business state, and record audited mutations. Browser visibility is not access control.

| Area      | Entry and implementation                                                          | Customer effect                                                      |
| --------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Dashboard | `/admin`, `dashboard-charts.tsx`, bounded server summaries                        | Read-only operational overview, not lifetime totals                  |
| Orders    | `/admin/orders`, `order-management-table.tsx`, `server-orders.ts`                 | Paid fulfillment, readiness and completed-review eligibility         |
| Catalog   | `/admin/products`, `catalog-manager.tsx`, `server-catalog.ts`                     | Available boxes/coatings/add-ons, images and future prices           |
| Pickup    | `/admin/pickup`, `pickup-manager.tsx`, `server-pickup.ts`                         | Explicit published dates/windows/locations and rules                 |
| Inventory | `/admin/inventory`, `inventory-manager.tsx`, `server-inventory.ts`                | Prepared pieces on existing eligible pickup dates                    |
| Customers | `/admin/customers`, `server-customers.ts`                                         | Support directory with roles, completed-order and loyalty aggregates |
| Journal   | `/admin/journal`, `journal-manager.tsx`, `server-journal.ts`, `server-reviews.ts` | Published posts and moderated community highlights                   |

## Journal flow

`src/app/admin/journal/actions.ts` → `server-journal.ts` → `upsert_journal_post`.
The editor controls type/icon/display date/text, optional cover/video, and draft/published state.
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

Tests: `editor-contracts.test.tsx`, form/image validation tests, and matching local pgTAP suites
`004_admin_orders` through `010_customers`. Check mobile cards/drawer, tablet editors, desktop
tables, keyboard focus, save/discard/stay, and unsuccessful server mutations.
