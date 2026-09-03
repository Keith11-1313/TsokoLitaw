# TsokoLitaw — Requirements

## 1. Product Overview

TsokoLitaw is a mobile-first B2C storefront for a student-operated Filipino dessert business. It sells chocolate-filled Litaw in configurable boxes for campus pickup.

The product supports browsing, customization, cart, checkout, online payment, order tracking, completed-order-linked reviews, loyalty, and administration.

## Decision Governance

`DECISIONS.md` is the rationale record for these requirements. Requirements define what must be true; the decision log explains why the workflow and UI were chosen.

Do not restore discarded rough-draft behavior—such as public Feedback, delivery addresses, outdated flavors, duplicate Order Now navigation, or Vlog-only content—without a new explicit product decision and synchronized documentation update.

Workflow changes must be reflected together in:

- customer requirements
- admin requirements and customer impact
- architecture/data flow
- proposed database constraints
- design behavior and states
- implementation tasks

## 2. Delivery Stages

### Completed baseline: Phase 13 — Security and Production

- Next.js, React, TypeScript, and Tailwind UI
- client-side interactions only where persistence or server authority is not required
- Google OAuth, cookie-backed sessions, protected customer routes, authenticated profile updates, and server-side Admin role checks
- browser-local cart persistence
- one reviewed production bootstrap schema, RLS policies, pgTAP tests, controlled seed data, and Supabase client helpers
- the approved account-deletion lifecycle: authenticated scheduling/cancellation plus a server-only scheduled processor that rechecks eligibility and permanently deactivates due customer profiles while retaining their Auth identities and relational data
- active catalog and published pickup availability are loaded from Supabase
- server-authoritative pricing, inventory reservation/release, immutable order snapshots, Terms acceptance, and duplicate-submit protection are implemented and validated against hosted development
- active Admin identities may place their own customer-storefront orders, and all new orders use one shared kiosk-style number such as `TL-0001`
- environment-bound PayMongo v2 Hosted Checkout accepts QR Ph only; signed paid webhooks and provider references are authoritative
- Admin Orders reads real order snapshots and advances paid fulfillment through validated, audited server-side transitions
- completed-order owners can submit one persisted review; new reviews remain non-public until Admin moderation
- Admin Journal combines persisted post publishing with audited review visibility/featured decisions
- featured visible reviews and published Journal posts are loaded by the public Journal
- the Admin dashboard combines bounded live order, Catalog, Pickup, Inventory, customer, Journal, and review summaries
- completed-order loyalty earning, customer/Admin progress, and single-use checkout redemption are implemented
- confirmation, ready-for-pickup, and unpaid-cancellation emails are queued exactly once from committed transitions; legacy refund notifications remain available only to reconcile historical records
- Signed Resend delivery webhooks are verified against the untouched request body, deduplicated by provider event ID, and update operational delivery state without changing commerce state
- Hosted Dev smoke testing confirms all six notification transitions, exactly-once queueing, retry recovery, and Resend delivery callbacks; the canonical migration resets cleanly and all 294 pgTAP database tests pass
- `development` is the Dev integration branch and `main` is the Production branch; routine work is tested on `development` and promoted through one reviewed `development` → `main` pull request, while separate feature branches are reserved for risky or large work
- the existing `tsokolitaw.vercel.app` deployment remains the isolated Dev application, while `tsokolitaw.com` belongs to a separate Production Vercel project connected to the same repository
- Dev and Production use separate Supabase projects, provider credentials, webhook secrets, cron secrets, and URLs; database changes are tested locally and in Dev before the same reviewed migrations are promoted to Production

### Current and planned next stages

- Phase 14 is in progress and overhauls the customer and Admin interface without changing the established commerce, payment, authorization, notification, or operational rules.
- Phase 15 packages the stable Phase 14 Production website as a directly distributed Android APK through a Trusted Web Activity.

### External changes requiring explicit approval

- future PayMongo key changes or real charges
- any later public DNS change outside the already-active canonical domain

UI labels must clearly distinguish mock or unavailable backend actions.

## 3. Technology

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- Lucide React
- Vercel

Connected integrations:

- separate Supabase PostgreSQL/Auth projects for Dev and Production
- Google Sign-In through each environment's default Supabase authentication domain
- PayMongo QR Ph Hosted Checkout
- Resend transactional email and signed delivery tracking
- separate Vercel projects for `tsokolitaw.vercel.app` and `www.tsokolitaw.com`

## 4. Customer Navigation and Routes

Main navigation:

1. Home
2. Our Creations
3. Journal

Header actions:

- Account/Profile
- Cart with item-count badge

My Orders must exist inside Account/Profile, not in the main navigation. There is no public Feedback navigation.

Routes:

```text
/
/our-creations
/journal
/cart
/checkout
/login
/profile
/orders
/orders/[orderId]
/orders/[orderId]/review
/terms
/privacy
/payment/success
/payment/failed
```

Legacy `/vlog` and `/feedback` URLs may redirect to `/journal`.

## 5. Authentication and Account

V1 authentication:

- customer accounts required
- Google Sign-In through Supabase
- same sign-in flow for new and returning customers
- no guest checkout
- one admin permission role supporting five approved Google accounts; one may be configured initially and four added later

Signed-out Account opens `/login`. Signed-in Account opens a menu containing Profile, My Orders, and Log out. Log out must open a confirmation dialog and, after confirmation, clear the Supabase session and return the user to Home. An authenticated Admin also receives an Admin dashboard shortcut; server-side role checks remain authoritative.

Profile UI includes:

- name
- read-only Google email
- optional mobile number; Google email is the primary contact method
- loyalty progress
- recent-order/account shortcuts
- a sidebar danger-zone action that opens the account-deletion confirmation dialog

Customers may schedule self-service account deletion from a clearly separated Profile danger zone. Deletion occurs only after a fixed 90-day grace period and may be cancelled before the deadline. A pending request blocks new checkout. Customers with active orders or refunds must resolve them first, and Admin accounts require controlled removal rather than customer self-service deletion.

At the deadline, the trusted server process sets the customer profile inactive and records the deactivation time. It does not delete the Supabase Auth identity, profile, orders, reviews, loyalty data, notifications, or their relationships. RLS and server authorization must reject inactive identities even if an older token exists. A later Google OAuth attempt must clear the newly created application session and show the dedicated deleted-account screen. The customer's external Google account is never changed.

Authentication and authorization must never rely on frontend state alone.

The five planned V1 admin accounts have the same permissions. One Google identity may bootstrap Admin initially, with four more added later through controlled backend data. Every protected page and mutation must verify the admin role server-side. A signed-in customer who attempts to open an Admin route receives the existing global Not Found page without changing the requested Admin URL or exposing administrator approval-list or account details.

Transactional order emails use Resend from server-only code. Active events include order confirmation, ready-for-pickup, and unpaid cancellation. Historical refund events may still be delivered for records created under the superseded workflow. Email delivery must not determine order or payment status, and failed sends must be retryable without duplicating messages.

## 6. Product and Pricing

Temporary editable seed values:

- base price per piece — ₱10
- 4-piece box — ₱40 (`4 × ₱10`)
- 6-piece box — ₱60 (`6 × ₱10`)
- 8-piece box — ₱80 (`8 × ₱10`)
- first coating type included
- each additional coating type — temporary seed price ₱5, configurable by Admin
- extra sea salt cream — ₱18 per cup

Coatings:

- Cocoa
- Milk
- Palitaw: sugar, niyog, and sesame seeds
- Crushed Nuts
- Plain
- Sesame Seeds
- Cookies and Cream

Product photography should use the local coating images when available.

Each coating catalog record requires:

- customer-facing name
- description
- square 1:1 image
- configurable additional-type price

Admin coating creation validates and previews the square image before submitting the connected audited Catalog mutation. A coating appears in the customer builder only after successful persistence and cache invalidation; failed or incomplete submissions must never look published.

The temporary prices are approved as initial database seed values. Authorized admins may edit the base price per piece plus each coating's additional-type charge, add-on pricing, and related pricing. The primary product remains customer-facing; availability is controlled at the sellable box-size, coating, and add-on levels rather than with a redundant whole-product switch. Every active add-on created in Admin Catalog must appear in the customer box builder. A configured box may select one add-on type and its quantity; the cart keeps its name for display, while checkout submits its database ID and quantity for server-side availability and price validation. Box totals are derived from the selected variant's piece count and the current base piece price. The ₱5 additional-coating amount is not fixed: checkout must reload its current Admin-managed value and recalculate money on the server, while completed orders retain immutable price snapshots.

## 7. Product Customization

Customer flow:

1. Select 4-, 6-, or 8-piece box.
2. Choose single coating or mixed box.
3. For mixed boxes, allocate each piece to a coating.
4. Require allocated pieces to exactly equal the selected box size.
5. Charge the current Admin-configured additional-type price for each distinct coating type after the first; the provisional seed is ₱5.
6. Optionally select any active add-on and enter its quantity per box.
7. Enter the box quantity using a bounded numeric input.
8. Add configuration to cart.

Different configurations become separate cart line items. One order may contain multiple line items and must use one payment transaction.

## 8. Cart

Current frontend cart supports:

- add item
- successful-addition modal with a cart icon, Continue shopping dismissal, and Check cart action
- remove item
- update quantity through the same bounded numeric input used by the builder
- select individual cart lines or select all lines for checkout
- calculate the checkout estimate from selected lines only
- retain unchecked lines after verified payment removes the purchased selection
- item count
- coating summary
- calculated subtotal
- browser-local persistence
- checkout navigation

The browser cart is a UI convenience only and does not know the eventual pickup date. Builder and cart quantities retain a defensive client cap; after the customer selects a pickup date, Checkout displays that date's remaining prepared pieces, compares them with the selected cart's total piece demand, and prevents an obviously oversized submission. The transactional checkout writer remains authoritative against manipulated or concurrently stale prices, quantities, stock, pickup eligibility, and payment values.

## 9. Checkout and Pickup

Checkout collects:

- full name
- Google account email
- optional mobile number
- pickup date
- pickup time
- pickup location
- optional notes
- Terms & Conditions acceptance

Campus pickup only.

Launch pickup locations:

- UCC Congress — 3rd Floor
- UCC Congress — Covered Court

Pickup locations, dates, time windows, lead time, cutoff time, and availability are database-backed and Admin-controlled. Current reference values are provisional launch seeds that operations may replace. Initial business rules:

- operating window: Monday–Saturday, 7:00 AM–7:00 PM
- Admin publishes only the dates and time slots the team can actually serve; the operating window does not promise that every slot is available
- every customer sale, including Ready Stock and Hybrid pickup, must be ordered and paid through the website; V1 does not accept cash or untracked walk-in sales
- made-to-order is the default and follows Admin-configured lead-time and cutoff rules
- same-day pickup is available only when Admin publishes ready stock brought to school
- provisional made-to-order setup: one-day lead time, 5:00 PM daily cutoff, and hourly slots
- pickup grace period: 15 minutes
- ready-stock availability closes when its configured on-hand stock is exhausted
- no automatic refund for no-show

Availability modes always operate on an explicitly published pickup date:

- `MADE_TO_ORDER`: customers order and pay online before the configured cutoff; the kitchen prepares the paid quantity for that published pickup date, so no prepared-piece balance is required.
- `READY_STOCK`: Admin first publishes the pickup date, then publishes the exact number of already prepared pieces in Inventory. That number is the date's upper online-sales limit across all box sizes.
- `HYBRID`: same-day checkout consumes the published prepared-piece balance while eligible advance orders follow the made-to-order rules.

Admin Pickup owns persisted creation and publication of dates, time windows, locations, mode, cutoff, lead time, grace period, and operating hours. Admin Inventory cannot invent another pickup date; it lists existing upcoming Ready Stock and Hybrid dates and assigns an independent prepared-piece balance to each. Schedules with an order or published inventory are locked against structural edits, but Admin may close or republish the date without changing existing order snapshots.

Admin changes affect future checkout availability and must not rewrite the pickup snapshot of an existing paid order.

Before payment show the order summary, total, pickup details, allergen notice, and cancellation/no-show notice.

## 10. Orders and Reviews

Customers can view:

- current orders
- order history
- order details
- fulfillment and payment status
- pickup details

Reviews:

- available only from an eligible completed order detail
- opened in a modal on that order detail rather than a separate review screen
- one review per completed order
- 1–5 stars and written comment
- show the ordered box/coating summary and a live 1,000-character limit
- authenticated customer only
- no unnecessary public personal data
- admin may hide spam, abusive, illegal, or invalid content

Selected order-linked reviews may appear as community highlights in the Journal.

## 11. Journal

Journal replaces Vlog and may contain:

- announcements
- kitchen stories
- product features
- customer stories
- selected order-linked reviews
- videos

Admin Journal is one operational area. Admin can create or edit draft/published content, select the post type and icon, edit its display date and text, attach an optional cover image or secure video link, and moderate/feature completed-order reviews. Published posts and featured visible reviews must feed the public Journal.

## 12. Payment

Website checkout offers QR Ph only through PayMongo Hosted Checkout. Card, GCash, and other provider methods are not offered by this application.

```text
Checkout
→ Validate server-side
→ Create PENDING_PAYMENT order
→ Reserve stock
→ Create PayMongo checkout
→ Customer pays
→ Verify PayMongo webhook
→ Record payment
→ Confirm order
```

- initial payment expiry: 15 minutes, configurable
- provider-bound orders release reserved stock only after the corresponding PayMongo checkout session has been expired successfully
- success redirect is not proof of payment
- never store card details
- webhook handling must be idempotent

Order statuses:

```text
PENDING_PAYMENT, PAID, CONFIRMED, PREPARING,
READY_FOR_PICKUP, COMPLETED, CANCELLED, EXPIRED
```

Payment statuses:

```text
PENDING, PAID, FAILED, REFUNDED
```

Keep fulfillment and payment state separate.

Cancellation and refund rules:

- customers may cancel online only while an order is `PENDING_PAYMENT` with payment status `PENDING`
- an unpaid cancellation releases reserved stock and requires no refund
- an attached PayMongo checkout must be expired before the unpaid reservation is released
- paid-order cancellation or settlement concerns are coordinated directly with TsokoLitaw in person; the website does not initiate or process refunds
- `PAID`, `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, completed, and no-show orders are not customer-cancellable through the website
- no-show orders receive no refund because the product has already been prepared
- applicable non-waivable customer rights remain unaffected
- historical refund rows, states, and signed-event reconciliation remain only for integrity of transactions created under the earlier workflow

## 13. Inventory

Inventory supports:

- daily prepared stock counted in individual Palitaw pieces per product, shared by all box sizes
- online-committed, unusable/waste-consumed, and available piece quantities
- coating and add-on availability
- pickup date availability
- ready-stock availability for school selling days, with recorded waste adjustments so online stock remains accurate
- sold-out UI
- atomic reservation of `box quantity × piece count` during pending payment
- release after expiry
- atomic updates to prevent overselling

The published prepared total is the maximum number of pieces checkout may allocate for that product and pickup date. For example, publishing 50 permits no more than 50 pieces across every 4-, 6-, and 8-piece box combination. Each date has an independent balance. Once pieces are committed to orders or removed as waste, Admin may not reduce the total below that already-accounted quantity; a new pickup date starts a new limit. Inventory does not expose a separate online-availability checkbox: an open published pickup date with sufficient remaining pieces is available, and a closed date or exhausted balance is unavailable.

## 14. Loyalty

Initial loyalty rule:

- every seven completed orders earns a free 4-piece box

Cancelled, expired, unpaid, or failed orders do not count. One reward discounts the current base price of one selected 4-piece box; add-ons and additional coating types remain payable. Redemption is atomic, one reward cannot fund two orders, and a pending redemption returns to available if its order expires or is cancelled. A fully rewarded ₱0 order is recorded as loyalty-settled and confirmed without opening PayMongo.

## 15. Admin

Admin pages:

- Dashboard
- Orders
- Products
- Inventory
- Pickup
- Customers
- Journal

The Dashboard is a read-only operational overview of every connected Admin area. It shows bounded recent-order metrics, seven-day paid revenue, the current fulfillment-status mix, linked area summaries, recent orders, and real quick actions. Charts must label their values, remain useful without color alone, and state when a metric comes from the bounded recent-order set rather than lifetime data.

Admin manages boxes, PHP prices, coatings, add-ons, product images, stock, pickup schedules and locations, orders, reviews, and Journal posts. Admin also reads customer loyalty progress; the loyalty rule itself is not an editable V1 setting. Pickup Management owns pickup-related operational rules, and a separate Settings page is intentionally omitted until genuine cross-feature configuration exists.

Admin Customers is an account-support directory. It includes every customer and Admin profile, labels each role explicitly, and shows zero order or loyalty activity when an account has not purchased yet.

The Admin Catalog coating form collects name, description, a validated 1:1 image, allergen information, availability, and the coating's additional-type price. Publication uses authenticated server-side persistence, controlled public media storage, cache invalidation, and Admin audit logging.

The TsokoLitaw brand/store name is fixed and must not appear as an editable setting. Never expose infrastructure secrets in admin UI.

The Home page may feature approved local promotional photography and video. Its feature carousel starts with an autoplaying muted video, allows sound to be toggled, and advances to the promotional image when playback ends. Media must use responsive presentation, accessible descriptions or captions, and browser-compatible delivery formats.

Admin intentionally remains under `/admin` for campus-scale V1 and enforces server-side authorization on every protected page and mutation. No Admin subdomain is planned for V1.

## 16. Terms, Privacy, and Allergens

Terms and Privacy links must appear in the footer and checkout.

Final Terms must cover ordering, pricing, availability, payment, pickup, late/no-show behavior, cancellation, refunds, food handling, allergens, data processing, and customer responsibilities.

The approved recipe/allergen disclosure covers peanuts or other nuts, dairy, coconut, sesame, chocolate ingredients, and cookie ingredients. Products may contain or come into contact with these allergens.

## 17. Responsive and Accessible UI

- mobile-first
- desktop and tablet support
- semantic HTML and landmarks
- explicit labels
- keyboard-operable custom controls
- visible focus states
- accessible contrast
- meaningful alt text
- touch-friendly targets
- responsive tables
- no unintended horizontal overflow
- browser validation with field-level feedback for every real customer and Admin form
- authoritative server validation for every persisted form regardless of browser state
- edit actions enabled only for valid changed values; creation and confirmation actions enabled once complete and valid
- branded keyboard-accessible listboxes instead of native dropdown presentation
- branded minus/input/plus steppers with direct entry for every numeric form control
- JPG, PNG, and WebP uploads only, maximum 3 MiB, with successful image decoding required; coating images must be exactly square

## 18. Security Requirements

The implemented backend and every later backend change must:

- protect customer and admin data with RLS
- verify admin authorization server-side
- prevent cross-customer order access
- validate every mutation and transition
- calculate prices and stock server-side
- verify PayMongo signatures and event uniqueness
- avoid duplicate checkout submissions
- never log or expose secrets
- preserve order-item snapshots
- use the default environment-specific Supabase authentication domains for Dev and Production; a paid custom authentication domain is not required for V1
- verify Google login, callback exchange, token refresh, logout, customer protection, and Admin authorization against each environment's configured Supabase callback
- protect the scheduled account-deletion processor with a server-only secret and recheck eligibility immediately before permanent deactivation

## 19. Android APK Distribution

Phase 15 must produce a signed Android APK without rewriting the application or publishing through Google Play. The approved approach is a PWABuilder/Bubblewrap-generated Trusted Web Activity that opens the canonical Production site in a supported browser context.

- retain the Next.js/Vercel application as the only storefront and commerce codebase
- add a standards-based web app manifest, Android launcher icons, and only the minimal installability support required by the wrapper
- verify the APK-to-site relationship through `https://www.tsokolitaw.com/.well-known/assetlinks.json`
- keep the signing keystore and passwords outside Git and preserve secure backups for future updates
- provide a clearly labeled website action that downloads the versioned signed APK; Android still controls user confirmation and permission to install from the browser
- use a separate custom Palitaw-themed splash illustration on a branded background while the Trusted Web Activity initializes; do not reuse only the launcher logo or add an artificial delay
- accept Android's brief system-controlled launch screen on newer versions before the custom Trusted Web Activity splash appears
- keep Google OAuth and PayMongo in supported browser flows; do not place them inside a developer-controlled embedded WebView
- do not add Capacitor, React Native, native commerce screens, offline ordering/payment, or Google Play publication unless a later requirement explicitly changes the scope
- test installation, Digital Asset Links verification, authentication, cart/session behavior, payment redirection and return, navigation, and upgrade signing on physical Android hardware
