# TsokoLitaw — AI Agent Instructions

## 1. Read Before Coding

Read these first:

1. `REQUIREMENTS.md`
2. `DECISIONS.md`
3. `ARCHITECTURE.md`
4. `DATABASE.md`
5. `DESIGN.md`
6. `TASKS.md`
7. `README.md`

Inspect relevant existing code and assets before changing UI.

`DECISIONS.md` explains why established workflows exist. Do not reverse an approved decision because an older reference or unused component shows different behavior.

## 2. Current Project Stage

**Phase 13: Security and Production is complete, and Phase 14: UI Overhaul is in progress.** Authentication, authorization, server commerce, PayMongo QR Ph, connected Admin operations, atomic seven-order loyalty, transactional emails, bounded retry processing, signed Resend delivery tracking, production Cron, Search Console setup, and final Production smoke testing are implemented and validated. Paid-order settlements occur in person; the website does not create refunds. Phase 14 must preserve that baseline while improving the interface. Phase 15 Android APK Packaging follows only after the Phase 14 interface is stable.

Allowed:

- React and Tailwind UI
- local component state
- browser-local cart state
- existing static content and temporary UI state where no persistence is required
- local product photography and placeholders
- Supabase migrations, constraints, indexes, RLS policies, tests, and controlled seed data
- browser, server, and privileged Supabase client helpers
- Google OAuth and authenticated profile access through Supabase
- server-side guards for checkout, account/order, review, and Admin routes
- runtime reads for active catalog, pickup availability, and inventory
- server-only commerce validation, pricing, inventory reservation/release, Terms acceptance, and pending-order creation
- environment-bound PayMongo QR Ph Hosted Checkout, signed paid webhooks, and historical refund-event reconciliation
- authenticated Admin reads and server-validated order fulfillment mutations
- completed-order review submission and Admin visibility/featured moderation
- Admin Journal draft/publication management and optional cover media
- Admin Inventory publication and unusable-piece adjustments for existing eligible pickup dates
- maintenance of the completed Phase 13 security, rate-limit, performance, metadata, and environment baseline
- migration-only Dev-to-Production database promotion using separate Supabase projects
- the separately approved Phase 14 UI overhaul when requested
- the documented Phase 15 Trusted Web Activity APK scope after Phase 14 is stable

Do not perform without a separate explicit user confirmation at the final external action:

- PayMongo live-mode keys or charges
- transactional email events beyond the six completed V1 events
- Admin capabilities outside the connected V1 operational areas
- any later public DNS cutover or host expansion

Never make an unconnected prototype look like secure authentication, verified payment, or persisted Admin data.

## 3. UI References

Files in `references/` are rough early design drafts retained for context. They are not pixel-perfect requirements and must not override newer user decisions or the implemented design system.

Do not use reference PNGs as page images.

Use this priority:

1. Latest user-approved behavior and content
2. Existing shared components and tokens
3. Responsive/accessibility requirements
4. Reference PNGs for broad visual context

## 4. Current Product Decisions

- Currency is PHP.
- Box sizes are 4, 6, and 8 pieces.
- Products use coatings, not flavors or toppings.
- Coatings: Cocoa, Milk, Palitaw, Crushed Nuts, Plain, Sesame Seeds, Cookies and Cream.
- Palitaw means sugar, niyog, and sesame seeds.
- One coating type is included.
- Each additional coating type uses its Admin-configured database price; ₱5 is the current seed.
- Mixed boxes allocate every piece and must total the selected box size.
- Campus pickup only.
- Made to order, Ready stock, and Hybrid all require website checkout and online payment; V1 has no cash or untracked walk-in sales.
- Every sellable pickup option is an explicitly Admin-published date, time window, and location; no mode makes the storefront automatically available every day.
- Made to order uses published schedules and cutoff/lead-time rules without prepared-stock enforcement.
- Ready stock uses an Admin-published prepared-piece upper limit for its pickup date; Hybrid applies prepared stock to same-day orders while allowing eligible advance made-to-order checkout.
- Prepared stock is counted in individual Palitaw pieces per pickup date and shared across 4-, 6-, and 8-piece boxes.
- Admin Inventory edits stock for dates created by Admin Pickup; it must not create pickup dates or expose a separate “Available for online checkout” switch.
- A prepared total cannot be lowered below pieces already committed to orders or removed as waste. A different date starts an independent balance.
- Browser pricing is never authoritative; checkout reloads and recalculates current values on the server.

## 5. Navigation Decisions

Customer main navigation:

- Home
- Our Creations
- Journal

Header actions:

- Account/Profile
- Cart with item count

My Orders belongs in the Account/Profile UI and must not be restored to the main navbar.

Journal replaces Vlog and contains announcements, stories, features, community highlights, and optional videos.

Reviews are available only from eligible completed order details. Do not add public Feedback navigation.

Admin stays under `/admin` for campus-scale V1; no Admin subdomain is planned.

## 6. Assets

- Use Lucide React for missing simple icons.
- Do not add another icon library without a strong reason.
- Logo: `public/brand/logo.png`.
- Coating photos: Supabase `catalog-media`, referenced by each coating's persisted `image_url`.
- Home feature media: `public/images/home/` and `public/videos/home/`.
- New coating images use a square 1:1 presentation and must be validated before future upload.
- Use local placeholders only when a real asset is unavailable.
- Do not add random remote or paid asset dependencies.

## 7. Before Coding

1. Inspect existing files and relevant assets.
2. Identify the smallest affected surface.
3. Understand the current component, domain-data, and persistence flow.
4. Explain the intended change briefly.
5. Identify future schema/security implications when relevant.
6. Preserve unrelated user changes.

## 8. Implementation Rules

- Next.js App Router.
- Strict TypeScript; avoid `any`.
- Prefer Server Components unless interaction requires a Client Component.
- Use Tailwind CSS and existing tokens.
- Reuse existing components before adding variants.
- Use shared domain constants or persisted sources when customer and Admin UI represent the same data; do not maintain contradictory page-local copies.
- Every Admin feature must have a clear operational purpose and customer impact. Mark any unconnected control as unavailable.
- Keep Pickup scheduling and Inventory responsibility separate: Pickup creates/publishes dates, windows, locations, modes, cutoffs, and capacity; Inventory assigns prepared pieces only to existing Ready Stock or Hybrid dates.
- Admin coating creation collects name, description, square image, allergen information, and additional-type price, then persists through the connected audited Catalog mutation. Do not restore the obsolete session-only preview workflow.
- When an approved product decision changes workflow or domain meaning, update `DECISIONS.md` and every affected root specification in the same task.
- Mobile-first responsive behavior.
- Semantic HTML, labels, keyboard support, visible focus, and meaningful alt text.
- Avoid unnecessary dependencies and premature abstraction.

## 9. Backend Rules

For every backend change:

- Supabase RLS is required.
- Never expose service-role or PayMongo secret keys.
- Admin authorization must be checked server-side.
- Recalculate prices server-side.
- Validate stock with atomic/transaction-safe operations.
- Preserve historical order snapshots.
- Verify PayMongo webhooks and process them idempotently.
- Never trust redirect parameters or browser payment state.
- Keep order status separate from payment status.
- Restrict customers to their own profiles and orders.

## 10. Order Statuses

Primary flow:

```text
PENDING_PAYMENT
→ PAID
→ CONFIRMED
→ PREPARING
→ READY_FOR_PICKUP
→ COMPLETED
```

Terminal alternatives:

```text
CANCELLED
EXPIRED
```

Future transitions must be validated server-side.

## 11. After Coding

1. Run typecheck.
2. Run lint.
3. Run relevant tests.
4. Run a production build for route or integration-wide changes.
5. Review the diff and check for unrelated changes.
6. Check responsive behavior in proportion to the change.
7. Summarize changed files and unresolved issues.

## 12. Git Handoff

The user performs Git operations manually.

Agents must:

- report whether the requested feature is complete
- report validation results
- provide a concise Conventional Commit message
- recommend modular commit groups when a large batch has accumulated

Agents must not stage, commit, or push.
