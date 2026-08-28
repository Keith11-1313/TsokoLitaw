# TsokoLitaw

TsokoLitaw is a mobile-first storefront and administration interface for a Filipino chocolate-filled Litaw business operating through campus pickup.

## Decision Record

[`DECISIONS.md`](DECISIONS.md) explains the product, workflow, UI, and architecture decisions made during review. It records why navigation was simplified, why products are modeled as boxes and coatings, why reviews are order-linked, why Vlog became Journal, how Admin relates to Customer, and what remains intentionally unconnected.

Read it before changing established workflows. The rough PNG references do not override these approved decisions.

## Current Status

**Phase 10: PayMongo Test Mode is active.** Authentication, authorization, and Phase 9 server commerce are complete. Checkout performs server-authoritative pricing, promotion evaluation, inventory reservation/release, order snapshots, Terms acceptance, and idempotent pending-order creation. Hosted customer and Admin checkout proofs produced shared kiosk numbers `TL-0001` and `TL-0002`. The active payment scope uses PayMongo test credentials only; live charges, email, and broad Admin CRUD remain deferred.

Implemented with mock data:

- responsive customer and admin interfaces
- product catalog with real coating photography
- mobile-first Home carousel with supplied promotional photo, muted-autoplay video, sound control, and automatic image advancement
- 4-, 6-, and 8-piece box configuration
- single-coating and mixed-box selection
- browser-local cart with quantity and totals
- add-to-cart confirmation with a static cart icon, Continue shopping, and Check cart actions
- static order, review, payment, and legal commerce screens
- authenticated account, profile, and logout interfaces
- Journal for announcements, stories, product features, and community highlights
- responsive admin dashboard and management screens
- admin purpose/customer-impact/connection guidance on every management area
- Admin coating-entry session preview with square-image validation and PHP additional-type pricing

Phase 7 backend foundation (deployed and verified):

- versioned PostgreSQL schema, constraints, indexes, and RLS policies
- controlled product, coating, pickup-location, and operational-setting seeds
- pgTAP authorization checks
- separate browser, server, and privileged Supabase clients
- five-admin database limit and service-only bootstrap function

Phase 8 authentication foundation:

- Google OAuth PKCE initiation and callback handling
- cookie refresh through the Next.js proxy
- verified server-side guards for checkout, profile, orders, reviews, and Admin
- ownership-scoped profile editing
- controlled initial Admin bootstrap command and in-place non-Admin Not Found state
- confirmation-based logout that clears the session and returns to Home
- in-place global Not Found treatment for signed-in customers who attempt to open Admin routes
- Profile danger zone with cancellable 90-day account-deletion scheduling
- secret-protected daily processing that permanently deactivates due profiles while preserving Auth identities and relational records
- deleted-account login bounce that clears the new session and explains the disabled access

Phase 9 server-commerce work completed so far:

- active products, box variants, coatings, add-ons, and their current prices load from Supabase
- box totals derive from the database product price per piece
- additional coating types use their individual database-configured prices
- Checkout uses the authenticated profile rather than mock customer details
- Checkout lists only database-published pickup dates, windows, and locations and shows an honest unavailable state when none are published
- untrusted cart IDs and counts are validated and repriced against the active catalog on the server
- the canonical schema includes a service-only atomic pending-order writer for capacity checks, ready-stock reservation, immutable snapshots, Terms acceptance, and duplicate-submit protection
- Checkout submits only catalog identifiers and counts to a server action; browser prices are ignored and active database prices are recalculated
- overdue unpaid orders become `EXPIRED` and release ready-stock reservations before new checkout capacity is accepted
- the controlled seed includes the current Terms version required for checkout acceptance snapshots
- active Admin identities can place their own storefront orders, and new orders use a shared short number such as `TL-0001`

Phase 10 payment foundation completed so far:

- PayMongo test credentials are loaded only from local server environment variables
- the server-only client targets PayMongo v2 Hosted Checkout and rejects live secret keys or live checkout responses
- checkout requests carry a stable idempotency key so a safe retry cannot create a duplicate provider session
- the canonical schema creates at most one payment per order and immutably stores its checkout and payment references
- the test webhook verifies PayMongo's timestamped raw-body signature and atomically deduplicates exact paid-order transitions
- Checkout creates or reloads one idempotent PayMongo test session and redirects to Hosted Checkout
- the success return reloads the owned order and never treats the browser redirect as payment proof
- overdue provider-bound orders close the PayMongo checkout before the database releases reserved stock
- local and hosted validation cover provider-reference persistence, paid-webhook processing, and coordinated expiry; the end-to-end hosted payment smoke test remains pending

Phase 11 customer-order work started by product-owner request:

- My Orders now loads only the authenticated profile's persisted order snapshots
- All, Received, Preparing, Ready for pickup, and Completed filters organize real statuses without changing them in the browser
- order-detail and completed-order review mutations remain pending

Not yet implemented or externally configured:

- initial Admin promotion and the remaining live authorization checks
- hosted PayMongo schema deployment, webhook registration, and customer redirection
- payment expiry coordination and refunds
- email or real CRUD other than the approved account-deletion lifecycle
- admin authorization or admin subdomain routing

Customer identity, account state, catalog, published pickup options, and pending-order persistence are live Supabase data. Payments and Admin operational screens remain mock or unconnected. Disabled actions identify features that require future backend work.

Our Creations and Checkout now read customer-safe commerce and pickup data from Supabase. Matching Admin screens remain non-persistent previews until Admin CRUD is implemented.

The Admin Catalog can temporarily add a coating preview with name, description, a 1:1 image, and additional-type price. The preview exists only in the current page session and is not published to Our Creations.

Signed-out visitors are redirected to Login when opening checkout, Profile, My Orders, order details, or eligible review routes. A Google session creates a customer profile through the database trigger. Admin routes require both a verified session and the protected `admin` profile role; signed-in customers who attempt to open them receive the global Not Found page while the requested Admin URL remains in the address bar. Logout always requires confirmation and returns to Home after the Supabase session is cleared.

Customers may schedule account deletion from Profile. The request remains cancellable for 90 days, blocks new checkout, and cannot begin while orders or refunds are active. At the deadline, a trusted scheduled job rechecks eligibility and permanently marks the profile inactive without deleting the Supabase Auth identity or linked operational records. RLS and server checks deny inactive profiles. A later Google sign-in is immediately cleared and redirected to the Account deleted screen. The external Google account is unaffected.

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

These catalog values now come from Supabase, but browser totals remain estimates. Phase 9 must recalculate the final checkout price from current database values on the server.

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
├── migrations/          # Single production bootstrap schema and RLS
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

The route-level loading screen uses Boneyard. After changing its fixture layout while the dev server is running on port 3000, regenerate the responsive bones with:

```bash
npm run skeleton:build
```

### Supabase setup

Copy `.env.example` to `.env.local` and fill in the project URL and publishable key. Keep the Supabase secret key and initial admin email server-only; never commit them.

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

To connect a fresh production project, authenticate the CLI, link the project reference, review a dry run, and then push the single bootstrap migration. Seed data is appropriate for local/development environments; review it before applying to production. Do not push the squashed bootstrap file to the existing hosted development project merely to align migration history. The approved initial Google identity must sign in once before trusted server-side setup invokes `promote_admin_by_email`.

### Google authentication setup

1. In Google Auth Platform, create an OAuth client with application type **Web application**.
2. Add `http://localhost:3000` as an authorized JavaScript origin.
3. Add the callback URL shown on the Supabase **Authentication → Providers → Google** page as an authorized redirect URI. It has the form `https://PROJECT_REF.supabase.co/auth/v1/callback`.
4. Enable Google in the Supabase provider page and enter the Google client ID and secret there.
5. In Supabase **Authentication → URL Configuration**, set the development Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL.
6. Restart the Next.js development server and sign in through `/login` with the approved initial Admin Google account.
7. After that first sign-in creates the profile, promote only the deployment-configured identity:

```bash
npm run admin:bootstrap
```

The bootstrap command reads `INITIAL_ADMIN_EMAIL` and the Supabase secret key from `.env.local`. It never accepts an email from browser input. Additional approved administrators can use the same controlled process later, up to the database-enforced maximum of five.

### Account-deletion scheduler

Account-deletion tables and functions are included in the canonical bootstrap schema. Set a strong server-only `CRON_SECRET` in Vercel; `vercel.json` invokes `/api/cron/account-deletions` daily. The endpoint rejects requests without the matching bearer token and deactivates at most 100 eligible due customer profiles per run without deleting their Auth or relational records.

### Payment-expiration scheduler

`/api/cron/payment-expirations` uses the same `CRON_SECRET` bearer protection. It must run frequently enough to close overdue PayMongo checkouts near the configured 15-minute payment deadline. Vercel Hobby cron supports only daily schedules, so the repository deliberately does not add an incompatible frequent entry to `vercel.json`; use a trusted external scheduler or a Vercel plan that supports per-minute jobs. The processor expires PayMongo first and releases stock only after the exact database transition succeeds.

## Assets and References

- The current logo is stored in `public/brand/logo.png` and is also used for the favicon.
- Product photos are stored in `public/images/products/coatings/`.
- Supplied Home promotional media is stored in `public/images/home/` and `public/videos/home/`.
- PNG files in `references/` are retained as early visual direction and project history.
- References must not be embedded as pages and are no longer pixel-perfect implementation requirements.
- The implemented design system and approved product decisions take precedence over rough reference details.

## Deployment

The public GitHub repository can be connected to Vercel. Supabase URL and key values are now required for authenticated pages and must also be configured in Vercel before deployment.

Production authentication will use `auth.tsokolitaw.com` through Supabase’s paid custom-domain add-on. The production checklist includes DNS and certificate verification, Google branding and callback updates, Vercel environment changes, and end-to-end authentication/authorization testing. Development continues to use the default Supabase project domain.

Future transactional order email will use Resend from server-only code. Production sending requires a verified domain or sending subdomain; API keys and webhook secrets belong only in protected local/Vercel environment settings.

Do not add production secrets until the corresponding backend integration begins. Never commit `.env.local`.

## Git Workflow

The user performs Git operations manually. Agents must report completion, validation results, changed files, and a suggested Conventional Commit message. Agents must not stage, commit, or push.
