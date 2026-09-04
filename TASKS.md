# TsokoLitaw — Development Tasks

## Current Milestone

Phase 13 Security and Production is complete. The Production baseline, live QR Ph payment, signed webhooks, Cron jobs, OAuth, transactional email, Search Console setup, and final smoke test are verified. Phase 14 UI Overhaul is in progress on `development`. Phase 15 Android APK Packaging follows only after the Phase 14 interface is stable. Post-launch Search Console monitoring and the separately approved historical-refund database cleanup remain operational follow-up work.

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
- [x] Calculate per-piece coating charges in UI
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
- [x] Add coating-entry preview with name, description, 1:1 image validation, per-piece price, and default selection
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
- [x] Verify a hosted live QR Ph payment and signed paid webhook
- [x] Preserve the earlier full-refund implementation as historical schema/event compatibility (superseded September 1, 2026)
- [x] Track historical refund state separately from order cancellation
- [x] Never infer payment success from browser redirects

## Phase 11 — Orders, Reviews, Journal, and Admin CRUD

- [x] Connect the authenticated customer order list with real order snapshots and status filters
- [x] Connect customer order details
- [x] Connect Admin Orders to real order snapshots with search and status filtering
- [x] Enforce the one-way paid fulfillment path from `CONFIRMED` through `COMPLETED`
- [x] Record Admin fulfillment transitions in the audit log
- [x] Implement cancellation eligibility
- [x] Close customer cancellation at `PREPARING` and enforce no-show non-refund policy
- [x] Retire the encrypted manual-refund fallback from the active application while preserving historical schema
- [x] Restrict new PayMongo Hosted Checkout sessions to QR Ph
- [x] Restrict website cancellation to pending unpaid orders and direct paid-order concerns to in-person settlement
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

- [x] Establish and document the Git/environment policy: `development` deploys Dev, `main` deploys Production, routine work promotes through one `development` → `main` pull request, and separate feature branches are reserved for risky or large changes
- [x] Keep the existing Vercel project on `development` as `tsokolitaw.vercel.app` Dev, keep the separate `main`-tracking Production project for `tsokolitaw.com`, and isolate every environment variable and provider callback
- [x] Require every database change to be represented by a reviewed migration, validated against Dev first, and promoted unchanged to Production
- [x] Apply the conflict-safe Production reference-data migration after its local reset, lint, and database tests pass
- [x] Review RLS and admin authorization
- [x] Test price, stock, order, and webhook tampering
- [x] Review secret exposure and logging
- [x] Add application-wide browser/server form validation, changed-only edit actions, accessible custom listboxes and numeric steppers, decoded image verification, and failed-save upload cleanup
- [x] Consolidate My Orders and order detail into RLS-scoped nested reads
- [x] Add cursor pagination to customer order history
- [x] Add bounded tagged caching for public catalog previews and pickup definitions while keeping checkout authoritative reads live
- [x] Add structured timing for performance-sensitive commerce and order reads
- [x] Add an atomic service-only per-user/per-IP mutation rate limiter and daily bucket pruning
- [x] Configure Vercel Fluid compute and align the current linked Singapore development database with `sin1`
- [x] Add repeatable k6 smoke, ramp, 100-user hold, and spike scenarios
- [x] Apply the performance/rate-limit schema delta to the existing hosted development database before deploying the dependent application code
- [x] Run the k6 smoke and 100-user staging gates; the capacity run completed 55,801 requests with zero failures, 372.6 ms p95, and 898.33 ms p99
- [x] Keep the shared Vercel function region in `sin1`; the measured campus-scale target does not justify per-environment region configuration
- [x] Review provider timeouts and idempotent retry behavior before PayMongo live mode
- [x] Deploy production configuration to Vercel
- [x] Copy approved coating assets to production Storage and verify the production catalog images
- [x] Connect `tsokolitaw.com` and make `www.tsokolitaw.com` the canonical public origin
- [x] Create a different production `CRON_SECRET` and configure the same value in Vercel Production and the production Supabase Vault
- [x] Store the canonical `https://www.tsokolitaw.com` origin as `tsokolitaw_site_url` in the production Supabase Vault
- [x] Create the five-minute payment-expiration and notification-retry jobs plus the daily account-deletion job in production Supabase Cron
- [x] Verify all three production Cron jobs return authorized HTTP `200` responses before launch
- [x] Keep the default environment-specific Supabase authentication domains; do not purchase or configure the custom-domain add-on for campus-scale V1
- [x] Verify the Google OAuth app is External and In production with the correct Production callback, minimal `openid email profile` scopes, and current support/developer contacts; optional brand verification is not required for V1
- [x] Test login, callback, logout, customer route protection, and Admin authorization on the production domain using the default Production Supabase callback
- [x] Keep Admin under `/admin`; do not add an Admin subdomain for V1
- [x] Add the canonical `https://www.tsokolitaw.com/api/webhooks/paymongo` endpoint alongside the isolated Dev webhook
- [x] Configure the production PayMongo signing secret, redeploy, and verify a signed live QR Ph payment webhook
- [x] Configure production OAuth and PayMongo URLs
- [x] Switch Production to live keys after test-mode sign-off while keeping Dev in test mode
- [x] Use `https://www.tsokolitaw.com` as the canonical production origin and permanently redirect the root domain to it
- [x] Audit unique page titles, descriptions, canonical URLs, favicons, Open Graph images, and social-sharing metadata on every public route
- [x] Mark private and transactional routes such as Admin, Profile, Orders, Checkout, Auth, Payment, and API endpoints as non-indexable
- [x] Generate production `robots.txt` and a root `sitemap.xml` containing only canonical public URLs with absolute production links
- [x] Add truthful Organization structured data for TsokoLitaw; validate the deployed page with Google Rich Results Test before launch
- [x] Run Lighthouse checks on Home, Our Creations, Journal, Terms, and Privacy before allowing indexing
- [x] Create and DNS-verify the `tsokolitaw.com` domain property in Google Search Console
- [x] Submit `https://www.tsokolitaw.com/sitemap.xml` in Google Search Console after the canonical domain is live
- [x] Inspect the Home, Our Creations, and Journal URLs in Search Console and request initial indexing after confirming they return public `200` responses
- [ ] Check Search Console indexing, crawl, HTTPS, structured-data, Core Web Vitals, security, and manual-action reports after launch
- [ ] Monitor search queries, indexed pages, sitemap status, and crawl errors during the first weeks, then correct metadata or technical SEO issues without keyword stuffing
- [ ] Assess Google Business Profile eligibility separately; create one only if TsokoLitaw meets Google's real-world business/location requirements
- [x] Complete final smoke test and policy verification
- [ ] During the separately approved post-Phase-13 database cleanup, remove the inactive historical refund subsystem only after preserving any required transaction evidence; do not run this removal before that reset

## Phase 14 — UI Overhaul

Do not begin until Phase 13 establishes and verifies the production baseline.

- [x] Tag the stable Phase 13 production release before beginning the redesign
- [x] Use `development` for the UI overhaul, creating a separate feature branch only if the work becomes risky or too large to review safely
- [x] Complete the first approved customer-facing pass: photo background, two-font typography, tighter page spacing, mobile builder return action, and mobile-first checkout summary
- [x] Apply the approved box names, per-piece coating pricing, persisted default coating, simplified builder controls, receipt-style checkout summary, and full-width order filters
- [ ] Audit every customer and Admin page for information hierarchy, consistency, responsive behavior, accessibility, loading, empty, error, and success states
- [ ] Implement the approved UI overhaul without changing established commerce, inventory, pickup, loyalty, payment, refund, notification, privacy, or authorization behavior unintentionally
- [ ] Validate the overhaul against Dev services with typecheck, lint, application tests, database tests, production build, responsive review, accessibility review, and critical end-to-end flows
- [ ] Complete the approved overhaul on `development`, review the Dev deployment, then promote it through one `development` → `main` pull request

## Phase 15 — Android APK Packaging

Do not begin until the approved Phase 14 interface is stable. The APK is a thin distribution wrapper around the canonical Production website, not a second implementation.

- [ ] Add the Production web app manifest with TsokoLitaw name, canonical start URL and scope, standalone presentation, brand colors, and Android-compatible icons
- [ ] Create separate launcher/maskable icons and a custom centered Palitaw-themed splash illustration with density-safe spacing
- [ ] Generate the Trusted Web Activity Android project with PWABuilder/Bubblewrap; do not add Capacitor, a basic embedded WebView, or native commerce screens
- [ ] Choose and reserve the Android package name before the first signed distribution
- [ ] Generate the release signing key outside Git, create secure backups, and document the private recovery procedure without recording secrets in the repository
- [ ] Publish the matching release certificate association at `/.well-known/assetlinks.json` and verify the APK opens without Custom Tab browser controls
- [ ] Build a versioned signed APK for direct distribution; Google Play and an Android App Bundle are outside the approved scope
- [ ] Publish the APK as a versioned release asset and add a clear **Download Android APK** action to the website with Android sideloading guidance
- [ ] Test installation and upgrade on physical Android devices, including launcher icon, system/custom splash transition, back navigation, external links, and unsupported/offline behavior
- [ ] Test Google OAuth, Supabase session persistence, cart persistence, customer/Admin authorization, and PayMongo QR Ph redirect/return from the installed APK
- [ ] Run the normal web validation suite and scan the release APK before publishing its download link
