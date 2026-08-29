# TsokoLitaw — Product and Architecture Decisions

## 1. Purpose

This document records decisions made while reviewing and correcting the TsokoLitaw UI. It explains not only what the interface does, but why it is structured that way.

Use it to prevent later work from restoring discarded rough-draft behavior. When a decision changes, update this file together with Requirements, Architecture, Database, Design, Tasks, and README.

## 2. Decision Priority

When sources disagree, use this order:

1. Latest explicit product-owner decision
2. This decision log and current Requirements
3. Existing shared domain data and reusable UI
4. Responsive, accessibility, security, and data-integrity requirements
5. Rough PNG references

The PNGs in `references/` are retained as early visual context. They are not pixel-perfect requirements and cannot override later product decisions.

## 3. Current Delivery Boundary

### Decision

The current milestone is Phase 11 Orders, Reviews, Journal, and Admin CRUD. Phase 10 PayMongo Test Mode implementation is complete, with hosted provider smoke checks retained as release follow-ups.

Allowed now:

- React and Tailwind UI
- database-backed customer catalog and published pickup availability
- local component state
- browser-local cart state as a non-authoritative convenience
- responsive and keyboard-accessible interaction
- disabled or temporary mock admin controls
- server-side cart validation, pricing, inventory reservation, Terms acceptance, immutable order snapshots, and idempotent pending-order creation
- PayMongo v2 test checkout sessions, signed/idempotent webhooks, and test payment/refund transitions
- real Admin order reads and audited, forward-only paid fulfillment transitions
- one persisted review per completed order, initially non-public until Admin moderation

Deferred until separately approved:

- PayMongo live mode and live keys
- transactional email
- Admin CRUD areas not yet reached by the current Phase 11 slice
- admin subdomain and DNS configuration

### Reason

The customer workflow, authentication boundary, server commerce, and test payment lifecycle are connected. Phase 11 now joins customer order tracking to operational Admin fulfillment one bounded management area at a time, preserving server authorization and auditability.

### UI consequence

Catalog, published pickup options, customer orders, and Admin fulfillment orders are real database reads. Browser totals remain estimates until the server recalculates them. Unconnected Admin actions stay disabled or explicitly labeled until their Phase 11 slice begins.

## 4. Mobile-First Experience

### Decision

Customer and admin interfaces are designed mobile first, then enhanced for tablet and desktop.

### Reason

The expected audience will commonly access the storefront from phones. Ordering, pickup selection, and order tracking must remain usable without relying on desktop layouts.

### UI consequence

- touch targets are at least approximately 44px
- forms and cards stack on narrow screens
- the product builder appears before the coating gallery on mobile
- the builder becomes a compact sticky sidebar on desktop
- admin navigation becomes a drawer on mobile
- wide tables scroll within their own containers instead of widening the page

## 5. Customer Navigation

### Decision

The main navigation contains:

- Home
- Our Creations
- Journal

Header actions contain:

- Account/Profile
- Cart with item count

My Orders belongs inside Account/Profile, not in the main navigation. The old Order Now navbar button was removed.

### Reason

Order Now duplicated Our Creations, the Home call to action, and Cart. My Orders is personal account activity rather than a public discovery page. Reducing duplicated paths makes the header clearer, especially on mobile.

### UI consequence

- shopping begins through Our Creations or the Home call to action
- Cart owns the transition toward checkout
- signed-in account UI exposes Profile, My Orders, and Log out
- signed-in Admin UI also exposes an Admin dashboard shortcut after the server confirms the Admin role
- signed-out Account opens Login
- protected Profile and Orders routes redirect signed-out users to Login

## 6. Authentication

### Decision

Google OAuth through Supabase provides the real signed-in session. Customer and Admin route access is decided from the server-loaded profile role.

### Reason

The account menu must reflect the verified session, while Admin visibility must match the same server-controlled role used by the route guard.

### UI consequence

- signed-out visitors are sent to Login for protected customer routes
- Google Sign-In creates or restores the Supabase session
- every Log out action opens an accessible confirmation dialog; confirmation clears the Supabase session and returns to Home
- authenticated customers can access Profile and the honest unconnected My Orders state
- authenticated Admins receive an Admin dashboard shortcut, but `/admin` still performs its own server-side role check
- a non-Admin opening an Admin route sees the global Not Found treatment at the requested URL rather than a dedicated authorization URL or administrator approval details

## 7. Customer Contact Information

### Decision

Google account email is the primary customer contact method. Mobile number is optional.

Business contact:

- `tsokolitaw@gmail.com`
- Facebook: `https://www.facebook.com/profile.php?id=61593123463925`

### Reason

Google Sign-In already supplies a stable account email. Requiring a phone number adds friction when the business primarily plans to communicate by email.

### UI consequence

- Google email is read-only in Profile and Checkout
- mobile fields are labeled optional
- customer summaries prioritize email
- order confirmation, ready-for-pickup, cancellation, and refund updates are planned as email events

### Transactional email provider

Resend is the approved V1 transactional email provider. Sending occurs only from trusted server code with idempotency protection. The application records the provider message ID and delivery state so failures can be retried and investigated without treating email delivery as proof of an order or payment transition.

Production sending requires a verified domain or sending subdomain. Resend API keys and webhook signing secrets must never be exposed to the browser or stored in Admin settings.

### Account deletion

Customers may schedule account deletion from a Profile danger zone. The request has a fixed 90-day grace period and remains cancellable until processing. Pending deletion blocks new checkout; active orders or refunds block the initial request. Admin identities use a separate controlled removal process.

When the deadline arrives, trusted server code rechecks eligibility, sets `profiles.is_active` to false, and records `deactivated_at`. The Auth identity, profile, orders, reviews, loyalty, notifications, and foreign-key relationships remain stored so operational records are not orphaned. RLS and server role helpers deny inactive identities, while the OAuth callback immediately clears any new session and sends the user to a dedicated deleted-account screen. The external Google account is never changed.

### Production schema artifact

The repository keeps one canonical bootstrap migration under `supabase/migrations/`. Approved schema refinements are folded into that file before production so a fresh production Supabase project receives the complete schema in one run. Existing linked environments may have older migration history and must not be reconciled by blindly replaying the squashed file.

## 8. Product Model: Boxes and Coatings

### Decision

TsokoLitaw sells chocolate-filled Litaw in:

- Box of 4 — 4 pieces × the current base piece price
- Box of 6 — 6 pieces × the current base piece price
- Box of 8 — 8 pieces × the current base piece price

The temporary base piece price is ₱10, producing initial preview totals of ₱40, ₱60, and ₱80 respectively.

Customer choices are coatings, not flavors or generic toppings:

- Cocoa
- Milk
- Palitaw: sugar, niyog, and sesame seeds
- Crushed Nuts
- Plain
- Sesame Seeds
- Cookies and Cream

### Reason

The chocolate center is the consistent product identity. The customer changes the exterior coating, so “coating” is the accurate domain term. Old mock products such as Matcha, Strawberry, Caramel, Cha-cha, and SB Litaw were removed because they no longer represent the approved catalog.

The ₱10 per-piece amount is the approved initial database seed, not a permanent business price. Authorized admins update the active base piece price; every box total is recalculated from its piece count. The server reloads and recalculates pricing at checkout, and completed order snapshots never change when catalog pricing changes.

### UI consequence

- real coating photography appears in Our Creations and Admin Catalog
- PHP is used everywhere
- Admin Catalog shows the base piece price relationship behind each derived box total
- Catalog is organized around box size, coating, and add-on—not unrelated product flavors

## 9. Single and Mixed Boxes

### Decision

- one coating type is included in a box
- each additional distinct coating type uses its Admin-configured additional-type charge; the temporary seed is ₱5
- a mixed box allocates every piece to a coating
- allocated pieces must exactly equal the selected box size
- extra sea salt cream is the initial optional add-on, temporarily ₱18 per cup
- Admin-created active add-ons automatically appear in the customer builder; each configured box may select one add-on type and a quantity
- the primary product has no redundant storefront availability checkbox; sellability is controlled through its box sizes and selectable catalog records
- add-on and box quantities use bounded numeric inputs in both the builder and Cart; date-specific prepared-piece inventory remains authoritative at checkout
- customers may select individual cart lines for checkout; newly added lines default to selected, unchecked lines remain in the browser cart, and verified payment removes only the persisted checkout selection

### Reason

Customers need freedom to mix coatings without turning each coating into a separate transaction. Charging per additional distinct coating type models preparation complexity more clearly than charging every individual coated piece.

### UI consequence

- single mode selects one coating for every piece
- mixed mode uses per-coating counters
- incomplete allocations block Add to Cart
- the item total updates before adding
- different configurations become separate cart line items

### Future server rule

The browser is never authoritative. The server must reload current records, count distinct positive coating allocations, validate the piece total, and recalculate the charge.

The ₱5 amount is only the initial coating-charge seed. It must not become a hardcoded production rule; Admin changes apply to future checkout calculations while completed order snapshots remain unchanged.

## 10. Cart and Checkout Workflow

### Decision

The customer may add multiple differently configured boxes to one cart and complete one checkout/payment.

```text
Home or Our Creations
→ Configure box
→ Add to cart
→ Review quantities and totals
→ Checkout
→ Select campus pickup
→ Accept Terms and Privacy
→ Future PayMongo payment
```

### Reason

Cart and checkout serve different jobs: Cart edits the order; Checkout collects customer and pickup information and confirms policies. A navbar Order Now action does not replace either one.

### Current connection

The cart persists in browser local storage. A successful Add to cart action opens a confirmation modal with a static cart icon, a Continue shopping dismissal, and a Check cart action. Invalid configurations never open the modal. Checkout reads the same local cart but does not create a real order or payment.

### Future server rule

Submit identifiers, counts, and quantities—not trusted prices. The server validates the session, product availability, stock, terms acceptance, and final total before creating an order.

## 11. Campus Pickup

### Decision

V1 uses campus pickup only.

Current launch configuration:

- UCC Congress — 3rd Floor
- UCC Congress — Covered Court
- operating window: Monday–Saturday, 7:00 AM–7:00 PM
- published dates, time slots, and allowed locations from Supabase
- made-to-order by default, using Admin-controlled lead time and cutoff
- same-day pickup only when Admin publishes ready stock brought to school
- initial made-to-order seed: one-day lead time, 5:00 PM cutoff, and hourly slots
- 15-minute grace period

The database treats locations, published dates, time windows, lead time, cutoff time, stock mode, and availability as operational configuration. Checkout shows only published records. The operating window is a boundary, not a promise that each date or time will be offered. Existing paid orders preserve their selected pickup details as historical snapshots. A separate boxes-per-window capacity was removed because prepared-piece inventory is the approved stock boundary for Ready Stock and same-day Hybrid checkout; bounded per-order quantities remain an abuse safeguard.

### Reason

Delivery addresses and delivery-hour UI did not match the actual operating model. A hybrid made-to-order and ready-stock pickup model keeps campus selling practical: preorders can follow the production schedule, while stock brought to school can be offered the same day until it runs out.

### UI consequence

Checkout exposes date, time, and location dropdowns. Admin Pickup persists and publishes those customer-facing options, including the availability mode and operational rules. Admin Inventory only receives existing upcoming Ready Stock and Hybrid dates; it does not create schedules. Once an order or prepared-stock record depends on a schedule, structural edits are locked while publication may still be closed or restored.

## 12. Orders and Status Workflow

### Decision

Customer Orders will show current orders and history after Phase 9 creates ownership-scoped order records. Until that write path is complete, authenticated customer order surfaces must not display mock records as if they belong to the signed-in Google identity. My Orders keeps its honest unconnected state, while dynamic order and review routes remain unavailable. Future order detail explains fulfillment progress, pickup, payment summary, cancellation eligibility, and review eligibility.

Active Admin identities may also use the customer storefront to place orders for themselves. Checkout always derives the order owner from the signed-in session, so this does not permit an Admin storefront submission on behalf of another customer. Every new order receives one shared kiosk-style number from a database sequence, beginning with `TL-0001`; Customer and Admin surfaces display the same stored number.

Primary future order flow:

```text
PENDING_PAYMENT
→ PAID
→ CONFIRMED
→ PREPARING
→ READY_FOR_PICKUP
→ COMPLETED
```

Terminal alternatives:

```text
CANCELLED
EXPIRED
```

### Reason

Payment and fulfillment answer different questions and must not be collapsed into one vague “processing” state.

### Future server rule

- order status and payment status remain separate
- transitions are validated server-side
- self-cancellation ends when preparation begins
- customer access is ownership-scoped

### Cancellation and refund policy

Customers may request cancellation through `CONFIRMED`. If the order is unpaid, cancellation releases the stock reservation. If it is paid, cancellation creates a full PayMongo refund to the original payment method. Once the order enters `PREPARING`, the standard cancellation and refund path is closed. Prepared orders and no-shows are non-refundable because the product has already been made.

Order cancellation and refund settlement are separate facts. An order may already be `CANCELLED` while its refund is `REQUESTED` or `PROCESSING`; only a verified PayMongo response or webhook may move the refund to `REFUNDED`. A manual transfer destination is collected only as a restricted fallback when the provider refund is unsupported or fails.

PayMongo checkout sessions must be closed at the provider before an overdue provider-bound order becomes `EXPIRED` and releases ready-stock reservations. The browser return URL never performs this transition. A secret-protected server job coordinates provider expiry first and the atomic database transition second; a provider error leaves the order pending and its stock reserved for a later retry.

## 13. Reviews Instead of Public Feedback

### Decision

There is no public Feedback navigation or general feedback form. Reviews originate only from eligible completed order details.

### Reason

Binding a review to a completed order reduces spam, prevents unrelated submissions, and gives the business useful product and pickup context.

### UI consequence

- completed, unreviewed orders may show Leave a review
- one review is allowed per completed order
- customer email is not displayed publicly
- public cards show the customer display name without the phrase “Verified completed order”
- the completed-order detail opens review entry in a modal that repeats the ordered items, centers the rating controls, and shows the enforced comment limit
- Admin Journal moderates visibility and featured status in the same operational area as public Journal publishing

## 14. Journal Instead of Vlog

### Decision

Journal replaces Vlog.

Journal may contain:

- announcements
- kitchen stories
- product features
- customer stories
- selected reviews
- video

### Reason

“Vlog” incorrectly limits the section to video. Journal supports operational announcements and editorial content without forcing every post into one media format.

### UI consequence

- customer route is `/journal`
- admin route is `/admin/journal`
- `/admin/reviews` redirects to the review section of `/admin/journal` for compatibility
- Admin chooses post type, icon, display date, publication state, text, and optional media
- published posts and featured visible reviews are loaded from the same records moderated by Admin
- old Vlog and Feedback URLs redirect for compatibility

## 15. Admin Mirrors Customer Operations

### Decision

Every admin section must correspond to a real customer or operational need.

| Admin area | Operational purpose | Customer effect |
| --- | --- | --- |
| Dashboard | Prioritize operational attention | Summarizes orders and fulfillment |
| Orders | Manage fulfillment state | Updates My Orders and review eligibility |
| Catalog | Manage boxes, coatings, add-ons, images, and prices | Feeds Our Creations and checkout pricing |
| Inventory | Prevent overselling | Controls available and sold-out states |
| Pickup | Publish serviceable dates, times, and locations | Feeds Checkout pickup controls |
| Customers | Support accounts and loyalty | Uses email-first account records |
| Journal | Publish updates and moderate order-linked reviews | Feeds public Journal posts and Community highlights |

### Reason

Admin screens without a customer or operational consumer create confusing controls and data that nobody uses.

### UI consequence

Every admin page shows:

- Purpose
- Customer impact
- Current connection

Controls that are not connected must not imply that a live customer change occurred.

## 16. Shared Mock Data

### Decision

Customer and admin UI use shared constants when they represent the same domain values.

Currently shared:

- box variants
- base piece price and derived box totals
- coatings and images
- coating/add-on prices
- pickup dates
- pickup times
- pickup locations
- pickup lead time and grace period
- operating days and hours
- ready-stock versus made-to-order availability

Admin Orders and the dashboard order summary now read the same persisted order snapshots available through the protected customer workflow. Other shared operational previews remain explicitly non-persistent until connected.

### Reason

Duplicated page-local mock data caused Admin and Customer to show different products, prices, pickup rules, and statuses.

### Boundary

Shared frontend constants prevent UI drift; they are not database persistence. Admin fulfillment is the first connected mutation surface; other Admin edits remain disabled until their server mutation slice exists.

## 17. Admin Hosting and Security

### Decision

Admin remains under `/admin` during UI development. `admin.tsokolitaw.com` is planned but deferred.

### Reason

Subdomain routing is deployment configuration, not authorization. Moving the UI to a subdomain before authentication does not secure it.

### Future requirement

The server must verify the admin identity/role for every protected page and mutation regardless of hostname.

V1 has one admin permission role shared by up to five approved Google accounts. One identity may be configured initially and the remaining four added later. This means equal-permission administrators, not different roles. Exact identities remain deployment-controlled data and must never be inferred from client state or a hostname.

### Production authentication domain

Production Google authentication will use the branded Supabase custom domain `auth.tsokolitaw.com` so Google account selection does not display the opaque Supabase project reference. The default Supabase domain remains acceptable during development.

Custom-domain activation is deferred until production DNS and a compatible paid Supabase plan are available. Before activation, the branded callback must be added to the Google OAuth client alongside the existing Supabase callback. The old callback remains available until the branded login, refresh, logout, and authorization flows pass production verification.

## 18. Assets and Visual Direction

### Decision

- use the supplied TsokoLitaw logo and favicon
- use local real coating photos
- use Lucide React for missing simple icons
- use placeholders only when an asset is unavailable
- do not introduce another icon or UI library without clear value
- supplied Home feature media is stored locally and shown as responsive photo/video content

### Reason

Real brand and product assets improve trust and remove the inconsistencies caused by generic flavor placeholders.

The Home feature media uses one mobile-first carousel rather than two competing columns. Video plays first, starts muted to satisfy browser autoplay rules, exposes a sound toggle, and advances to the supplied promotional image when it ends. Manual previous, next, and slide-selection controls remain available. The Journal action is centered beneath the carousel as a separate editorial path.

### Admin coating-entry decision

Admin Catalog persists a coating name, customer-facing description, square 1:1 image, allergen information, availability, and additional-type price through controlled audited mutations. The price represents the charge when that coating is used as an additional distinct type; the first coating type in a box remains included.

The connected interaction previews the selected image before upload, then publishes only through authenticated server CRUD, durable storage, cache invalidation, audit logging, and server-authoritative pricing. The obsolete session-only coating preview must not be restored.

### Reason

A consistent square image keeps coating cards and admin rows predictable across mobile and desktop. Separating the coating's additional-type price from its description prepares the catalog for future price changes without redefining the included-first-coating rule.

## 19. Legal and Policy Access

### Decision

Terms and Privacy links belong in the footer and Checkout, not the primary navigation.

### Reason

They must be easy to find and acknowledged at checkout without competing with primary shopping navigation.

The recipe/allergen disclosure and the professor-provided educational Terms & Conditions baseline are approved. The Terms adapt the supplied demonstration clauses to the real physical-food, live-payment, campus-pickup, cancellation, refund, and no-show decisions; they must not describe accepted orders as digital-only consumption. Final Privacy wording still requires business approval before production.

## 20. Inventory Unit and Admin Control

### Decision

Ready stock is counted in individual prepared Palitaw pieces per pickup date and product, not as separate box inventories. All active box sizes consume the same balance using `box quantity × piece count`.

Admin may publish the exact prepared total for a Ready stock or Hybrid date and record damaged, spoiled, or otherwise unusable pieces. These operations use active-Admin-checked server mutations with inventory-adjustment and Admin-audit records. Inventory does not expose a separate online-availability checkbox: an open pickup date with remaining stock accepts checkout, while closing the pickup date or exhausting stock stops it.

Made to order, Ready stock, and Hybrid all use the same website checkout and online payment flow. The modes control preparation timing and stock enforcement, not the payment channel. V1 does not accept cash or untracked walk-in sales.

Every mode requires an explicitly published pickup date. Made to order uses that date's lead-time and cutoff rules without prepared inventory. Ready Stock requires an exact prepared-piece upper limit for that date. Hybrid consumes prepared pieces for same-day checkout and uses made-to-order rules for eligible advance orders.

### Reason

The kitchen prepares individual Palitaw balls before they are packed into 4-, 6-, or 8-piece boxes. Separate box balances would incorrectly strand pieces in one box size and could oversell the real shared supply. A ten-piece balance must allow two boxes of four and leave two pieces.

The published total is a lifetime cap for that pickup-date inventory record, not a rolling daily or all-time dashboard number. It cannot be reduced below pieces already committed to orders or removed as waste because that would make the balance negative. A newly published date starts its own independent total.

### Boundary

Catalog availability controls whether a box size, coating, or add-on is offered at all. Daily Inventory controls only date-specific prepared product pieces. Coating and add-on quantity tracking remains optional for V1; their active flags remain the current availability control.

## 21. Git Workflow

### Decision

The user performs Git staging, commits, and pushes manually.

Agents report:

- completion status
- validation results
- changed scope
- unresolved issues
- suggested Conventional Commit messages and modular commit groups

Agents do not stage, commit, or push.
