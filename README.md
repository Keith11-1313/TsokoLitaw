# TsokoLitaw

TsokoLitaw is a mobile-first storefront and administration interface for a Filipino chocolate-filled Litaw business operating through campus pickup.

## Decision Record

[`DECISIONS.md`](DECISIONS.md) explains the product, workflow, UI, and architecture decisions made during review. It records why navigation was simplified, why products are modeled as boxes and coatings, why reviews are order-linked, why Vlog became Journal, how Admin relates to Customer, and what remains intentionally unconnected.

Read it before changing established workflows. The rough PNG references do not override these approved decisions.

## Current Status

The project is in **Phase 7: Supabase foundation**. The UI still uses mock/browser-local data while the backend schema is validated and later integrations remain deferred.

Implemented with mock data:

- responsive customer and admin interfaces
- product catalog with real coating photography
- mobile-first Home carousel with supplied promotional photo, muted-autoplay video, sound control, and automatic image advancement
- 4-, 6-, and 8-piece box configuration
- single-coating and mixed-box selection
- browser-local cart with quantity and totals
- static checkout, account, profile, order, review, payment, and legal screens
- frontend-only signed-in and signed-out preview state for testing protected account screens
- Journal for announcements, stories, product features, and community highlights
- responsive admin dashboard and management screens
- admin purpose/customer-impact/connection guidance on every management area
- Admin coating-entry session preview with square-image validation and PHP additional-type pricing

Phase 7 backend foundation (deployed and verified):

- versioned PostgreSQL schema, constraints, indexes, and RLS policies
- controlled product, coating, pickup-location, and operational-setting seeds
- pgTAP authorization checks
- separate browser, server, and service-role Supabase clients
- five-admin database limit and service-only bootstrap function

Not yet implemented:

- runtime UI data access through the linked Supabase project
- Google authentication
- PayMongo
- APIs, webhooks, email, or real CRUD
- server-authoritative pricing and inventory
- admin authorization or admin subdomain routing

All current customer, order, payment, account, and admin data is mock data. Disabled actions identify features that require future backend work.

Customer Catalog and Checkout currently share their mock commerce and pickup constants with the matching admin screens. This keeps the UI previews aligned, but admin controls do not persist changes until a database and server mutations are implemented.

The Admin Catalog can temporarily add a coating preview with name, description, a 1:1 image, and additional-type price. The preview exists only in the current page session and is not published to Our Creations.

The account preview starts signed in so Profile and My Orders can be reviewed. Logging out stores a frontend-only signed-out state and redirects protected account pages to Login. Login can restore the preview state; this does not authenticate or create an account.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript 5 in strict mode
- Tailwind CSS 4
- ESLint 9
- Lucide React
- Supabase JavaScript and SSR clients
- Supabase CLI
- Next.js fonts and image optimization

Future services:

- Supabase PostgreSQL and Google authentication
- PayMongo payments
- Resend transactional email
- Vercel hosting
- `tsokolitaw.com`
- planned admin host: `admin.tsokolitaw.com`

## Customer Routes

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

Compatibility redirects currently remain at `/vlog` and `/feedback`.

The main navigation contains Home, Our Creations, and Journal. My Orders is account-scoped and is available from the Account menu and Profile—not the main navbar.

## Admin Routes

```text
/admin
/admin/orders
/admin/products
/admin/inventory
/admin/pickup
/admin/promotions
/admin/customers
/admin/reviews
/admin/journal
/admin/settings
```

Admin pages remain under `/admin` until subdomain routing, authentication, and server authorization are implemented. Compatibility redirects remain for older admin URLs.

## Current Product Model

Temporary UI prices:

- Base price per piece — ₱10
- Box of 4 — ₱40 (`4 × ₱10`)
- Box of 6 — ₱60 (`6 × ₱10`)
- Box of 8 — ₱80 (`8 × ₱10`)
- First coating type included
- Each additional coating type — temporary ₱5 seed, configurable by Admin
- Extra sea salt cream — ₱18 per cup

Coatings:

- Cocoa
- Milk
- Palitaw: sugar, niyog, and sesame seeds
- Crushed Nuts
- Plain
- Sesame Seeds
- Cookies and Cream

Mixed boxes allocate every piece to a coating. The allocated piece count must equal the selected box size.

These browser values are previews. Future checkout pricing must be recalculated from database values on the server.

The ₱10 per-piece amount is approved as the provisional database seed. Authorized admins will manage the active base piece price, and each box total will be derived from its piece count. The ₱5 additional-coating charge is also only a seed and will come from the coating price configured in Admin. Completed orders preserve immutable price snapshots. Pickup locations, schedules, lead time, cutoff, capacity, and availability will likewise be admin-managed without rewriting existing paid-order pickup snapshots.

Pickup is centered at UCC Congress: 3rd Floor and Covered Court. Monday–Saturday, 7:00 AM–7:00 PM is the operating window, but Admin publishes the actual dates and slots. Most orders are made to order; when products are brought to school, Admin can publish ready stock for same-day pickup until it is sold out.

The provisional made-to-order defaults are one day of lead time, a 5:00 PM daily cutoff, hourly slots, and 20 boxes per slot. These are operational Admin settings, not permanent storefront rules.

V1 uses one equal-permission admin role supporting five approved Google accounts. One account may be configured first and four added later. Customers may cancel through `CONFIRMED`; paid cancellations receive a full refund to the original PayMongo payment method. Cancellation and standard refund eligibility end at `PREPARING`, and no-shows are non-refundable. Order cancellation and refund processing remain separately tracked.

## Project Structure

```text
AGENTS.md
ARCHITECTURE.md
DATABASE.md
DECISIONS.md
DESIGN.md
README.md
REQUIREMENTS.md
TASKS.md

public/
├── brand/
├── images/
│   ├── home/
│   └── products/coatings/
└── videos/home/

src/
├── app/                 # App Router pages
├── components/
│   ├── admin/
│   ├── cart/
│   ├── checkout/
│   ├── creations/
│   ├── customer/
│   ├── feedback/       # Order-linked review UI
│   ├── home/
│   ├── layout/
│   ├── orders/
│   └── ui/
├── lib/                 # Mock domain data and Supabase client helpers
└── types/

supabase/
├── migrations/          # Versioned database schema and RLS
├── tests/database/      # pgTAP database checks
├── config.toml          # Local Supabase configuration
└── seed.sql             # Controlled non-PII seed data
```

## Local Development

Install dependencies once:

```bash
npm install
```

Start development:

```bash
npm run dev
```

If port 3000 is already occupied by this project, Next.js may report the existing server or select another port. Stop the earlier terminal process before starting a second development server.

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Supabase setup

Copy `.env.example` to `.env.local` and fill in the project URL and publishable key. Keep the service-role key and initial admin email server-only; never commit them.

With Docker running, validate the local database:

```bash
npm run supabase:start
npm run db:reset
npm run db:lint
npm run db:test
```

To verify the linked hosted development project without resetting it, start Docker Desktop first. The CLI still uses a local container for the pgTAP runner even though the database target is remote:

```bash
npm run db:lint:linked
npm run db:test:linked
```

To connect a hosted project, authenticate the CLI, link the project reference, review a dry run, and then push the migration. Seed data is appropriate for local/development environments; review it before applying to production. The approved initial Google identity must sign in once before trusted server-side setup invokes `promote_admin_by_email`.

## Assets and References

- The current logo is stored in `public/brand/logo.png` and is also used for the favicon.
- Product photos are stored in `public/images/products/coatings/`.
- Supplied Home promotional media is stored in `public/images/home/` and `public/videos/home/`.
- PNG files in `references/` are retained as early visual direction and project history.
- References must not be embedded as pages and are no longer pixel-perfect implementation requirements.
- The implemented design system and approved product decisions take precedence over rough reference details.

## Deployment

The public GitHub repository can be connected to Vercel during UI development. The current static/mock UI does not call Supabase yet, so missing Supabase values do not affect existing pages.

Future transactional order email will use Resend from server-only code. Production sending requires a verified domain or sending subdomain; API keys and webhook secrets belong only in protected local/Vercel environment settings.

Do not add production secrets until the corresponding backend integration begins. Never commit `.env.local`.

## Git Workflow

The user performs Git operations manually. Agents must report completion, validation results, changed files, and a suggested Conventional Commit message. Agents must not stage, commit, or push.
