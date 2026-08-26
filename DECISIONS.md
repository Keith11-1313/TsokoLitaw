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

The current milestone is UI-only.

Allowed now:

- React and Tailwind UI
- mock data
- local component state
- browser-local cart and account-preview state
- responsive and keyboard-accessible interaction
- disabled or temporary mock admin controls

Deferred until separately approved:

- Supabase
- Google authentication
- PayMongo
- APIs, server actions, webhooks, email, and real CRUD
- database persistence
- production authorization
- admin subdomain and DNS configuration

### Reason

The customer workflow and operational model are still being refined. Connecting a backend before those decisions stabilize would create migrations, security policies, and integrations around incorrect assumptions.

### UI consequence

The UI may demonstrate state and navigation, but it must not pretend that accounts, payments, stock, or admin changes are real. Backend-dependent actions are disabled or explicitly labeled as mock behavior.

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
- signed-out Account opens Login
- protected Profile and Orders routes redirect signed-out users to Login

## 6. Authentication Preview

### Decision

A frontend-only signed-in/signed-out preview exists for UI testing. It is not authentication.

### Reason

Both account states must be reviewable before Supabase is connected. A static page showing Profile and Sign in simultaneously created an impossible state.

### UI consequence

- the preview begins signed in so Profile and Orders can be inspected
- Log out stores a local signed-out preview state
- Login can restore the signed-in preview
- Google Sign-In remains disabled and clearly marked as deferred
- future Supabase sessions will replace this provider and route gate

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
- extra sea salt cream is a separate optional add-on, temporarily ₱18 per cup

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

The cart persists in browser local storage. Checkout reads the same local cart but does not create a real order or payment.

### Future server rule

Submit identifiers, counts, and quantities—not trusted prices. The server validates the session, product availability, stock, promotions, terms acceptance, and final total before creating an order.

## 11. Campus Pickup

### Decision

V1 uses campus pickup only.

Current mock choices:

- UCC North Congress Campus — Social Hall
- UCC North Congress Campus — Court
- published dates and times from shared pickup mock data
- one-day lead time
- no same-day pickup
- 15-minute grace period

The future database treats locations, published dates, time windows, lead time, cutoff time, capacity, and availability as admin-managed operational configuration. Current mock values may seed the first backend environment, but operations can replace them before launch. Existing paid orders preserve their selected pickup details as historical snapshots.

### Reason

Delivery addresses and delivery-hour UI did not match the actual operating model. Pickup scheduling keeps fulfillment practical for a student-operated business.

### UI consequence

Checkout exposes date, time, and location dropdowns. Admin Pickup exists to publish those customer-facing options and explain the operational rules.

## 12. Orders and Status Workflow

### Decision

Customer Orders shows current orders and history. Order detail explains fulfillment progress, pickup, payment summary, cancellation eligibility, and review eligibility.

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
- Admin Reviews moderates visibility and featured status

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
| Promotions | Define eligibility and benefits | Changes future cart/checkout totals |
| Customers | Support accounts and loyalty | Uses email-first account records |
| Reviews | Moderate order-linked reviews | Controls public review visibility |
| Journal | Publish announcements and stories | Feeds the public Journal |
| Settings | Centralize cross-feature operational defaults | Affects contact, pickup, email, and loyalty |

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

Admin and customer mock orders are aligned to the same approved catalog, totals, and statuses.

### Reason

Duplicated page-local mock data caused Admin and Customer to show different products, prices, pickup rules, and statuses.

### Boundary

Shared frontend constants prevent UI drift; they are not database persistence. Admin edits remain disabled until real server mutations exist.

## 17. Admin Hosting and Security

### Decision

Admin remains under `/admin` during UI development. `admin.tsokolitaw.com` is planned but deferred.

### Reason

Subdomain routing is deployment configuration, not authorization. Moving the UI to a subdomain before authentication does not secure it.

### Future requirement

The server must verify the admin identity/role for every protected page and mutation regardless of hostname.

V1 has one admin permission role shared by up to five approved Google accounts. One identity may be configured initially and the remaining four added later. This means equal-permission administrators, not different roles. Exact identities remain deployment-controlled data and must never be inferred from client state or a hostname.

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

Admin Catalog previews collect a coating name, customer-facing description, square 1:1 image, and additional-type price. The price represents the charge when that coating is used as an additional distinct type; the first coating type in a box remains included.

The current interaction adds the entry only to in-memory page state. It is intentionally marked as a session preview because publishing it to Our Creations requires authenticated server CRUD, durable storage, and server-authoritative pricing.

### Reason

A consistent square image keeps coating cards and admin rows predictable across mobile and desktop. Separating the coating's additional-type price from its description prepares the catalog for future price changes without redefining the included-first-coating rule.

## 19. Legal and Policy Access

### Decision

Terms and Privacy links belong in the footer and Checkout, not the primary navigation.

### Reason

They must be easy to find and acknowledged at checkout without competing with primary shopping navigation.

The recipe/allergen disclosure is approved. Final general legal and privacy wording still requires business approval before production; the cancellation, refund, and no-show policy is already approved separately.

## 20. Git Workflow

### Decision

The user performs Git staging, commits, and pushes manually.

Agents report:

- completion status
- validation results
- changed scope
- unresolved issues
- suggested Conventional Commit messages and modular commit groups

Agents do not stage, commit, or push.
