# TsokoLitaw — Development Tasks

## Current Milestone

The project has completed the broad static UI phase. The next major phase is UI review and refinement, followed by backend planning and Supabase setup only after explicit approval.

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
- [ ] Add `.env.example` when the first backend integration begins
- [ ] Confirm production environment policy before adding secrets

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
- [ ] Perform final content and interaction review with product owner
- [ ] Replace remaining placeholders when approved assets are supplied

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
- [ ] Replace all browser-authoritative calculations during backend phase

## Phase 4 — Admin Static UI

- [x] Dashboard
- [x] Orders
- [x] Products
- [x] Inventory
- [x] Pickup
- [x] Promotions
- [x] Customers
- [x] Review Management
- [x] Journal Management
- [x] Settings
- [x] Remove editable Store Name
- [x] Add responsive tables and mobile navigation drawer
- [x] Disable backend-dependent actions with explanations
- [x] Align Admin Catalog with the three box sizes, seven coatings, add-on, images, and PHP prices
- [x] Align Admin Pickup with Checkout dates, times, locations, and pickup rules
- [x] Remove mock records from authenticated customer order history while retaining clearly labeled Admin operational previews
- [x] Add purpose, customer-impact, and connection guidance to every admin area
- [x] Share customer/admin mock commerce and pickup constants
- [x] Add frontend-only coating-entry preview with name, description, 1:1 image validation, and additional-type price
- [ ] Connect coating creation, media upload, and publication during authorized Admin CRUD work
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
- [x] Approve admin-managed pickup locations, schedules, lead time, cutoff, capacity, and availability
- [x] Confirm launch pickup locations and the Monday–Saturday, 7:00 AM–7:00 PM operating window
- [x] Confirm made-to-order default with Admin-published same-day ready stock
- [x] Set provisional made-to-order defaults: one-day lead time, 5:00 PM cutoff, hourly slots, and 20 boxes per slot
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
- [ ] Apply the revised account-deactivation schema to the hosted development project; keep the production bootstrap schema squashed
- [ ] Configure `CRON_SECRET` and the daily account-deletion schedule in Vercel
- [ ] Verify deletion request, checkout blocking, cancellation, due deactivation, retained relationships, access denial, and login bounce against the hosted project
- [ ] Execute live Google OAuth, initial Admin bootstrap, logout, unauthorized Admin, and cross-customer pgTAP verification

## Phase 9 — Server Commerce

- [x] Load products, variants, coatings, add-ons, and published pickup availability from database
- [x] Validate mixed-box allocations server-side
- [x] Recalculate PHP prices server-side
- [x] Implement configurable promotions
- [x] Implement daily inventory
- [x] Reserve and release stock atomically
- [x] Create order and item snapshots
- [x] Record Terms acceptance
- [x] Prevent duplicate checkout submissions
- [x] Apply the final Phase 9 schema upgrade to hosted development and complete customer/Admin pending-order proofs

## Phase 10 — PayMongo Test Mode

- [ ] Add test environment variables
- [ ] Create server-only PayMongo helper
- [ ] Create pending payment orders
- [ ] Create checkout/payment session
- [ ] Add signed webhook endpoint
- [ ] Store provider references
- [ ] Enforce webhook idempotency
- [ ] Handle success, failure, refund, and 15-minute expiry
- [ ] Implement full original-method refunds and verified refund webhooks
- [ ] Track refund state separately from order cancellation
- [ ] Never infer payment success from browser redirects

## Phase 11 — Orders, Reviews, Journal, and Admin CRUD

- [ ] Connect customer order list and details
- [ ] Enforce order status transitions
- [ ] Implement cancellation eligibility
- [ ] Close customer cancellation at `PREPARING` and enforce no-show non-refund policy
- [ ] Add restricted manual-refund fallback after provider failure
- [ ] Enforce completed-order review eligibility and uniqueness
- [ ] Connect public selected reviews
- [ ] Implement Journal draft/publish workflow
- [ ] Implement product, coating, add-on, inventory, pickup, promotion, customer, review, Journal, and settings administration
- [ ] Add auditability for sensitive admin actions

## Phase 12 — Loyalty and Notifications

- [ ] Count completed orders only
- [ ] Create and redeem seven-order reward
- [ ] Prevent duplicate rewards
- [ ] Send order confirmation email
- [ ] Send ready-for-pickup email
- [ ] Add cancellation/refund communication
- [ ] Keep email sending server-side
- [ ] Configure and verify the Resend sending domain or subdomain
- [ ] Add idempotent Resend sending and signed delivery webhooks
- [ ] Record message IDs, delivery states, failures, and retry attempts

## Phase 13 — Security and Production

- [ ] Review RLS and admin authorization
- [ ] Test price, stock, order, and webhook tampering
- [ ] Review secret exposure and logging
- [ ] Add rate limiting where appropriate
- [ ] Deploy production configuration to Vercel
- [ ] Connect `tsokolitaw.com`
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
- [ ] Configure production OAuth and PayMongo webhook URLs
- [ ] Switch to live keys only after test-mode sign-off
- [ ] Choose one canonical production origin (`https://tsokolitaw.com` or `https://www.tsokolitaw.com`) and permanently redirect every alternate HTTP/HTTPS host to it
- [ ] Audit unique page titles, descriptions, canonical URLs, favicons, Open Graph images, and social-sharing metadata on every public route
- [ ] Mark private and transactional routes such as Admin, Profile, Orders, Checkout, Auth, Payment, and API endpoints as non-indexable
- [ ] Generate production `robots.txt` and a root `sitemap.xml` containing only canonical public URLs with absolute production links
- [ ] Add truthful Organization or eligible Local Business structured data for TsokoLitaw and validate it with Google Rich Results Test
- [ ] Run Lighthouse and production Core Web Vitals checks on Home, Our Creations, Journal, Terms, and Privacy before allowing indexing
- [ ] Create and DNS-verify the `tsokolitaw.com` domain property in Google Search Console
- [ ] Submit `https://tsokolitaw.com/sitemap.xml` in Google Search Console after the canonical domain is live
- [ ] Inspect the Home, Our Creations, and Journal URLs in Search Console and request initial indexing after confirming they return public `200` responses
- [ ] Check Search Console indexing, crawl, HTTPS, structured-data, Core Web Vitals, security, and manual-action reports after launch
- [ ] Monitor search queries, indexed pages, sitemap status, and crawl errors during the first weeks, then correct metadata or technical SEO issues without keyword stuffing
- [ ] Assess Google Business Profile eligibility separately; create one only if TsokoLitaw meets Google's real-world business/location requirements
- [ ] Complete final smoke test and policy verification
