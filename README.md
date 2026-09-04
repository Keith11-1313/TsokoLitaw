# TsokoLitaw

TsokoLitaw is a mobile-first storefront and administration interface for a Filipino chocolate-filled Litaw business operating through campus pickup.

## Decision Record

[`DECISIONS.md`](DECISIONS.md) explains the product, workflow, UI, and architecture decisions made during review. It records why navigation was simplified, why products are modeled as boxes and coatings, why reviews are order-linked, why Vlog became Journal, how Admin relates to Customer, and what remains intentionally unconnected.

Read it before changing established workflows. The rough PNG references do not override these approved decisions.

## Current Status

**Phase 13: Security and Production is complete.** The isolated Dev and Production environments, live QR Ph payment, signed webhooks, production Cron jobs, transactional email, Search Console, sitemap, security controls, and production smoke tests have been verified. Remaining Phase 13 entries are post-launch monitoring, an optional Google Business Profile assessment, and the separately approved future database cleanup. Paid-order settlements occur in person; the website does not create refunds.

**Phase 14: UI Overhaul is in progress.** Its first approved customer-facing pass introduces the supplied photo background, simpler typography, tighter page spacing, and focused mobile builder and checkout improvements without changing commerce behavior. Phase 15 will package the stable Phase 14 website as a directly distributed Android APK; it will not introduce a second storefront implementation.

The connected Admin Customers page is an account directory: it includes customer and Admin profiles, labels their roles explicitly, and shows their real order and loyalty activity when present.

Implemented customer and Admin interface:

- responsive customer and admin interfaces
- product catalog with real coating photography
- mobile-first Home carousel with supplied promotional photo, muted-autoplay video, sound control, and automatic image advancement
- 4-, 6-, and 8-piece box configuration
- single-coating and mixed-box selection
- browser-local cart with bounded numeric quantity editing, per-line checkout selection, and selected totals
- add-to-cart confirmation with a static cart icon, Continue shopping, and Check cart actions
- connected order, review, payment-status, and legal commerce screens
- authenticated account, profile, and logout interfaces
- Journal for announcements, stories, product features, and community highlights
- responsive admin dashboard and management screens
- admin purpose/customer-impact/connection guidance on every management area
- connected Admin Catalog with square-image validation, Supabase media, default-coating selection, and PHP per-piece coating pricing
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

Phase 9 server commerce completed:

- active products, box variants, coatings, add-ons, and their current prices load from Supabase
- box totals derive from the database product price per piece
- every coated piece uses its coating's individual database-configured price
- Checkout uses the authenticated profile rather than mock customer details
- Checkout lists only database-published pickup dates, windows, and locations and shows an honest unavailable state when none are published
- untrusted cart IDs and counts are validated and repriced against the active catalog on the server
- the canonical schema includes a service-only atomic pending-order writer for pickup validation, ready-stock reservation, immutable snapshots, Terms acceptance, and duplicate-submit protection
- Checkout submits only catalog identifiers and counts to a server action; browser prices are ignored and active database prices are recalculated
- overdue unpaid orders become `EXPIRED` and release ready-stock reservations before new checkout attempts are accepted
- the controlled seed includes the current Terms version required for checkout acceptance snapshots
- active Admin identities can place their own storefront orders, and new orders use a shared short number such as `TL-0001`

Phase 10 PayMongo integration completed:

- PayMongo credentials are loaded only from server environment variables and checked against the configured test/live mode
- the server-only client targets PayMongo v2 Hosted Checkout, offers QR Ph only, and rejects provider responses from the wrong environment mode
- checkout requests carry a stable idempotency key so a safe retry cannot create a duplicate provider session
- the canonical schema creates at most one payment per order and immutably stores its checkout and payment references
- the webhook handler verifies PayMongo's timestamped raw-body signature, enforces the configured environment mode, and atomically deduplicates exact paid-order transitions
- Checkout creates or reloads one idempotent environment-matched PayMongo session and redirects to Hosted Checkout
- the success return reloads the owned order and never treats the browser redirect as payment proof
- overdue provider-bound orders close the PayMongo checkout before the database releases reserved stock
- eligible order details support server-validated cancellation only while both order and payment are pending; attached unpaid checkouts expire before reservation release
- paid orders expose no online cancellation or refund workflow; related concerns are coordinated with TsokoLitaw in person
- historical refund tables, signed-event reconciliation, and notification records remain intact for transactions created under the earlier workflow
- local, hosted Dev, and live Production validation cover provider-reference persistence, paid-webhook processing, coordinated expiry, and a successful ₱1 QR Ph payment

Phase 11 customer and Admin operations completed:

- My Orders now loads only the authenticated profile's persisted order snapshots
- My Orders loads at most 20 records through one RLS-scoped nested query and uses stable cursor pagination for older history
- order detail loads its owned order graph through one RLS-scoped nested query
- All, Received, Preparing, Ready for pickup, and Completed filters organize real statuses without changing them in the browser
- order details load only the authenticated customer's immutable snapshots, show unpaid cancellation when eligible, and direct paid-order concerns to in-person settlement
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
- checkout, resume-payment, and unpaid-cancellation mutations use atomic database-backed per-user and per-IP limits shared across Vercel instances
- structured server timing reports slow commerce/order reads without logging contact details, cookies, tokens, or provider secrets
- Vercel Fluid compute is enabled and the current linked Singapore development database is paired with the `sin1` function region
- repeatable k6 smoke and staged 100-concurrent-user scenarios are available under `tests/performance/`; the capacity run completed 55,801 requests with zero failures and a 372.6 ms p95

The production baseline is connected: customer identity, account state, catalog, published pickup options, orders, QR Ph payments, transactional email, scheduled processing, and the Phase 11 Admin areas use isolated live services. Admin remains under `/admin`; no Admin or paid Supabase authentication subdomain is required for V1.

Our Creations and Checkout now read customer-safe commerce, Pickup schedules, and operating rules from Supabase. Admin Orders, Catalog, Inventory, Pickup, Customers, Journal, Reviews, and the cross-feature Dashboard are connected.

The Admin Catalog now persists the base per-piece price, approved box-size availability, coatings, square coating media, per-piece coating prices, one active default coating, and add-on pricing. The primary storefront product remains active; box variants and selectable records control what customers can buy. Controlled service-role mutations recheck active Admin access, write audit records, and invalidate the public catalog cache; checkout still reloads live values and enforces date-specific inventory and pickup eligibility.

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

Connected services:

- separate Supabase PostgreSQL/Auth projects for Dev and Production
- Google OAuth through each environment's default Supabase authentication domain
- PayMongo QR Ph Hosted Checkout in test mode on Dev and live mode on Production
- Resend transactional email and signed delivery tracking
- separate Vercel projects for `tsokolitaw.vercel.app` and `www.tsokolitaw.com`

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

Admin pages intentionally remain under `/admin` for campus-scale V1 and are protected by implemented server-side session and role checks. No Admin subdomain is planned for V1. `/admin/reviews` redirects to the completed-order review section of `/admin/journal`; other compatibility redirects remain for older Admin URLs.

## Current Product Model

Current configurable seed prices:

- Base price per piece — ₱10
- TsokoMini (4 pcs) base — ₱40 (`4 × ₱10`)
- TsokoMore (6 pcs) base — ₱60 (`6 × ₱10`)
- TsokoMuch (8 pcs) base — ₱80 (`8 × ₱10`)
- Each coated piece — temporary ₱5 coating seed, configurable per coating by Admin
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

These catalog values come from Supabase, and browser totals remain estimates. Checkout already reloads the current database values and recalculates the authoritative final price on the server.

The ₱10 per-piece amount is the provisional database seed. Authorized Admins manage the active base piece price, and each box total is derived from its piece count. The ₱5 additional-coating charge is also a seed and comes from the coating price configured in Admin. Completed orders preserve immutable price snapshots. Admin-managed pickup locations, schedules, lead time, cutoff, and availability do not rewrite existing paid-order pickup snapshots.

Pickup is centered at UCC Congress: 3rd Floor and Covered Court. Monday–Saturday, 7:00 AM–7:00 PM is the operating window, but Admin publishes every actual date and slot; nothing is made available automatically each day. Made to order uses a published schedule plus lead-time/cutoff rules without prepared inventory. Ready stock uses a published date plus a prepared-piece upper limit. Hybrid consumes prepared pieces for same-day checkout while allowing eligible advance made-to-order checkout. Every mode uses the website and online payment.

The provisional made-to-order defaults are one day of lead time, a 5:00 PM daily cutoff, and hourly slots. These are operational Admin settings, not permanent storefront rules.

V1 uses one equal-permission admin role supporting five approved Google accounts. One account may be configured first and four added later. Customers may cancel online only while an order is unpaid and pending. Paid-order cancellation or settlement concerns are coordinated directly with TsokoLitaw in person; the website does not initiate refunds. Prepared orders and no-shows are non-refundable, subject to applicable non-waivable rights. Historical refund records remain separately tracked for audit integrity.

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
├── lib/                 # Domain rules, server services, and Supabase helpers
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

The full pgTAP suite assumes a freshly reset database and must run locally, not against a populated hosted project. To lint the linked hosted Dev schema, provide its database password through `SUPABASE_DB_PASSWORD`. Use only deliberately data-independent focused tests against hosted Dev; the cancellation-policy test is exposed as a separate command:

```bash
npm run db:lint:linked
npm run db:test:linked:cancellation
```

Do not use `npm run db:test:linked` on populated Dev or Production. Its clean-database count assertions will collide with real operational rows even though every test file rolls its writes back.

To connect a fresh production project, authenticate the CLI, link the project reference, review a dry run, and then push the reviewed migrations. Seed data is appropriate for local/development environments; review it before applying to production. The `20260827010000` and `20260827020000` files are intentional no-op markers for migrations already applied to hosted Dev before their changes were folded into the canonical bootstrap. They keep CLI history aligned without replaying schema changes. Do not repair those real remote versions as reverted or push the squashed bootstrap file to existing hosted Dev merely to align history. The approved initial Google identity must sign in once before trusted server-side setup invokes `promote_admin_by_email`.

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

### PayMongo payment webhooks

Each current PayMongo webhook endpoint should subscribe only to `checkout_session.payment.paid`. Checkout sessions offer QR Ph only. Test and live webhook secrets are separate: keep local, Dev, and Preview on `PAYMONGO_MODE=test`, and keep Production on `PAYMONGO_MODE=live` only with matching live keys and the live endpoint's signing secret. The application rejects keys, API responses, events, and webhook signatures whose mode does not match. Historical refund event parsing remains in the route only to reconcile an already-existing record if an older signed event is delivered; do not enable refund events for new endpoints.

## Assets and References

- The current logo is stored in `public/brand/logo.png` and is also used for the favicon.
- Coating photos are stored in the Supabase `catalog-media` bucket and fetched through each coating's database `image_url`.
- Supplied Home promotional media is stored in `public/images/home/` and `public/videos/home/`. The folder includes the Home hero, ratio-specific fallback artwork, the featured selection, and the featured video.
- PNG files in `references/` are retained as early visual direction and project history.
- References must not be embedded as pages and are no longer pixel-perfect implementation requirements.
- The implemented design system and approved product decisions take precedence over rough reference details.

## Deployment

The public GitHub repository is connected to separate Vercel projects: `development` deploys to `tsokolitaw.vercel.app`, while `main` deploys to the canonical `https://www.tsokolitaw.com`. Each project uses its matching Supabase and provider configuration.

`vercel.json` enables Fluid compute and keeps both deployments in `sin1`. The staged 100-user test passed with zero request failures and a 372.6 ms p95, so the campus-scale V1 does not need separate per-environment Vercel region configuration. Revisit this only if production measurements show persistent latency or timeouts.

Dev and Production use their default environment-specific Supabase authentication domains and separately approved Google OAuth callbacks. The paid Supabase custom-domain add-on and `auth.tsokolitaw.com` are intentionally excluded from V1.

Transactional emails use Resend from server-only code and the verified `updates.tsokolitaw.com` sending subdomain. Current flows queue confirmation, ready-for-pickup, and unpaid-cancellation messages. Legacy refund deliveries remain for historical reconciliation only. `/api/cron/notifications` retries bounded local send failures with the shared `CRON_SECRET`.

Resend delivery tracking is received at `POST /api/webhooks/resend`. Configure that deployed URL in Resend, subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`, then copy the endpoint signing secret into the protected `RESEND_WEBHOOK_SECRET` environment variable. The handler verifies the signature against the untouched request body, stores each provider event once, and rejects older events as delivery-state updates when Resend delivers events out of order. API keys and webhook secrets belong only in protected local/Vercel environment settings.

Phase 13 adds a strict trusted-origin rule for OAuth callbacks and provider links, a 1 MiB signed-webhook request limit, a 15-second Resend timeout, shared constant-time Cron authorization, non-cacheable Cron responses, data-minimized operational output, and production response headers for content security, framing, MIME sniffing, referrers, browser permissions, and HTTPS transport. Public metadata uses `https://www.tsokolitaw.com` as the canonical origin; `robots.txt` and `sitemap.xml` expose only Home, Our Creations, Journal, Terms, and Privacy, while account, order, payment, checkout, Auth, Admin, and API surfaces are non-indexable.

The Privacy page is the active notice rather than preview copy. It identifies collected information, operational purposes, the current Google/Supabase/Vercel/PayMongo/Resend providers, the 90-day eligible account-deactivation window, retained transaction records, security controls, and customer privacy-request options.

### Planned Android APK

Phase 15 will package the canonical Production website as a signed Android APK using a PWABuilder/Bubblewrap Trusted Web Activity. The APK will be downloaded through the TsokoLitaw website rather than Google Play and will not contain a separate native commerce implementation. Digital Asset Links will bind the signed package to `www.tsokolitaw.com`; the signing key remains outside Git and must be preserved for updates.

The Android launcher icon and startup artwork are separate. After Android's brief system-controlled launch screen, the wrapper will show a dedicated centered Palitaw-themed illustration on the branded background only while the Trusted Web Activity initializes. Google OAuth and PayMongo remain browser-based, and no offline ordering or payment behavior is planned.

Keep all provider keys, webhook secrets, database secrets, and Cron secrets in the appropriate protected local or deployment environment. Never commit `.env.local` or copy Production values into Dev.

## Git Workflow

The user performs Git operations manually. Agents must report completion, validation results, changed files, and a suggested Conventional Commit message. Agents must not stage, commit, or push.

`development` is the stable Dev integration branch and `main` is the Production branch. Routine work is completed and tested on `development`, then promoted through one reviewed `development` → `main` pull request. Separate feature branches are reserved for risky or large work. The existing Vercel project retains `tsokolitaw.vercel.app` and tracks `development`; the separate Production project tracks `main` and owns `tsokolitaw.com`, with an independent Production Supabase project and production-only secrets, webhooks, cron jobs, and provider configuration.

Database changes must be committed migrations. Reset and test them locally, verify them against Dev, then promote the same migration files to Production. Never develop directly against Production, run a linked reset there, or push development seed data to it.
