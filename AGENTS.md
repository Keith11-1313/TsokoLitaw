# TsokoLitaw — agent instructions

## Read the relevant material, not every document

1. Read this file and [docs/index.md](docs/index.md).
2. New to the project? Read [onboarding](docs/getting-started/onboarding.md).
3. Inspect the existing code/assets and only the guides needed for the task:

| Work                     | Read                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI only                  | [Design/contracts](docs/ui/design.md) and the relevant feature guide                                                                                        |
| Checkout                 | [Checkout](docs/features/checkout.md), [inventory](docs/features/inventory.md), [payments](docs/features/payments.md)                                       |
| Database                 | [Database/RPC map](docs/architecture/database.md), [migrations](docs/operations/database-migrations.md), [change safety](docs/maintenance/change-safety.md) |
| Payments                 | [Payments](docs/features/payments.md), [webhooks](docs/operations/webhooks.md), [order states](docs/features/orders.md)                                     |
| Auth                     | [Authentication](docs/features/authentication.md), [boundaries](docs/architecture/client-server-boundaries.md)                                              |
| Deployment/configuration | [Environments](docs/getting-started/environments.md), [deployment](docs/operations/deployment.md)                                                           |
| Product workflow change  | [Current decisions](docs/product/decisions.md) plus affected feature guides                                                                                 |

Latest explicit owner decisions override rough references. Do not restore superseded behavior.
Update the affected current guide when behavior changes; do not recreate duplicate root specifications.

## Current scope

Owner decision (September 11, 2026): the entire application is pre-release until the required
Android APK is completed and accepted as v1.0. A Vercel environment named Production is not a
product-release milestone. Existing test records need not be retained. Prefer a clean database
baseline over compatibility solely for disposable pre-release data. A coordinated rebaseline may
replace migration history after dependency review and local validation; confirm the exact hosted
project and destructive scope before resetting it. Never infer that provider funds are disposable.

Phase 13 production/security is complete; Phase 14 UI stabilization is in progress.
Phase 15 is the approved thin TWA Android APK after UI stability. Optional Phase 16 is public-page
aggregate Web Analytics after APK stability. See [roadmap](docs/roadmap.md); planned features are not implemented.

Keep one Next.js application with Admin under `/admin`, suited to a campus business of roughly
1,000 customers. Avoid unnecessary dependencies, services, repositories/factories, generic layers,
or speculative abstractions. Readability cleanup must not redesign working architecture.

## Critical invariants — never weaken these

- Verify active authenticated identity and ownership on the server. Check Admin authorization on
  every protected page and mutation. UI visibility is not authorization.
- Preserve Supabase RLS and explicit grants. Never expose privileged Supabase, PayMongo, Resend,
  webhook or Cron secrets to browser code, logs or Git.
- Browser prices, cart state, role claims and payment redirects are not authoritative.
  Reload/recalculate checkout prices server-side; retain immutable item and pickup snapshots.
- Keep order creation, inventory/reward locks, releases, state transitions and deduplication atomic
  in PostgreSQL. Do not replace them with app-side read/update sequences.
- Verify PayMongo signatures over the raw body, match environment mode, provider references and
  exact PHP totals, and process events idempotently. Provider checkout expiry must precede
  release of a provider-bound unpaid reservation.
- Keep payment and fulfillment state separate. Website cancellation is pending-unpaid only.
  Paid concerns are settled in person; no new refund API or destination collection.
  The retired refund subsystem was removed in the pre-v1 baseline. Hosted Dev
  `mgkzphpznamjlgrpumjd` was rebaselined with approved Auth/test-data/Storage disposal on
  September 11, 2026. Its app Cron jobs remain paused pending matching code activation;
  follow the database migration runbook. This is not ongoing reset permission.
  Production `zkmlzktvjkjrbznvrsxb` is untouched and not approved for reset or baseline push.
- Preserve bounded validation, distributed rate limiting, provider timeouts, notification claim/
  retry/idempotency rules, and audit records. Email delivery never changes payment state.
- Dev and Production have separate Vercel projects, Supabase data/Auth/Storage, credentials,
  provider modes, webhooks and Cron. Git branch selection is not an environment safeguard.
  A Git merge/deployment never applies SQL.
- For ordinary incremental deployment, applied migrations are immutable. The approved pre-release
  rebaseline is a separate coordinated replacement, not a normal db push or blind history repair.
  Validate locally first; resetting either hosted environment requires exact-target confirmation.

## Product rules to preserve

PHP; 4/6/8-piece boxes; coatings, not flavors. Every piece adds its coating's persisted per-piece
price; mixed allocations total the box size. Exactly one active coating is the default.
All active Admin-managed add-ons feed the builder; server reloads current values.

Campus pickup only. Every sellable date/window/location is explicitly published in Admin Pickup.
Made to order follows lead/cutoff rules; Ready stock needs date-specific prepared pieces; Hybrid
uses prepared stock for same-day orders. Every mode uses website checkout and online payment.
No cash/untracked walk-in flow or redundant Inventory availability switch.

Inventory assigns prepared pieces to existing eligible dates, shared by every box size.
It does not create schedules; a prepared total cannot fall below committed/consumed pieces.
Each date has an independent balance. Historical snapshots must not follow later catalog/pickup edits.

Customer navigation is Home, Our Creations, Journal; Profile and Cart are actions.
Customer contact is email-only; do not reintroduce unused mobile-number collection.
My Orders belongs inside Account. Reviews originate only from owned completed orders and require
moderation for public visibility. Admin has one equal-permission role with at most five approved identities.

## Implementation

- Next.js App Router, strict TypeScript, existing Tailwind tokens. Prefer Server Components unless
  interaction requires a client. Use type-only imports across DTO boundaries, not runtime server imports.
- Inspect existing shared components before adding variants. Keep mobile/tablet/desktop and
  semantic labels, keyboard, focus, error and pending states usable.
- Use shared/persisted domain sources, not contradictory page-local constants. Unconnected controls
  must be honestly unavailable, not simulated persisted data.
- Preserve `useFormGate` and `useEditorDialog` contracts, dirty-close handling and focus restoration.
- Validate JPG/PNG/WebP uploads on client and server, ≤3 MiB; coating media exactly square.
  Catalog publication remains audited, with cleanup only of newly uploaded objects on failed saves.
- Assets: logo `public/brand/logo.png`; Home media under `public/images/home/` and
  `public/videos/home/`; coating photos in Supabase `catalog-media`. Use Lucide for missing icons.
  Do not embed reference PNGs as pages or add random remote/paid assets.
- Generated schema types and Boneyard bones are not hand-edited. Use documented generators.
- Preserve unrelated working-tree edits. Explain the intended bounded change before implementing.

## External actions requiring separate explicit confirmation

At the final external action, confirm live PayMongo keys/charges, added transactional email events,
Admin capabilities beyond connected V1 operations, or later DNS/host expansion. A cleanup or
diagnosis request does not authorize those operations.

## Validation and handoff

Run typecheck, lint, relevant tests, edited-file formatting checks, and a production build for
route/integration changes. Use local database tests for SQL changes; never run the full clean-data
suite against populated hosted projects. Review the diff and check responsive behavior proportional
to the change. Report unavailable/failed checks honestly; do not claim a deployment or browser test
from code inspection alone.

The user performs Git operations manually. Do not stage, commit, push or merge.
Report completion, validation, unresolved issues and a concise Conventional Commit message.
Recommend modular commit groups when the batch contains independent changes.
