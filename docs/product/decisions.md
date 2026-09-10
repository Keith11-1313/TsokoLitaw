# Current product rules and rationale

Latest explicit owner decisions take precedence, followed by this current behavior record,
implemented shared components/data, and responsive/accessibility requirements. Rough PNG references
are historical context, never pixel-perfect requirements. Update affected feature guides and tests
when a rule changes; do not duplicate every rule into README or a second specification.

## Scope and navigation

TsokoLitaw is a student-operated chocolate-filled Litaw business for campus pickup, at roughly
1,000 customers maximum. One Next.js application with `/admin` is sufficient. A separate Admin
subdomain, microservices, repositories/factories, or a native storefront rewrite is not needed.

Main navigation: Home, Our Creations, Journal. Account/Profile and Cart are header actions;
My Orders belongs inside Account, not the main navigation. Terms and Privacy belong in Footer
and Checkout. Legacy Vlog/Feedback URLs redirect to Journal. This avoids duplicate shopping
actions and keeps private activity separate from public discovery.

## Identity and contact

- Google OAuth through Supabase; no guest checkout. Same sign-in flow for new/returning users.
- Email is the primary contact; mobile is optional. Logout requires confirmation and returns Home.
- Up to five approved Google identities share one equal-permission Admin role, checked server-side.
  Active Admins may place their own customer orders, not choose another owner at checkout.
- Default environment-specific Supabase Auth domains are intentional; no paid custom Auth domain.
- Account deletion is a cancellable 90-day request followed by permanent profile deactivation,
  not deletion of Google, Supabase Auth identity, or relational history. Pending deletion blocks
  new checkout; active orders/refunds block scheduling. Inactive access is denied by server and RLS.

## Catalog and money

- Currency PHP; configurable boxes TsokoMini (4), TsokoMore (6), TsokoMuch (8 pieces).
- The exterior choices are **coatings**, not flavors/toppings: Cocoa, Milk, Palitaw, Crushed Nuts,
  Plain, Sesame Seeds, Cookies and Cream. Palitaw means sugar, niyog, sesame seeds.
- Base unit price is piece count × the current Admin-managed product price per piece.
  Each coated piece adds its coating's Admin-managed per-piece charge. Mixed allocations total
  the whole box; a single-coating box allocates every piece to that choice.
- Exactly one active coating is the default. Add-ons are active persisted records; a configured
  line may select one type and quantity per box. Different configurations are separate cart lines.
- Seed prices (base ₱10/piece, coating ₱5/piece, initial cream add-on ₱18) are provisional data,
  not permanent application constants. The old distinct-extra-coating pricing rule is superseded.
- Customer allergen communication is one general notice, not per-coating Admin allergen controls.
  Notice covers nuts, dairy, coconut, sesame, chocolate/cookie ingredients and cross-contact.
- Coating images persist in Supabase Storage and are square JPG/PNG/WebP, at most 3 MiB.

Cart data is browser-local and untrusted. Customers can select a subset to pay for; verified payment
removes only the purchased selection. Server checkout reloads prices and creates immutable snapshots.
Normal Admin catalog changes never reprice existing orders.

## Pickup and stock

All sales use website checkout and online payment. Campus pickup only; no cash/walk-in or delivery flow.
Launch locations are UCC Congress — 3rd Floor and Covered Court. Monday–Saturday, 7 AM–7 PM is
the operating window, not automatic availability. Admin publishes every actual date/window/location.
Provisional rules are one-day lead time, 5 PM cutoff, hourly slots, and 15-minute grace period.

Made to order uses published schedules/cutoffs without prepared inventory. Ready stock uses the
published prepared-piece upper limit for that date. Hybrid uses prepared pieces for same-day pickup
and eligible advance made-to-order behavior. No mode makes every date sellable automatically.
Pickup owns schedules; Inventory attaches stock to existing eligible dates. Structural schedule
edits lock once orders/stock depend on them; publication can still close/reopen.

Prepared inventory is per product/date, shared by all box sizes in pieces. Commitments/waste constrain
lowering the total. A different date starts an independent balance, not a reset of old records.
No separate Inventory “available online” switch or window-box capacity is required.

## Payments and order state

QR Ph only through environment-bound PayMongo Hosted Checkout. Browser success is not payment proof.
Signed verified events and exact SQL reference/amount matching determine paid state. Default payment
expiry is 15 minutes, configurable. Provider checkout must close before reserved stock is released.

Order and payment status remain distinct; see [orders](../features/orders.md). Website cancellation
is **pending unpaid only**, not “until preparation.” Paid settlement concerns are handled in person.
No new online refunds or destination collection. Prepared/no-show orders are non-refundable subject
to non-waivable rights. Historical refund rows, states and signed reconciliation remain for integrity.
Their retirement is deferred; the hosted reset was declined.

## Loyalty, Journal and communication

- Seven completed orders earn one free 4-piece reward; only the eligible base box price is discounted.
  Coatings/add-ons remain payable. SQL protects single use, restores pending redemptions on
  cancellation/expiry, and settles a zero-total order without PayMongo.
- One review per owned completed order; rating 1–5 and bounded comment. Order detail opens the
  review modal. New reviews are hidden until Admin moderation. Public cards do not disclose email.
- Journal includes announcements, stories, features, community highlights and optional videos.
  Admin Journal owns draft/publication and review moderation; reviews remain distinct records.
- Resend sends confirmation, readiness, and unpaid cancellation events. Three historical refund
  messages remain for old records only. Queueing is idempotent and email never determines payment.

## Operations and future scope

Admin Dashboard is a bounded read-only cross-feature summary; Catalog, Orders, Pickup, Inventory,
Customers and Journal own their respective mutations. Customers includes Admin/customer profiles,
role labels and zero-activity accounts. Fixed brand and provider secrets are not editable settings.

Dev and Production remain isolated deployments/data/providers. SQL promotion is independent of Git.
Ordinary work follows development → reviewed PR → main; feature branches are reserved for risky/large work.
See [environments](../getting-started/environments.md) and [deployment](../operations/deployment.md).

Phase 15's approved thin TWA APK and optional Phase 16 public-only analytics are **planned**, not
implemented features. Their scope and remaining work live only in the [roadmap](../roadmap.md).
Completed phase-by-phase implementation checklists remain recoverable through Git rather than
being repeated as current instructions. Applied SQL history is retained in place.
