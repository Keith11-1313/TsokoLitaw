# TsokoLitaw — Requirements

## 1. Product Overview

TsokoLitaw is a mobile-first B2C storefront for a student-operated Filipino dessert business. It sells chocolate-filled Litaw in configurable boxes for campus pickup.

The product must eventually support browsing, customization, cart, checkout, online payment, order tracking, completed-order-linked reviews, promotions, loyalty, and administration.

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

### Current: Phase 11 — Orders, Reviews, Journal, and Admin CRUD

- Next.js, React, TypeScript, and Tailwind UI
- mock order/payment/Admin operational data remains where later phases have not connected persistence
- temporary client-side component interactions
- Google OAuth, cookie-backed sessions, protected customer routes, authenticated profile updates, and server-side Admin role checks
- browser-local cart persistence
- static payment and account previews
- one reviewed production bootstrap schema, RLS policies, pgTAP tests, controlled seed data, and Supabase client helpers
- the approved account-deletion lifecycle: authenticated scheduling/cancellation plus a server-only scheduled processor that rechecks eligibility and permanently deactivates due customer profiles while retaining their Auth identities and relational data
- active catalog and published pickup availability are loaded from Supabase
- server-authoritative pricing, promotion evaluation, inventory reservation/release, immutable order snapshots, Terms acceptance, and duplicate-submit protection are implemented and validated against hosted development
- active Admin identities may place their own customer-storefront orders, and all new orders use one shared kiosk-style number such as `TL-0001`
- PayMongo v2 Hosted Checkout test sessions, signed webhooks, provider references, and test payment/refund transitions are the active integration scope
- Admin Orders reads real order snapshots and advances paid fulfillment through validated, audited server-side transitions
- completed-order owners can submit one persisted review; new reviews remain non-public until Admin moderation
- Admin Journal & Reviews combines persisted post publishing with audited review visibility/featured decisions
- featured visible reviews and published Journal posts are loaded by the public Journal
- remaining Admin management areas stay mock/non-persistent until their Phase 11 slices are connected

### Deferred

- PayMongo live mode
- email and Admin CRUD areas not yet reached by the active Phase 11 slice
- admin subdomain configuration

UI labels must clearly distinguish mock or unavailable backend actions.

## 3. Technology

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- Lucide React
- Vercel

Future integrations:

- Supabase PostgreSQL and Auth
- Google Sign-In
- PayMongo
- Resend transactional email
- `tsokolitaw.com`
- planned `admin.tsokolitaw.com`

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

Transactional order emails use Resend from server-only code. Initial events include order confirmation, ready-for-pickup, cancellation, and refund updates. Email delivery must not determine order or payment status, and failed sends must be retryable without duplicating messages.

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

During the UI-only phase, Admin may add a temporary session preview of a coating. It must be labeled as unsaved and must not appear in the customer builder as though it were published.

The temporary prices are approved as initial database seed values. Authorized admins may edit the active base price per piece plus each coating's additional-type charge, add-on pricing, and related pricing. Every active add-on created in Admin Catalog must appear in the customer box builder. A configured box may select one add-on type and its quantity; the cart keeps its name for display, while checkout submits its database ID and quantity for server-side availability and price validation. Box totals are derived from the selected variant's piece count and the current base piece price. The ₱5 additional-coating amount is not fixed: checkout must reload its current Admin-managed value and recalculate money on the server, while completed orders retain immutable price snapshots.

## 7. Product Customization

Customer flow:

1. Select 4-, 6-, or 8-piece box.
2. Choose single coating or mixed box.
3. For mixed boxes, allocate each piece to a coating.
4. Require allocated pieces to exactly equal the selected box size.
5. Charge the current Admin-configured additional-type price for each distinct coating type after the first; the provisional seed is ₱5.
6. Optionally add extra sea salt cream.
7. Select quantity.
8. Add configuration to cart.

Different configurations become separate cart line items. One order may contain multiple line items and must use one payment transaction.

## 8. Cart

Current frontend cart supports:

- add item
- successful-addition modal with a cart icon, Continue shopping dismissal, and Check cart action
- remove item
- update quantity
- item count
- coating summary
- calculated subtotal
- browser-local persistence
- checkout navigation

The browser cart is a UI convenience only. Future checkout must reject manipulated prices, discounts, stock, and payment values.

## 9. Checkout and Pickup

Future checkout collects:

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

Pickup locations, dates, time windows, lead time, cutoff time, capacity, and availability must be database-backed and admin-controlled. Current mock values may be used as provisional launch seeds until operations replaces them. Initial business rules:

- operating window: Monday–Saturday, 7:00 AM–7:00 PM
- Admin publishes only the dates and time slots the team can actually serve; the operating window does not promise that every slot is available
- made-to-order is the default and follows Admin-configured lead-time and cutoff rules
- same-day pickup is available only when Admin publishes ready stock brought to school
- provisional made-to-order setup: one-day lead time, 5:00 PM daily cutoff, hourly slots, and 20 boxes per slot
- pickup grace period: 15 minutes
- ready-stock availability closes when its configured on-hand stock is exhausted
- no automatic refund for no-show

Admin changes affect future checkout availability and must not rewrite the pickup snapshot of an existing paid order.

Before payment show order summary, discounts, total, pickup details, allergen notice, and cancellation/no-show notice.

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

Admin Journal & Reviews is one operational area. Admin can create or edit draft/published content, select the post type and icon, edit its display date and text, attach an optional cover image or secure video link, and moderate/feature completed-order reviews. Published posts and featured visible reviews must feed the public Journal.

## 12. Payment

Use PayMongo only in a later approved phase.

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

- customers may request cancellation while an order is `PENDING_PAYMENT`, `PAID`, or `CONFIRMED`
- an unpaid cancellation releases reserved stock and requires no refund
- a paid cancellation creates a full refund to the original PayMongo payment method
- customer cancellation and refund eligibility end when the order enters `PREPARING`
- `PREPARING`, `READY_FOR_PICKUP`, completed, and no-show orders are non-refundable under the standard policy
- no-show orders receive no refund because the product has already been prepared
- the order may be `CANCELLED` while its refund remains `REQUESTED` or `PROCESSING`; refund completion requires provider confirmation
- manual refund destination details may be requested only when an automatic provider refund is unsupported or fails, and must be handled as restricted personal data

## 13. Inventory

Future inventory supports:

- daily stock by box variant
- reserved, sold, and available quantities
- coating and add-on availability
- pickup date availability
- ready-stock availability for school selling days, with recorded walk-in sales or adjustments so online stock remains accurate
- sold-out UI
- reservation during pending payment
- release after expiry
- atomic updates to prevent overselling

## 14. Promotions and Loyalty

Initial promotion idea:

- buy two boxes and receive two extra pieces

Promotion rules must be configurable and validated server-side.

Initial loyalty rule:

- every seven completed orders earns a free 4-piece box

Cancelled, expired, unpaid, or failed orders do not count. Prevent duplicate rewards and redemption.

## 15. Admin

Admin pages:

- Dashboard
- Orders
- Products
- Inventory
- Pickup
- Promotions
- Customers
- Journal & Reviews
- Settings

Admin may eventually manage boxes, PHP prices, coatings, add-ons, product images, stock, pickup schedules and locations, promotions, loyalty, orders, reviews, Journal posts, and operational settings.

The Admin Catalog coating form collects name, description, a validated 1:1 image, allergen information, availability, and the coating's additional-type price. Publication uses authenticated server-side persistence, controlled public media storage, cache invalidation, and Admin audit logging.

The TsokoLitaw brand/store name is fixed and must not appear as an editable setting. Never expose infrastructure secrets in admin UI.

The Home page may feature approved local promotional photography and video. Its feature carousel starts with an autoplaying muted video, allows sound to be toggled, and advances to the promotional image when playback ends. Media must use responsive presentation, accessible descriptions or captions, and browser-compatible delivery formats.

Admin currently lives under `/admin`. A future `admin.tsokolitaw.com` mapping must still enforce server-side authorization.

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

## 18. Security Requirements

When backend work begins:

- protect customer and admin data with RLS
- verify admin authorization server-side
- prevent cross-customer order access
- validate every mutation and transition
- calculate prices, promotions, and stock server-side
- verify PayMongo signatures and event uniqueness
- avoid duplicate checkout submissions
- never log or expose secrets
- preserve order-item snapshots
- use `auth.tsokolitaw.com` as the production Supabase authentication domain once the paid custom-domain add-on and DNS are configured
- keep the original Supabase OAuth callback during migration and remove it only after the branded production flow is verified
- verify the branded domain across Google login, callback exchange, token refresh, logout, customer protection, and Admin authorization
- protect the scheduled account-deletion processor with a server-only secret and recheck eligibility immediately before permanent deactivation
