# TsokoLitaw

TsokoLitaw is a mobile-first storefront and administration interface for a Filipino chocolate-filled Litaw business operating through campus pickup.

## Decision Record

[`DECISIONS.md`](DECISIONS.md) explains the product, workflow, UI, and architecture decisions made during review. It records why navigation was simplified, why products are modeled as boxes and coatings, why reviews are order-linked, why Vlog became Journal, how Admin relates to Customer, and what remains intentionally unconnected.

Read it before changing established workflows. The rough PNG references do not override these approved decisions.

## Current Status

**Phase 13: Security and Production is active.** Loyalty and all six transactional notification paths are complete and validated. Current work covers security and tamper review, Dev/Production isolation, performance validation, production configuration, legal/SEO readiness, and final launch verification. PayMongo live activation and any real charge remain explicit final launch gates.

The connected Admin Customers page is an account directory: it includes customer and Admin profiles, labels their roles explicitly, and shows their real order and loyalty activity when present.

Implemented customer and Admin interface:

- responsive customer and admin interfaces
- product catalog with real coating photography
- mobile-first Home carousel with supplied promotional photo, muted-autoplay video, sound control, and automatic image advancement
- 4-, 6-, and 8-piece box configuration
- single-coating and mixed-box selection
- browser-local cart with bounded numeric quantity editing, per-line checkout selection, and selected totals
- add-to-cart confirmation with a static cart icon, Continue shopping, and Check cart actions
- static order, review, payment, and legal commerce screens
- authenticated account, profile, and logout interfaces
- Journal for announcements, stories, product features, and community highlights
- responsive admin dashboard and management screens
- admin purpose/customer-impact/connection guidance on every management area
- connected Admin Catalog with square-image validation, Supabase media, and PHP additional-type pricing
- application-wide browser and authoritative server form validation, changed-only edit saves, accessible custom listboxes/number steppers, and decoded 3 MiB image checks

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
- the canonical schema includes a service-only atomic pending-order writer for pickup validation, ready-stock reservation, immutable snapshots, Terms acceptance, and duplicate-submit protection
- Checkout submits only catalog identifiers and counts to a server action; browser prices are ignored and active database prices are recalculated
- overdue unpaid orders become `EXPIRED` and release ready-stock reservations before new checkout attempts are accepted
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
- eligible order details support server-validated cancellation through `CONFIRMED`; unpaid checkouts expire before reservation release
- paid cancellations create a separately tracked, idempotent full PayMongo refund to the stored original payment
- authenticated PayMongo responses and signed refund webhooks drive requested, processing, refunded, and failed states
- failed automatic refunds expose an AES-256-GCM-encrypted manual destination fallback with restricted database access
- local and hosted validation cover provider-reference persistence, paid-webhook processing, and coordinated expiry; the end-to-end hosted payment smoke test remains pending

Phase 11 customer-order work started by product-owner request:

- My Orders now loads only the authenticated profile's persisted order snapshots
- My Orders loads at most 20 records through one RLS-scoped nested query and uses stable cursor pagination for older history
- order detail loads its owned order graph and latest refund through one RLS-scoped nested query
- All, Received, Preparing, Ready for pickup, and Completed filters organize real statuses without changing them in the browser
- order details now load only the authenticated customer's immutable snapshots and show cancellation/refund eligibility
- Admin Orders loads recent real order snapshots with local search and status filtering
- active Admins can advance `CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED` through an atomic service-only database function
- every successful fulfillment transition records the acting Admin, order, previous status, and next status in `admin_audit_logs`
- completed-order owners can submit one persisted 1–5 star review with a validated comment
- new reviews remain hidden from public reads until an Admin explicitly shows or features them
- completed-order review entry opens in a modal with ordered items, centered stars, and a strict live 1,000-character counter
- Admin Journal loads real submissions and audits visibility/featured moderation changes
- Admin can persist draft/published Journal posts with type, icon, display date, copy, an optional 3 MB cover image, and a secure video link
- the public Journal loads published posts and only visible, featured completed-order reviews

Performance and concurrency hardening implemented for the current storefront:

- shared public catalog previews use a five-minute tagged cache, while published pickup definitions use a 30-second tagged cache
- authoritative checkout continues to reload live prices, inventory, and pickup state
- checkout, resume-payment, cancellation, and manual-refund mutations use atomic database-backed per-user and per-IP limits shared across Vercel instances
- structured server timing reports slow commerce/order reads without logging contact details, cookies, tokens, or provider secrets
- Vercel Fluid compute is enabled and the current linked Singapore development database is paired with the `sin1` function region
- repeatable k6 smoke and staged 100-concurrent-user scenarios are available under `tests/performance/`; hosted baseline execution is still required

Not yet implemented or externally configured:

- remaining live authorization checks
- hosted PayMongo schema deployment, webhook registration, and customer redirection
- frequent production scheduling for payment expiry and hosted refund smoke testing
- email or real CRUD other than the approved account-deletion lifecycle
- admin authorization or admin subdomain routing

Customer identity, account state, catalog, published pickup options, orders, test payments, and the Phase 11 Admin areas use live Supabase data. Later-phase features remain unavailable until their secure server workflows are implemented.

Our Creations and Checkout now read customer-safe commerce, Pickup schedules, and operating rules from Supabase. Admin Orders, Catalog, Inventory, Pickup, Customers, Journal, Reviews, and the cross-feature Dashboard are connected.

The Admin Catalog now persists the base per-piece price, approved box-size availability, coatings, square coating media, additional-type prices, and add-on pricing. The primary storefront product remains active; box variants and selectable records control what customers can buy. Controlled service-role mutations recheck active Admin access, write audit records, and invalidate the public catalog cache; checkout still reloads live values and enforces date-specific inventory and pickup eligibility.

Admin Inventory now persists ready stock as individual prepared Palitaw pieces per pickup date, shared by the 4-, 6-, and 8-piece boxes. Admin can publish an exact total and record unusable pieces. Checkout atomically commits `box quantity × piece count`; expiry and unpaid cancellation release the same number of pieces. Pickup publication and remaining stock determine whether checkout is available. Inventory mutations require an active Admin, enforce non-negative available stock, and write adjustment plus Admin audit records. Made to order, Ready stock, and Hybrid all require website checkout and online payment; V1 does not accept cash or untracked walk-in sales.

The prepared total is the upper limit for one product on one pickup date, not a daily automatic or all-time total. Each newly published Ready Stock or Hybrid date starts a separate balance. An existing total cannot be reduced below pieces already committed to orders or removed as waste. Admin Inventory intentionally has no separate online-availability checkbox: close the pickup date in Pickup or allow the balance to sell out. Admin Pickup now creates those dates, windows, modes, locations, and capacities directly and feeds eligible dates into Inventory automatically. Once an order or inventory record depends on a schedule, its structure is locked while its publication state remains controllable.

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
/admin/customers
/admin/journal
```

Admin pages remain under `/admin` until subdomain routing, authentication, and server authorization are implemented. `/admin/reviews` redirects to the completed-order review section of `/admin/journal`; other compatibility redirects remain for older admin URLs.

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

The ₱10 per-piece amount is approved as the provisional database seed. Authorized admins will manage the active base piece price, and each box total will be derived from its piece count. The ₱5 additional-coating charge is also only a seed and will come from the coating price configured in Admin. Completed orders preserve immutable price snapshots. Pickup locations, schedules, lead time, cutoff, and availability will likewise be admin-managed without rewriting existing paid-order pickup snapshots.

Pickup is centered at UCC Congress: 3rd Floor and Covered Court. Monday–Saturday, 7:00 AM–7:00 PM is the operating window, but Admin publishes every actual date and slot; nothing is made available automatically each day. Made to order uses a published schedule plus lead-time/cutoff rules without prepared inventory. Ready stock uses a published date plus a prepared-piece upper limit. Hybrid consumes prepared pieces for same-day checkout while allowing eligible advance made-to-order checkout. Every mode uses the website and online payment.

The provisional made-to-order defaults are one day of lead time, a 5:00 PM daily cutoff, and hourly slots. These are operational Admin settings, not permanent storefront rules.

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
│   └── home/
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

### Performance validation

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) separately, deploy the candidate build to staging, and run:

```bash
$env:BASE_URL="https://your-staging-host.example"
npm run load:smoke
npm run load:100
```

The capacity profile ramps through 10, 25, 50, and 100 virtual users, holds 100 for 10 minutes, and checks for less than 1% unexpected failures and a read p95 below one second. It targets only this storefront; it must not be pointed at production or used to load-test Google, PayMongo, Resend, or another provider. Authenticated route coverage and full instructions are in [`tests/performance/README.md`](tests/performance/README.md).

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

Account-deletion tables and functions are included in the canonical bootstrap schema. A Supabase Cron HTTP job invokes `/api/cron/account-deletions` daily at 3:00 AM Manila (`0 19 * * *` in UTC). The endpoint requires the same `CRON_SECRET` bearer value stored in Vercel and Supabase Vault, deactivates at most 100 eligible due customer profiles per run without deleting their Auth or relational records, and prunes expired distributed rate-limit buckets. The earlier Vercel Hobby cron was removed so there is only one scheduler.

### Payment-expiration scheduler

`/api/cron/payment-expirations` uses the same `CRON_SECRET` bearer protection. A Supabase Cron HTTP job invokes it every five minutes (`*/5 * * * *`) so overdue PayMongo checkouts are closed near the configured 15-minute payment deadline. Vercel Hobby cron supports only daily schedules, so `vercel.json` deliberately contains no cron entries. The processor expires PayMongo first and releases stock only after the exact database transition succeeds.

### Transactional-email retry scheduler

`/api/cron/notifications` uses the same `CRON_SECRET` bearer protection and processes at most 20 due deliveries per call. Order confirmation is attempted immediately after verified payment or zero-total loyalty settlement; a Supabase Cron HTTP job should invoke this endpoint every five minutes (`*/5 * * * *`) to retry transient failures. Each provider request reuses the stored event idempotency key, attempts are capped at five, and a stale processing claim may be recovered after ten minutes.

### Refund security and webhooks

Generate a different 32-byte encryption key for each environment and store its base64 value as the server-only `REFUND_DESTINATION_ENCRYPTION_KEY` in `.env.local` and Vercel. Never expose it with a `NEXT_PUBLIC_` prefix:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The PayMongo webhook endpoint must subscribe to `checkout_session.payment.paid`, `payment.refunded`, and `payment.refund.updated`. The handler also understands PayMongo's newer `refund.succeeded` event shape when the dashboard makes that event available. Test and live webhook secrets are separate. Keep local, Dev, and Preview on `PAYMONGO_MODE=test`; set Production to `PAYMONGO_MODE=live` only with matching live keys and the live endpoint's signing secret. The application rejects keys, API responses, events, and webhook signatures whose mode does not match.

## Assets and References

- The current logo is stored in `public/brand/logo.png` and is also used for the favicon.
- Coating photos are stored in the Supabase `catalog-media` bucket and fetched through each coating's database `image_url`.
- Supplied Home promotional media is stored in `public/images/home/` and `public/videos/home/`. The folder includes the Home hero, ratio-specific fallback artwork, the featured selection, and the featured video.
- PNG files in `references/` are retained as early visual direction and project history.
- References must not be embedded as pages and are no longer pixel-perfect implementation requirements.
- The implemented design system and approved product decisions take precedence over rough reference details.

## Deployment

The public GitHub repository can be connected to Vercel. Supabase URL and key values are now required for authenticated pages and must also be configured in Vercel before deployment.

`vercel.json` currently enables Fluid compute and places dynamic functions in `sin1` because the linked development Supabase project is in Singapore. When the Seoul production Supabase project becomes the active database, change the region to `icn1` in the same deployment so dynamic requests do not make an unnecessary cross-region round trip.

Production authentication will use `auth.tsokolitaw.com` through Supabase’s paid custom-domain add-on. The production checklist includes DNS and certificate verification, Google branding and callback updates, Vercel environment changes, and end-to-end authentication/authorization testing. Development continues to use the default Supabase project domain.

The six transactional order/refund emails use Resend from server-only code and the verified `updates.tsokolitaw.com` sending subdomain. Database triggers queue committed order and refund transitions; immediate dispatch follows PayMongo, loyalty settlement, Admin fulfillment, cancellation, and verified refund updates, while `/api/cron/notifications` retries bounded local send failures with the shared `CRON_SECRET`.

Resend delivery tracking is received at `POST /api/webhooks/resend`. Configure that deployed URL in Resend, subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`, then copy the endpoint signing secret into the protected `RESEND_WEBHOOK_SECRET` environment variable. The handler verifies the signature against the untouched request body, stores each provider event once, and rejects older events as delivery-state updates when Resend delivers events out of order. API keys and webhook secrets belong only in protected local/Vercel environment settings.

Phase 13 adds a strict trusted-origin rule for OAuth callbacks and provider links, a 1 MiB signed-webhook request limit, a 15-second Resend timeout, shared constant-time Cron authorization, non-cacheable Cron responses, data-minimized operational output, and production response headers for content security, framing, MIME sniffing, referrers, browser permissions, and HTTPS transport. Public metadata uses `https://www.tsokolitaw.com` as the canonical origin; `robots.txt` and `sitemap.xml` expose only Home, Our Creations, Journal, Terms, and Privacy, while account, order, payment, checkout, Auth, Admin, and API surfaces are non-indexable.

The Privacy page is the active notice rather than preview copy. It identifies collected information, operational purposes, the current Google/Supabase/Vercel/PayMongo/Resend providers, the 90-day eligible account-deactivation window, retained transaction records, security controls, and customer privacy-request options.

Do not add production secrets until the corresponding backend integration begins. Never commit `.env.local`.

## Git Workflow

The user performs Git operations manually. Agents must report completion, validation results, changed files, and a suggested Conventional Commit message. Agents must not stage, commit, or push.

`develop` is the stable Dev integration branch and `main` is the Production branch. Normal work follows `feature/*` → `develop` → `main`; a production emergency follows `hotfix/*` → `main` and is then merged back into `develop`. The existing Vercel project retains `tsokolitaw.vercel.app` and tracks `develop`. A separate Vercel Production project tracks `main` and owns `tsokolitaw.com`, with an independent Production Supabase project and production-only secrets, webhooks, cron jobs, and provider configuration.

Database changes must be committed migrations. Reset and test them locally, verify them against Dev, then promote the same migration files to Production. Never develop directly against Production, run a linked reset there, or push development seed data to it.
