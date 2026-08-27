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

## 2. Current UI Architecture

```text
Next.js App Router
├── Server Components for static page composition
├── Client Components for interactive UI
├── Tailwind CSS design tokens
├── Shared commerce and pickup mock-domain modules
├── localStorage cart
├── localStorage account-state preview
└── Local brand and product assets
```

A local Supabase foundation now defines the planned PostgreSQL schema, RLS policies, tests, controlled seeds, and browser/server/service-role client helpers. The UI is not connected to it yet, and there is still no authentication, payment provider, API, webhook, or email integration.

Current customer/admin relationship:

```text
Shared mock commerce data
├── Our Creations
├── Admin Catalog
└── Admin coating session previews (not published)

Shared mock pickup data
├── Checkout
├── Admin Pickup
└── Admin Settings defaults

Aligned mock orders
├── Customer My Orders
├── Admin Orders
└── Dashboard summaries
```

This relationship prevents UI drift. It does not make admin controls persistent or secure.

Client Components are limited to interactions such as:

- cart state and persistence
- product configuration
- custom dropdowns
- account preview menu
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

## 4. Routing

Customer routes are public under the main application. Account, checkout, order, and review routes will require authentication when Supabase is implemented.

Admin routes currently live under `/admin` for static UI development. The planned `admin.tsokolitaw.com` host is deferred. Future host routing may map the subdomain to `/admin`, but must not replace server-side admin authorization.

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
├── lib/                 # Shared commerce, pickup, and order mock data
└── types/               # Explicit domain types
```

Business rules should move out of presentation components as backend work begins.

Customer and admin previews must consume shared mock constants where they represent the same operational data. Admin Catalog and Our Creations share commerce constants; Admin Pickup and Checkout share pickup constants. This prevents UI drift but is not persistence or backend connectivity.

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
- versioned migrations under `supabase/migrations/`
- controlled operational seeds in `supabase/seed.sql`
- pgTAP authorization checks under `supabase/tests/database/`
- separate browser, server, and service/admin client helpers under `src/lib/supabase/`

Google authentication and live data integration remain deferred. Local/Vercel product assets remain sufficient, so Supabase Storage is not required in Phase 7.

Never expose service-role credentials. RLS is defined on every exposed table before customer data is connected. Direct customer-facing mutations remain unavailable until later server-commerce work can validate authorization, pricing, stock, and snapshots.

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

Payment webhook events require a provider event ID uniqueness constraint and idempotent processing.

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

Only values intentionally prefixed with `NEXT_PUBLIC_` may be available to the browser. Supabase service-role, initial admin identity, PayMongo, and Resend secrets remain server-only deployment configuration. Never commit `.env.local` or real secrets.

## 14. Deployment

- UI preview: GitHub → Vercel
- production app: Vercel
- database/auth/storage: Supabase
- payments: PayMongo
- transactional email: Resend using a verified domain or sending subdomain
- customer domain: `tsokolitaw.com`
- planned admin domain: `admin.tsokolitaw.com`

Use PayMongo test mode and non-production Supabase configuration before live rollout.

## 15. Principles

1. One codebase for V1.
2. Server-authoritative money, stock, permissions, and payment state.
3. RLS plus server-side authorization.
4. Immutable order snapshots.
5. Configurable operational values.
6. Minimal dependencies.
7. Accessible, mobile-first UI.
8. Explicit mock/deferred behavior during the UI phase.
