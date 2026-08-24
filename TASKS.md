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
- [x] Persist cart in browser local storage
- [x] Navigate from cart to checkout
- [ ] Add automated unit tests for cart and configuration calculations
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
- [x] Align admin and customer mock order products, coatings, totals, and statuses
- [x] Add purpose, customer-impact, and connection guidance to every admin area
- [x] Share customer/admin mock commerce and pickup constants
- [ ] Review dense admin screens at small tablet widths

## Phase 5 — UI Quality Assurance

- [x] Run lint
- [x] Run typecheck
- [x] Run production build
- [x] Check Our Creations on desktop and mobile
- [x] Check coating image loading and cropping
- [x] Check mixed-box calculations manually
- [ ] Test every customer route at mobile, tablet, and desktop widths
- [ ] Test every admin route at mobile, tablet, and desktop widths
- [ ] Complete keyboard-only navigation audit
- [ ] Complete screen-reader landmark and label audit
- [ ] Add empty, loading, and server-error states before data integration
- [ ] Confirm final legal and allergen wording

## Phase 6 — Backend Planning Gate

Do not begin without explicit approval.

- [ ] Review and approve proposed database model
- [ ] Finalize real prices and recipe/allergen data
- [ ] Finalize pickup locations, schedules, lead time, and cutoff
- [ ] Finalize cancellation, refund, and no-show policies
- [ ] Choose email provider
- [ ] Confirm admin identity and subdomain plan
- [ ] Create environment variable inventory

## Phase 7 — Supabase Setup

- [ ] Create Supabase project
- [ ] Add browser and server clients
- [ ] Add migrations, constraints, and indexes
- [ ] Enable and test RLS
- [ ] Add controlled seed data
- [ ] Add product image storage only if local/Vercel assets are insufficient

## Phase 8 — Authentication and Authorization

- [ ] Configure Google OAuth and Supabase provider
- [ ] Implement sign-in and logout
- [ ] Create/update profiles
- [ ] Protect checkout and customer orders
- [ ] Configure one admin identity/role
- [ ] Protect admin routes server-side
- [ ] Test unauthorized and cross-customer access

## Phase 9 — Server Commerce

- [ ] Load products, variants, coatings, add-ons, and availability from database
- [ ] Validate mixed-box allocations server-side
- [ ] Recalculate PHP prices server-side
- [ ] Implement configurable promotions
- [ ] Implement daily inventory
- [ ] Reserve and release stock atomically
- [ ] Create order and item snapshots
- [ ] Record Terms acceptance
- [ ] Prevent duplicate checkout submissions

## Phase 10 — PayMongo Test Mode

- [ ] Add test environment variables
- [ ] Create server-only PayMongo helper
- [ ] Create pending payment orders
- [ ] Create checkout/payment session
- [ ] Add signed webhook endpoint
- [ ] Store provider references
- [ ] Enforce webhook idempotency
- [ ] Handle success, failure, refund, and 15-minute expiry
- [ ] Never infer payment success from browser redirects

## Phase 11 — Orders, Reviews, Journal, and Admin CRUD

- [ ] Connect customer order list and details
- [ ] Enforce order status transitions
- [ ] Implement cancellation eligibility
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

## Phase 13 — Security and Production

- [ ] Review RLS and admin authorization
- [ ] Test price, stock, order, and webhook tampering
- [ ] Review secret exposure and logging
- [ ] Add rate limiting where appropriate
- [ ] Deploy production configuration to Vercel
- [ ] Connect `tsokolitaw.com`
- [ ] Configure `admin.tsokolitaw.com` if approved
- [ ] Configure production OAuth and PayMongo webhook URLs
- [ ] Switch to live keys only after test-mode sign-off
- [ ] Complete final smoke test and policy verification
