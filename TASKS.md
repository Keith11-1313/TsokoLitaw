# TsokoLitaw — Development Tasks

## Current Milestone

Phase 13 Security and Production is active. Environment isolation, security review, performance validation, production configuration, and launch verification are the current work. Final Privacy wording and the controlled live-provider paid-cancellation/full-refund smoke remain explicit release gates.

## Decision Baseline

- [x] Record approved workflow and architecture rationale in `DECISIONS.md`
- [x] Align Requirements, Architecture, Database, Design, Tasks, README, and AGENTS with the decision record
- [x] Treat rough references as historical direction, not overriding requirements
- [x] Document why customer navigation, account access, coatings, pickup, reviews, Journal, and Admin changed
- [x] Document current mock-data connections and future server-authoritative boundaries
- [ ] Update all affected root documentation whenever a future product decision changes

## Phase 0 — Project Foundation

- [x] Initialize Next.js App Router
- [x] Enable strict TypeScript
- [x] Enable Tailwind CSS
- [x] Enable ESLint
- [x] Use `src/` directory and `@/*` alias
- [x] Initialize Git and connect public GitHub repository
- [x] Add Lucide React
- [x] Add lint, typecheck, and build scripts
- [x] Add `.env.example` when the first backend integration begins
- [x] Confirm production environment policy before adding secrets

## Phase 1 — Design Foundation and Assets

- [x] Inspect reference PNGs
- [x] Establish customer and admin design systems
- [x] Create shared colors, typography, spacing, radius, and content-width tokens
- [x] Create buttons, forms, cards, status badges, and custom dropdown
- [x] Add responsive customer header/footer
- [x] Add responsive admin sidebar and mobile drawer
- [x] Add TsokoLitaw logo and favicon
- [x] Add seven real coating images
- [x] Add approved Home promotional photo and featured video
- [x] Present Home feature media as a muted-autoplay carousel with end-of-video advancement
- [x] Reclassify PNG references as rough historical direction

## Phase 2 — Customer UI

- [x] Home
- [x] Our Creations
- [x] Cart
- [x] Checkout shell
- [x] Login
- [x] Profile
- [x] Current orders and history
- [x] Order details
- [x] Completed-order review screen
- [x] Terms & Conditions
- [x] Privacy
- [x] Payment success
- [x] Payment failed
- [x] Journal
- [x] Remove My Orders from main navigation
- [x] Add Account/Profile and Cart header actions
- [x] Add Terms and Privacy footer links
- [x] Perform final content and interaction review with product owner
- [x] Replace remaining placeholders with the approved supplied assets

## Phase 3 — Frontend Commerce Behavior

- [x] Use PHP formatting
- [x] Add 4-, 6-, and 8-piece boxes
- [x] Add seven approved coatings
- [x] Support single-coating selection
- [x] Support mixed-box piece allocation
- [x] Validate allocated pieces against box size in UI
- [x] Calculate additional coating-type charge in UI
- [x] Add extra sea salt cream option
- [x] Add, remove, and update local cart items
- [x] Add an accessible add-to-cart confirmation modal with a cart icon and Check cart action
- [x] Persist cart in browser local storage
- [x] Navigate from cart to checkout
- [x] Add automated unit tests for configurable piece/coating pricing, cart totals, and configuration calculations
- [x] Replace browser-authoritative commerce calculations with server reload, validation, repricing, and atomic stock enforcement while retaining browser estimates as non-authoritative UI

## Phase 4 — Admin Static UI

- [x] Dashboard
- [x] Orders
- [x] Products
- [x] Inventory
- [x] Pickup
- [x] Customers
- [x] Review Management
- [x] Journal Management
- [x] Remove editable Store Name
- [x] Add responsive tables and mobile navigation drawer
- [x] Disable backend-dependent actions with explanations
- [x] Align Admin Catalog with the three box sizes, seven coatings, add-on, images, and PHP prices
- [x] Align Admin Pickup with Checkout dates, times, locations, and pickup rules
- [x] Remove mock records from authenticated customer order history while retaining clearly labeled Admin operational previews
- [x] Add purpose, customer-impact, and connection guidance to every admin area
- [x] Share customer/admin mock commerce and pickup constants
- [x] Add frontend-only coating-entry preview with name, description, 1:1 image validation, and additional-type price
- [x] Connect Admin Catalog pricing, box availability, coating CRUD, square media upload, add-on availability, cache invalidation, and audit logging
- [x] Review dense admin screens at small tablet widths

## Phase 5 — UI Quality Assurance

- [x] Run lint
- [x] Run typecheck
- [x] Run production build
- [x] Check Our Creations on desktop and mobile
- [x] Check coating image loading and cropping
- [x] Check mixed-box calculations manually
- [x] Test every customer route at 390px mobile, 768px tablet, and 1440px desktop widths
- [x] Test every admin route at 390px mobile, 768px tablet, and 1440px desktop widths
- [x] Complete keyboard-only navigation audit
- [x] Complete screen-reader landmark and label audit
- [x] Add empty, loading, server-error, and not-found states before data integration
- [x] Confirm recipe and allergen wording
- [x] Apply the professor-provided educational Terms & Conditions baseline without contradicting approved physical-order policies
- [ ] Confirm final Privacy wording

## Phase 6 — Backend Planning Gate

Do not begin without explicit approval.

- [x] Review and approve the database model as the Supabase baseline
- [x] Approve provisional price seeds and admin-managed pricing
- [x] Finalize recipe and allergen data
- [x] Approve admin-managed pickup locations, schedules, lead time, cutoff, and availability; remove the redundant boxes-per-window capacity
- [x] Confirm launch pickup locations and the Monday–Saturday, 7:00 AM–7:00 PM operating window
- [x] Confirm made-to-order default with Admin-published same-day ready stock
- [x] Set provisional made-to-order defaults: one-day lead time, 5:00 PM cutoff, and hourly slots
- [x] Finalize cancellation, refund, and no-show policies
- [x] Choose Resend as the transactional email provider
- [x] Approve one equal-permission admin role for five accounts
- [x] Approve one initial admin identity with four additional accounts later
- [x] Receive the initial admin Google identity for secure deployment setup; do not commit it to the repository
- [x] Keep Admin under `/admin` for V1 and defer the admin subdomain
- [x] Create environment variable inventory in `ARCHITECTURE.md`

## Phase 7 — Supabase Setup

- [x] Create and link the hosted Supabase development project
- [x] Add browser, server, and service-role clients
- [x] Maintain one squashed production bootstrap schema with constraints and indexes
- [x] Define RLS on every public table and add pgTAP authorization checks
- [x] Apply the migration and controlled seed to the hosted development project
- [x] Execute all 18 pgTAP checks against the hosted development project
- [x] Execute database lint against the hosted development project with no schema errors
- [x] Add controlled seed data
- [x] Confirm local/Vercel product assets are sufficient; Supabase Storage is not required now

## Phase 8 — Authentication and Authorization

- [x] Configure Google OAuth and Supabase provider
- [x] Implement PKCE sign-in, callback handling, session refresh, and logout
- [x] Create profiles from Auth identities and allow ownership-scoped profile updates
- [x] Protect checkout, customer orders, profile, and eligible review routes server-side
- [x] Configure the initial approved Google identity and support four additions under the same admin role
- [x] Add a controlled server-only initial Admin bootstrap command and enforce the five-admin database limit
- [x] Protect Admin routes with a server-side profile-role check
- [x] Add confirmation to every logout action and return confirmed logout to Home
- [x] Render the global Not Found boundary in place for non-Admin access to Admin routes
- [x] Add redirect-safety unit tests and cross-customer/Admin pgTAP tests
- [x] Add Profile danger zone with authenticated 90-day account-deletion scheduling and cancellation
- [x] Add secret-protected due-account soft deactivation that preserves Auth and relational records
- [x] Add inactive-profile checks to OAuth callback handling, RLS helpers, customer access, and Admin authorization
- [x] Add the deleted-account login bounce screen
- [x] Apply the revised account-deactivation schema to the hosted development project; keep the production bootstrap schema squashed
- [x] Configure `CRON_SECRET` in Vercel and protect the account-deletion endpoint
- [x] Create the daily Supabase Cron account-deletion HTTP job using the matching secret from Supabase Vault
- [x] Redeploy Production without the removed Vercel cron and verify one authorized Supabase Cron invocation
- [x] Verify deletion request, checkout blocking, cancellation, due deactivation, retained relationships, access denial, and login bounce against the hosted project
- [x] Execute live Google OAuth, initial Admin bootstrap, logout, unauthorized Admin, and cross-customer pgTAP verification

## Phase 9 — Server Commerce

- [x] Load products, variants, coatings, add-ons, and published pickup availability from database
- [x] Validate mixed-box allocations server-side
- [x] Recalculate PHP prices server-side
- [x] Implement daily inventory
- [x] Reserve and release stock atomically
- [x] Create order and item snapshots
- [x] Record Terms acceptance
- [x] Prevent duplicate checkout submissions
- [x] Apply the final Phase 9 schema upgrade to hosted development and complete customer/Admin pending-order proofs

## Phase 10 — PayMongo Test Mode

- [x] Add local PayMongo test environment variables; defer Vercel Preview values until hosted payment testing
- [x] Create and unit-test the server-only PayMongo v2 Hosted Checkout client and idempotent request contract
- [x] Create pending payment orders through the Phase 9 atomic checkout writer
- [x] Create checkout/payment session and redirect customers to PayMongo test Hosted Checkout
- [x] Add the test-mode signed webhook endpoint and raw-body signature verification
- [x] Add locally validated service-only payment initialization and immutable provider-reference persistence
- [x] Enforce atomic webhook idempotency and exact order/reference/amount matching
- [x] Apply and validate the Phase 10 payment schema upgrade on hosted development
- [x] Deploy and register the test webhook endpoint, then configure its signing secret
- [x] Make payment return/cancellation states honest and never infer payment success from a browser redirect
- [x] Add provider-first, database-second 15-minute checkout expiry coordination and a protected processor endpoint
- [x] Schedule `/api/cron/payment-expirations` every five minutes through Supabase Cron and verify its authorized HTTP `200` response
- [x] Apply and validate the coordinated-expiry schema upgrade on hosted development
- [x] Complete the hosted test payment and signed paid-webhook smoke test
- [x] Complete a clean hosted provider-expiry smoke test after the development-order reset
- [ ] Complete the hosted paid-cancellation and full-refund smoke test
- [x] Implement full original-method refunds and verified refund webhooks
- [x] Track refund state separately from order cancellation
- [x] Never infer payment success from browser redirects

## Phase 11 — Orders, Reviews, Journal, and Admin CRUD

- [x] Connect the authenticated customer order list with real order snapshots and status filters
- [x] Connect customer order details
- [x] Connect Admin Orders to real order snapshots with search and status filtering
- [x] Enforce the one-way paid fulfillment path from `CONFIRMED` through `COMPLETED`
- [x] Record Admin fulfillment transitions in the audit log
- [x] Implement cancellation eligibility
- [x] Close customer cancellation at `PREPARING` and enforce no-show non-refund policy
- [x] Add encrypted, restricted manual-refund fallback after provider failure
- [x] Enforce completed-order review eligibility, ownership, and uniqueness
- [x] Persist one customer review per completed order through a controlled server mutation
- [x] Connect Admin review reads, visibility/featured moderation, and audit records
- [x] Connect public selected reviews
- [x] Merge Reviews into Admin Journal and retain `/admin/reviews` as a compatibility redirect
- [x] Replace the separate customer review screen with an order-detail modal and strict comment counter
- [x] Implement Journal draft/publish editing with type, icon, date, content, cover image, and video-link support
- [x] Implement product, approved box-size, coating media, and add-on administration
- [x] Add persistent per-line Cart checkout selection and remove only purchased lines after verified payment
- [x] Implement piece-based Inventory administration with exact ready-stock totals, online commitments, unusable-piece recording, and audit records; pickup publication and remaining stock control website-paid sales
- [x] Clarify selected-date Inventory UI, shared piece limits, accounted-piece lower bounds, and removal of redundant online-availability/cash-sale controls
- [x] Connect Admin Pickup CRUD so Admin can create, publish, close, and edit dates, modes, windows, locations, lead time, cutoff, grace period, and operating hours without SQL
- [x] Make newly published Ready Stock and Hybrid dates appear automatically in Admin Inventory; Made to order dates must not request prepared stock
- [x] Connect bounded Admin customer summaries to real profiles and completed-order aggregates; defer loyalty earning/redemption to Phase 12
- [x] Remove the redundant Admin Settings page; Pickup owns pickup rules and no separate page returns until genuine global configuration exists
- [x] Show selected-date remaining prepared pieces in Checkout, compare them with selected cart piece demand, and retain transactional enforcement
- [x] Add auditability for fulfillment, Catalog mutations, review moderation, and Journal publication actions
- [x] Replace the order-only Admin dashboard preview with live cross-feature summaries, seven-day paid-revenue and fulfillment-status charts, recent orders, and connected quick actions

## Phase 12 — Loyalty and Notifications

- [x] Count completed orders only
- [x] Create and redeem seven-order reward
- [x] Prevent duplicate rewards
- [x] Show customer and Admin profiles in the Customers account directory with explicit role labels
- [x] Queue and send an idempotent order confirmation email for verified PayMongo and zero-total loyalty orders
- [x] Send an idempotent ready-for-pickup email after the committed Admin fulfillment transition
- [x] Send idempotent cancellation, refund-processing, refund-completed, and refund-problem emails from persisted state transitions
- [x] Keep email sending server-side
- [x] Configure and verify the Resend sending subdomain
- [x] Add idempotent Resend sending and signed delivery webhooks
- [x] Record order-confirmation message IDs, delivery states, failures, and retry attempts
- [x] Run a hosted end-to-end smoke test for all six notification transitions, exactly-once behavior, retry recovery, and Resend delivery tracking

## Phase 13 — Security and Production

- [x] Establish and document the Git/environment policy: `main` deploys Production, `develop` is the stable Dev integration branch, and `feature/*` branches merge into `develop` before production promotion
- [ ] Keep the existing Vercel project on `develop` as `tsokolitaw.vercel.app` Dev, create a separate `main`-tracking Production project for `tsokolitaw.com`, and isolate every environment variable and provider callback
- [ ] Protect `main` from direct feature work and require the documented `feature/*` → `develop` → `main` release path plus the `hotfix/*` → `main` → `develop` recovery path
- [x] Require every database change to be represented by a reviewed migration, validated against Dev first, and promoted unchanged to Production
- [ ] Apply the conflict-safe Production reference-data migration after its local reset, lint, and database tests pass
- [x] Review RLS and admin authorization
- [x] Test price, stock, order, and webhook tampering
- [x] Review secret exposure and logging
- [x] Consolidate My Orders and order detail into RLS-scoped nested reads
- [x] Add cursor pagination to customer order history
- [x] Add bounded tagged caching for public catalog previews and pickup definitions while keeping checkout authoritative reads live
- [x] Add structured timing for performance-sensitive commerce and order reads
- [x] Add an atomic service-only per-user/per-IP mutation rate limiter and daily bucket pruning
- [x] Configure Vercel Fluid compute and align the current linked Singapore development database with `sin1`
- [x] Add repeatable k6 smoke, ramp, 100-user hold, and spike scenarios
- [x] Apply the performance/rate-limit schema delta to the existing hosted development database before deploying the dependent application code
- [ ] Run the k6 smoke and 100-user staging gates and record warm p50/p95/p99, errors, and database health
- [ ] Switch the Vercel function region from `sin1` to `icn1` when the Seoul production Supabase project becomes active
- [x] Review provider timeouts and idempotent retry behavior before PayMongo live mode
- [ ] Deploy production configuration to Vercel
- [ ] Copy approved coating assets from the Dev `catalog-media` bucket to production Storage and update production coating `image_url` values
- [ ] Connect `tsokolitaw.com`
- [ ] Create a different production `CRON_SECRET` and configure the same value in Vercel Production and the production Supabase Vault
- [ ] Store the canonical `https://tsokolitaw.com` origin as `tsokolitaw_site_url` in the production Supabase Vault
- [ ] Create the five-minute payment-expiration and daily account-deletion jobs in production Supabase Cron
- [ ] Verify both production Cron jobs return authorized HTTP `200` responses before launch
- [ ] Upgrade the production Supabase project to a plan that supports the custom-domain add-on
- [ ] Create the `auth.tsokolitaw.com` CNAME pointing to the Supabase project domain
- [ ] Register `auth.tsokolitaw.com` with Supabase and publish the required domain-verification TXT records
- [ ] Verify and activate the Supabase custom domain only after its TLS certificate is ready
- [ ] Add `https://auth.tsokolitaw.com/auth/v1/callback` to the Google OAuth client before activation
- [ ] Update the production Supabase URL, Google OAuth configuration, and Vercel environment to use `https://auth.tsokolitaw.com`
- [ ] Configure and submit TsokoLitaw name, logo, homepage, privacy policy, and authorized domain under Google Auth Platform Branding
- [ ] Verify Google account selection displays `auth.tsokolitaw.com` instead of the Supabase project reference
- [ ] Test login, callback, token refresh, logout, customer route protection, and Admin authorization on the production domain
- [ ] Retain the default Supabase callback during migration until the branded callback is verified
- [ ] Configure `admin.tsokolitaw.com` if approved
- [ ] Replace the temporary `tsokolitaw.vercel.app` PayMongo webhook with the canonical `https://tsokolitaw.com/api/webhooks/paymongo` endpoint after the custom domain is live
- [ ] Configure the new custom-domain PayMongo signing secret in Vercel, redeploy, and verify a signed test delivery before disabling the Vercel-domain webhook
- [ ] Configure production OAuth and remaining PayMongo URLs
- [ ] Switch to live keys only after test-mode sign-off
- [ ] Choose one canonical production origin (`https://tsokolitaw.com` or `https://www.tsokolitaw.com`) and permanently redirect every alternate HTTP/HTTPS host to it
- [x] Audit unique page titles, descriptions, canonical URLs, favicons, Open Graph images, and social-sharing metadata on every public route
- [x] Mark private and transactional routes such as Admin, Profile, Orders, Checkout, Auth, Payment, and API endpoints as non-indexable
- [x] Generate production `robots.txt` and a root `sitemap.xml` containing only canonical public URLs with absolute production links
- [x] Add truthful Organization structured data for TsokoLitaw; validate the deployed page with Google Rich Results Test before launch
- [ ] Run Lighthouse and production Core Web Vitals checks on Home, Our Creations, Journal, Terms, and Privacy before allowing indexing
- [ ] Create and DNS-verify the `tsokolitaw.com` domain property in Google Search Console
- [ ] Submit `https://tsokolitaw.com/sitemap.xml` in Google Search Console after the canonical domain is live
- [ ] Inspect the Home, Our Creations, and Journal URLs in Search Console and request initial indexing after confirming they return public `200` responses
- [ ] Check Search Console indexing, crawl, HTTPS, structured-data, Core Web Vitals, security, and manual-action reports after launch
- [ ] Monitor search queries, indexed pages, sitemap status, and crawl errors during the first weeks, then correct metadata or technical SEO issues without keyword stuffing
- [ ] Assess Google Business Profile eligibility separately; create one only if TsokoLitaw meets Google's real-world business/location requirements
- [ ] Complete final smoke test and policy verification

## Phase 14 — UI Overhaul

Do not begin until Phase 13 establishes and verifies the production baseline.

- [ ] Tag the stable Phase 13 production release before beginning the redesign
- [ ] Create `feature/ui-overhaul` from `develop`; do not redesign directly on `main`
- [ ] Audit every customer and Admin page for information hierarchy, consistency, responsive behavior, accessibility, loading, empty, error, and success states
- [ ] Implement the approved UI overhaul without changing established commerce, inventory, pickup, loyalty, payment, refund, notification, privacy, or authorization behavior unintentionally
- [ ] Validate the overhaul against Dev services with typecheck, lint, application tests, database tests, production build, responsive review, accessibility review, and critical end-to-end flows
- [ ] Merge the approved overhaul into `develop`, complete a final Dev deployment review, then promote the tested revision to `main`
