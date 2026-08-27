# TsokoLitaw — Architecture

## 1. Goal

Build a maintainable mobile-first storefront and admin interface in one Next.js codebase. Avoid microservices in V1.

## Decision Traceability

Architecture follows the workflows and rationale in `DECISIONS.md`. A UI decision is not isolated presentation work when it changes domain meaning. For example:

- changing flavors to coatings changes catalog types, pricing validation, order snapshots, and admin controls
- moving reviews behind completed orders changes authorization, uniqueness constraints, and moderation flow
- using email as primary contact changes profile requirements and notification planning
- campus pickup removes delivery-address data and adds controlled date/time/location records
- moving My Orders into Account changes route protection and authentication behavior

Update the architecture and proposed database whenever an approved UI decision changes one of these domain rules.

## 2. Current Application Architecture

```text
Next.js App Router
├── Server Components for static page composition
├── Client Components for interactive UI
├── Tailwind CSS design tokens
├── Supabase-backed customer catalog and pickup read models
├── localStorage cart as an untrusted browser convenience
├── Supabase Google OAuth and cookie-backed sessions
├── Server-protected customer and Admin routes
└── Local brand and product assets
```

The Supabase foundation defines the PostgreSQL schema, RLS policies, tests, controlled seeds, and browser/server/privileged client helpers. Google OAuth and authenticated profile access are connected. Active products, variants, coatings, add-ons, and published pickup options load from Supabase. Phase 9 validates and reprices checkout server-side, evaluates active promotions, reserves inventory, creates immutable pending-order snapshots, records Terms acceptance, prevents duplicate submissions, and expires overdue unpaid reservations. Customer and Admin self-checkout are validated against hosted development. Phase 10 now has a server-only PayMongo v2 test client with a stable idempotency-key contract; checkout redirection remains disabled until provider-reference persistence and signed webhook processing are connected. Email and broad Admin CRUD remain unconnected.

Current customer/admin relationship:

```text
Database commerce catalog
└── Our Creations

Shared mock commerce data
├── Admin Catalog
└── Admin coating session previews (not published)

Database-published pickup data
└── Checkout

Shared mock pickup data
├── Admin Pickup
└── Admin Settings defaults

Admin-only mock orders
├── Admin Orders
└── Dashboard summaries

Authenticated customer order surfaces
├── My Orders honest unconnected state
└── Dynamic order/review routes unavailable until scoped database reads exist
```

Customer catalog and pickup reads now reflect the linked database. Admin previews remain non-persistent and cannot publish changes yet.

Client Components are limited to interactions such as:

- cart state and persistence
- successful add-to-cart confirmation modal
- product configuration
- custom dropdowns
- authenticated account menu and shared confirmation-based logout
- admin mobile drawer
- mock forms and dialogs
- square-image validation and in-memory coating previews
- Home feature-carousel state, muted autoplay, and video-ended slide transition

## 3. Future Production Architecture

```text
Customer or Admin Browser
            |
            v
Next.js on Vercel
   |          |          |
   v          v          v
Supabase   PayMongo     Resend
Postgres   Payments   Transactional email
Auth
Storage
```

Next.js server responsibilities:

- session and authorization checks
- request validation
- server-authoritative pricing
- promotion and loyalty calculation
- stock reservation and release
- order creation and snapshots
- PayMongo checkout creation
- webhook verification and idempotency
- idempotent Resend email dispatch and delivery-event handling
- terms acceptance recording
- admin mutations

Phase 9 uses a two-layer checkout boundary. Next.js accepts only catalog identifiers, coating allocations, add-on counts, and quantities; it reloads current database prices and evaluates active promotion configuration. It then calls the service-role-only `create_pending_order` PostgreSQL function with the trusted snapshot projection. That function first expires overdue unpaid orders, releases any corresponding ready-stock reservations, then atomically locks the customer and pickup window, enforces capacity, reserves required ready stock, writes the order graph and Terms acceptance, and returns an existing order when the same customer idempotency key is retried. Browser clients receive no direct execute permission on either commerce writer.

## 4. Routing

Customer routes are public under the main application. Account, checkout, order, and review routes require a verified Supabase session.

Admin routes remain under `/admin` and require both a verified Supabase session and a server-loaded `profiles.role = 'admin'`. Signed-in non-Admins receive the global Not Found boundary at the requested Admin URL, without a dedicated authorization redirect or disclosed administrator approval details. The planned `admin.tsokolitaw.com` host is deferred. Future host routing may map the subdomain to `/admin`, but must not replace server-side admin authorization.

Legacy compatibility redirects:

- `/vlog` → `/journal`
- `/feedback` → `/journal`
- `/admin/vlog` → `/admin/journal`

## 5. Frontend Layers

```text
src/
├── app/                 # Routes, metadata, page composition
├── components/
│   ├── admin/           # Admin shells, tables, cards, mock actions
│   ├── cart/            # Provider and cart UI
│   ├── checkout/        # Static checkout UI
│   ├── creations/       # Product catalog/configurator
│   ├── customer/        # Header, footer, page shells
│   ├── feedback/        # Order-linked review UI
│   ├── home/            # Home and Journal visual sections
│   ├── layout/          # Content containers
│   ├── orders/          # Order list/detail UI
│   └── ui/              # Shared controls and tokens
├── lib/                 # Server commerce reads plus remaining mock domain data
└── types/               # Explicit domain types
```

Commerce business rules belong in server modules and database functions rather than presentation components.

Our Creations consumes the active database catalog, and Checkout consumes published database pickup options. Admin Catalog and Admin Pickup still use preview data until their CRUD phase; they must be clearly labeled and must not imply that preview changes have been published.

The Admin coating form may create an in-memory preview containing name, description, a square image data URL, and an additional-type price. That object is deliberately page-session-only and must not be merged into the customer catalog. Future implementation replaces the data URL with a validated storage upload and publishes a database record through an authorized server mutation.

## 6. Current Cart

The UI cart is exposed through `CartProvider` and persisted under a browser-local storage key.

It supports add, remove, quantity, subtotal, and clear operations. It is deliberately non-authoritative and must not be treated as an order record.

Future checkout flow:

1. Send configuration identifiers and quantities to the server.
2. Reload active product, coating, add-on, promotion, and stock records.
3. Validate mixed-box counts and availability.
4. Recalculate all prices.
5. Create immutable order snapshots.

## 7. Supabase

Phase 7 foundation:

- PostgreSQL
- one squashed production bootstrap migration under `supabase/migrations/`
- controlled operational seeds in `supabase/seed.sql`
- pgTAP authorization checks under `supabase/tests/database/`
- separate browser, server, and service/admin client helpers under `src/lib/supabase/`

Google authentication and profile integration are active. Live commerce data integration remains deferred. Local/Vercel product assets remain sufficient, so Supabase Storage is not currently required.

Never expose privileged Supabase credentials. RLS is defined on every exposed table before customer data is connected. Direct customer-facing commerce mutations remain unavailable until later server-commerce work can validate authorization, pricing, stock, and snapshots.

## 8. Authentication and Authorization

```text
Google Sign-In
      |
      v
Supabase Auth
      |
      v
Profile + scoped session
```

- Customer authorization is ownership-based.
- Admin authorization is server-side role/identity validation.
- UI route visibility is not authorization.
- No guest checkout in V1.
- Active Admin identities may use customer checkout for their own orders; the server action always uses the authenticated profile as the owner.
- Account deletion remains an authenticated RPC plus secret-protected daily processor. Phase 9 separately authorizes server commerce reads and the narrowly scoped mutations required for validated checkout and inventory; it does not authorize broad Admin CRUD, payment, or email APIs.
- The processor rechecks active orders/refunds and permanently flips the due profile to inactive without deleting Auth or relational records.
- Accounts pending deletion may access Profile and order history but cannot begin a new checkout.
- Inactive profiles fail RLS and server authorization checks. OAuth callback handling clears any newly exchanged session and redirects to the deleted-account screen.

V1 supports five approved Google identities under one shared admin role. One identity may bootstrap Admin now and four may be added later through controlled backend data. Authorization is checked on every admin route and mutation, independent of the `/admin` path or any future hostname.

## 9. Pricing and Product Configuration

- Product variants represent 4-, 6-, and 8-piece boxes.
- Each box base total is `variant piece count × the product's current admin-managed price per piece`.
- Coatings are selectable per box or per piece.
- The first distinct coating type is included.
- Each additional distinct type adds that coating's configurable additional-type charge.
- The current ₱5 additional-type amount is a seed loaded from catalog data, not a permanent constant.
- Add-ons such as extra sea salt cream are separate records.

Store IDs and counts from the client, then calculate money from database records on the server. Preserve names, counts, and prices as order snapshots.

The current ₱10-per-piece mock amount becomes the provisional database seed, producing initial 4-, 6-, and 8-piece totals of ₱40, ₱60, and ₱80. Admin edits update the active per-piece catalog price for future carts and checkouts only; box-size labels do not carry permanent fixed prices, and edits never mutate historical order snapshots.

## 10. Payments

```text
Validated cart
→ PENDING_PAYMENT order
→ Reserve stock
→ PayMongo checkout
→ Verified webhook
→ Payment record
→ Confirm order
```

The browser success page is informational. Only verified server-side provider events may mark payment paid.

PayMongo checkout creation is server-only and uses a stable idempotency key derived from the internal payment UUID. One payment row is allowed per order, and a checkout session can be attached to it only once. The webhook route verifies the timestamped test signature against the untouched request body before parsing. Its database transition deduplicates by checkout/payment event key and requires the provider checkout ID, payment ID, order UUID, kiosk order number, PHP amount, and pending states to match in one transaction. Redirect success is never treated as payment proof, and raw billing payloads are not retained.

Standard cancellation is allowed only before `PREPARING`. Unpaid cancellations release reserved stock; paid cancellations create a full refund to the original payment method. Refund lifecycle is tracked separately from order cancellation, and only verified provider events may confirm completion. Prepared and no-show orders are non-refundable. A restricted manual destination is collected only after an unsupported or failed provider refund.

## 11. Inventory

Recommended V1 inventory:

- stock total by date and box variant
- reserved quantity
- sold quantity
- coating/add-on availability
- atomic reservation and release operations

```text
available = stock_total - stock_reserved - stock_sold
```

Expired payment reservations must be released safely.

Pickup locations, dates, time windows, lead days, cutoff time, capacity, and availability mode are admin-managed database records or settings. Made-to-order is the default; Admin can publish same-day ready-stock options when products are brought to school. Offline/walk-in stock changes must be recorded so checkout does not oversell. Checkout reads only published, currently eligible options. Paid orders preserve pickup snapshots so later admin edits do not rewrite existing commitments.

## 12. Orders, Reviews, and Journal

- Order and payment statuses are separate.
- Customers read only their own orders.
- Reviews belong to a completed order and its customer.
- Enforce one review per order.
- Public Journal highlights expose only approved display data.
- Journal posts support content type, publication state, and optional media.

## 13. Environment Variables

Add only when the corresponding integration begins:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=

# Local .env.local only; used by npm run admin:bootstrap
INITIAL_ADMIN_EMAIL=

PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
PAYMONGO_WEBHOOK_SECRET=

RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM_ADDRESS=
EMAIL_REPLY_TO_ADDRESS=

NEXT_PUBLIC_SITE_URL=
```

Only values intentionally prefixed with `NEXT_PUBLIC_` may be available to the browser. The Supabase secret key, initial admin identity, PayMongo, and Resend secrets remain server-only deployment configuration. Never commit `.env.local` or real secrets.

## 14. Deployment

- UI preview: GitHub → Vercel
- production app: Vercel
- database/auth/storage: Supabase
- production authentication endpoint: `auth.tsokolitaw.com` through the Supabase custom-domain add-on
- payments: PayMongo
- transactional email: Resend using a verified domain or sending subdomain
- customer domain: `tsokolitaw.com`
- planned admin domain: `admin.tsokolitaw.com`

Use PayMongo test mode and non-production Supabase configuration before live rollout.

The default Supabase project domain is accepted for development OAuth. Production custom-domain activation requires DNS verification and TLS readiness, the branded callback in Google Auth Platform, the custom Supabase URL in Vercel, and an end-to-end session/authorization smoke test. Keep the original Supabase callback configured until the branded flow is verified.

## 15. Principles

1. One codebase for V1.
2. Server-authoritative money, stock, permissions, and payment state.
3. RLS plus server-side authorization.
4. Immutable order snapshots.
5. Configurable operational values.
6. Minimal dependencies.
7. Accessible, mobile-first UI.
8. Explicit mock/deferred behavior during the UI phase.
