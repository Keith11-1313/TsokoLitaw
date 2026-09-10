# Project map

Paths below are relative to the repository root. Use `@/` for imports from `src/`.

| Directory / file                                      | What you maintain here                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `src/app/<route>/page.tsx`                            | Route composition, metadata, server loading and guards             |
| `src/app/<route>/actions.ts`                          | Server mutation entry points and request validation                |
| `src/app/api/`                                        | Signed webhooks and secret-protected Cron handlers                 |
| `src/components/`                                     | Feature UI; `ui/` contains shared controls                         |
| `src/hooks/`                                          | Form gate, editor lifecycle, and other shared interaction behavior |
| `src/lib/server-<feature>.ts`                         | Server-only reads, trusted writes, provider coordination           |
| `src/lib/commerce.ts`, `pickup.ts`, `order-status.ts` | Shared pure calculations and display rules, not permission grants  |
| `src/lib/auth.ts`, `supabase/`, `src/proxy.ts`        | Identity guards, typed client choices, cookie refresh              |
| `src/lib/paymongo*.ts`, `resend-webhook.ts`           | Provider contracts, mode checks and signature handling             |
| `src/types/`                                          | Hand-maintained UI/domain types plus generated schema boundary     |
| `supabase/migrations/`                                | Applied schema and subsequent transactional SQL definitions        |
| `supabase/tests/database/`                            | Local pgTAP invariants and permission checks                       |
| `scripts/`                                            | Controlled Admin bootstrap and database type generator             |
| `tests/performance/`                                  | Staged k6 workloads and their runbook                              |
| `src/app/globals.css`                                 | Shared visual tokens and global styles                             |
| `public/brand/`, `public/images/`, `public/videos/`   | Local brand and Home media; catalog media is in Supabase Storage   |
| `references/`                                         | Rough historical artwork, not page assets or current requirements  |

## Dense files: where to look inside

- `catalog-manager.tsx`: `ProductSettings`, `VariantCard`, `CoatingEditor`, `AddonEditor`.
- `pickup-manager.tsx`: `ScheduleEditor`, `PickupRules`, `LocationEditor`, `PickupDateCard`.
- `inventory-manager.tsx`: `StockEditor`, `ConsumptionForm`, `PublishStockModal`.
- `journal-manager.tsx`: `JournalEditor` plus the publication list.
- `order-management-table.tsx`: `FulfillmentAction` plus mobile/desktop read presentations.
- `checkout-content.tsx`: submission/idempotency, customer and pickup state, reward selection.
  `checkout-order-summary.tsx` owns receipt presentation and cart-to-receipt mapping.

The Admin editors are already named local components with their own form state. Their size alone
is not a reason to add more files/hooks. Extract one when its responsibility genuinely needs separate
maintenance, not one wrapper per JSX fragment.

## Generated versus manual

- **Generated:** `src/types/database.generated.ts`; regenerate using `npm run db:types` after SQL changes.
- **Manual:** `src/types/database.ts`; explicit nullable RPC argument overrides only. Other domain types remain manual.
- **Generated:** `src/bones/`; regenerate with `npm run skeleton:build` against the non-customer fixture.
  Registry output remains generated even though the root layout imports it.
- **Manual:** the loading fixture and `src/components/layout/app-loading-skeleton.tsx`.
- Lockfiles are tool-maintained; `.next/` and `node_modules/` are build/install output.

Legacy `/vlog`, `/feedback`, and older Admin routes are intentional compatibility redirects, not
dead pages. Historical refund handlers and browser-cart compatibility fields protect old data.
Do not remove them solely because no current UI creates that data.
