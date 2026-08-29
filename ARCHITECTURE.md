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

## 2. Current Application Architecture

```text
Next.js App Router
├── Server Components for static page composition
├── Client Components for interactive UI
├── Tailwind CSS design tokens
├── Supabase-backed customer catalog and pickup read models
├── localStorage cart as an untrusted browser convenience
├── Supabase Google OAuth and cookie-backed sessions
├── Server-protected customer and Admin routes
└── Local brand and product assets
```

The Supabase foundation defines the PostgreSQL schema, RLS policies, tests, controlled seeds, and browser/server/privileged client helpers. Google OAuth and authenticated profile access are connected. Active products, variants, coatings, add-ons, and published pickup options load from Supabase. Phase 9 validates and reprices checkout server-side, reserves inventory, creates immutable pending-order snapshots, records Terms acceptance, prevents duplicate submissions, and expires overdue unpaid reservations. Phase 10 creates idempotent PayMongo test checkout sessions, redirects customers to Hosted Checkout, verifies signed paid webhooks, and treats the browser return as informational only. Provider-bound expiry is coordinated server-side so stock is released only after PayMongo closes the checkout session. Phase 11 Admin Orders reads the same persisted snapshots customers see and advances paid fulfillment through an atomic, audited database function. Completed-order owners submit one review from an order-detail modal; submissions remain non-public until audited moderation. Admin Journal persists draft/published posts and featured reviews, and the public Journal reads only published posts plus visible featured reviews. Admin Catalog uses service-only audited mutations and public square-media storage. Admin Inventory publishes date-specific prepared-piece totals and records unusable pieces through audited server mutations; checkout consumes the shared piece balance atomically across all box sizes. Admin Pickup persists schedules and customer-safe operating rules through active-Admin-checked audited functions. The Admin dashboard reads bounded summaries from these connected domains in parallel and does not introduce a separate reporting store. Phase 12 loyalty, notifications, and email remain unconnected.

Current customer/admin relationship:

```text
Database commerce catalog
├── Our Creations
└── Admin Catalog controlled persistence

Database-published pickup data and safe rules
├── Checkout
├── Admin Pickup controlled persistence
└── Admin Inventory eligible-date selection

Admin order operations
├── Admin Orders real snapshot list and fulfillment transitions
└── Dashboard bounded order charts plus linked Catalog, Pickup, Inventory, Customers, Journal, and review summaries

Authenticated customer order surfaces
├── My Orders ownership-scoped database list and status filters
└── Dynamic order/review routes unavailable until their scoped detail reads and mutations exist
```

Customer catalog and pickup reads reflect the linked database. Connected Admin areas write through server-only controlled mutations; the Dashboard remains read-only and links to those authoritative management surfaces.

Client Components are limited to interactions such as:

- cart state and persistence
- successful add-to-cart confirmation modal
- product configuration
- custom dropdowns
- authenticated account menu and shared confirmation-based logout
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
- loyalty calculation
- stock reservation and release
- order creation and snapshots
- PayMongo checkout creation
- webhook verification and idempotency
- idempotent Resend email dispatch and delivery-event handling
- terms acceptance recording
- admin mutations

Phase 9 uses a two-layer checkout boundary. Next.js accepts only catalog identifiers, coating allocations, add-on counts, and quantities; it reloads current database prices before calling the service-role-only `create_pending_order` PostgreSQL function with the trusted snapshot projection. That function first expires overdue unpaid orders, releases any corresponding ready-stock reservations, then atomically locks the customer and pickup window, validates bounded order quantities, reserves required ready stock, writes the order graph and Terms acceptance, and returns an existing order when the same customer idempotency key is retried. Browser clients receive no direct execute permission on either commerce writer.

Phase 10 creates one PayMongo checkout for the order's unique payment row and stores its immutable provider ID and URL. A return to `/payment/success` reloads the owned order and may display `PAID` only after the signed webhook has completed the atomic database transition. The protected payment-expiration job lists overdue provider-bound checkouts, expires each session through PayMongo first, and only then invokes the database transition that marks the payment `FAILED`, marks the order `EXPIRED`, and releases ready stock. Provider failures remain pending and reserved for retry.

Supabase Cron is the single scheduler for trusted maintenance HTTP jobs. It calls payment expiration every five minutes and account deletion daily using the same bearer secret stored independently in Supabase Vault and the Vercel `CRON_SECRET` environment variable. Vercel Hobby cron is not used because it permits only daily, imprecise execution; keeping one scheduler also avoids duplicate maintenance invocations.

## 4. Routing

Customer routes are public under the main application. Account, checkout, order, and review routes require a verified Supabase session.

Admin routes remain under `/admin` and require both a verified Supabase session and a server-loaded `profiles.role = 'admin'`. Signed-in non-Admins receive the global Not Found boundary at the requested Admin URL, without a dedicated authorization redirect or disclosed administrator approval details. The planned `admin.tsokolitaw.com` host is deferred. Future host routing may map the subdomain to `/admin`, but must not replace server-side admin authorization.

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
├── lib/                 # Server commerce reads plus remaining mock domain data
└── types/               # Explicit domain types
```

Commerce business rules belong in server modules and database functions rather than presentation components.

Our Creations consumes the active database catalog, and Checkout consumes published database pickup options plus customer-safe lead/cutoff rules. Admin Catalog and Pickup write their respective records through controlled server actions. Inventory automatically receives eligible Ready Stock and Hybrid dates created in Pickup, while Made to order never requests prepared inventory.

The Admin coating form validates a square 1:1 image in the browser, limits server uploads to approved image types and 3 MB, stores the public asset in `catalog-media`, and publishes the database record only through an active-Admin-checked service mutation.

## 6. Current Cart

The UI cart is exposed through `CartProvider` and persisted under a browser-local storage key.

It supports add, remove, bounded numeric quantity editing, per-line checkout selection, subtotal, and clear operations. Cart lines and their selected IDs persist under separate browser-local keys. When hosted checkout starts, the selected line IDs are snapshotted under a pending-checkout key; verified payment removes only that snapshot so unchecked lines remain in Cart. Builder and Cart caps protect the client surface from extreme values but do not claim live stock knowledge because no pickup date has been selected yet. Checkout reports the selected date's remaining prepared-piece balance, compares it with total cart pieces, and still rechecks inventory and pickup eligibility transactionally.

Future checkout flow:

1. Send configuration identifiers and quantities to the server.
2. Reload active product, coating, add-on, and stock records.
3. Validate mixed-box counts and availability.
4. Recalculate all prices.
5. Create immutable order snapshots.

## 7. Supabase

Phase 7 foundation:

- PostgreSQL
- one squashed production bootstrap migration under `supabase/migrations/`
- controlled operational seeds in `supabase/seed.sql`
- pgTAP authorization checks under `supabase/tests/database/`
- separate browser, server, and service/admin client helpers under `src/lib/supabase/`

Google authentication and profile integration are active. Live commerce data integration remains deferred. Local/Vercel product assets remain sufficient, so Supabase Storage is not currently required.

Never expose privileged Supabase credentials. RLS is defined on every exposed table before customer data is connected. Direct customer-facing commerce mutations remain unavailable until later server-commerce work can validate authorization, pricing, stock, and snapshots.

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
- Active Admin identities may use customer checkout for their own orders; the server action always uses the authenticated profile as the owner.
- Account deletion remains an authenticated RPC plus secret-protected daily processor. Phase 9 separately authorizes server commerce reads and the narrowly scoped mutations required for validated checkout and inventory; it does not authorize broad Admin CRUD, payment, or email APIs.
- The processor rechecks active orders/refunds and permanently flips the due profile to inactive without deleting Auth or relational records.
- Accounts pending deletion may access Profile and order history but cannot begin a new checkout.
- Inactive profiles fail RLS and server authorization checks. OAuth callback handling clears any newly exchanged session and redirects to the deleted-account screen.

V1 supports five approved Google identities under one shared admin role. One identity may bootstrap Admin now and four may be added later through controlled backend data. Authorization is checked on every admin route and mutation, independent of the `/admin` path or any future hostname.

## 9. Pricing and Product Configuration

- Product variants represent 4-, 6-, and 8-piece boxes.
- Each box base total is `variant piece count × the product's current admin-managed price per piece`.
- Coatings are selectable per box or per piece.
- The first distinct coating type is included.
- Each additional distinct type adds that coating's configurable additional-type charge.
- The current ₱5 additional-type amount is a seed loaded from catalog data, not a permanent constant.
- Add-ons such as extra sea salt cream are separate Admin-managed records. The customer builder lists every active record and may attach one add-on ID plus quantity to a configured box; checkout reloads that record and its current price before creating snapshots.

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

PayMongo checkout creation is server-only and uses a stable idempotency key derived from the internal payment UUID. One payment row is allowed per order, and a checkout session can be attached to it only once. The webhook route verifies the timestamped test signature against the untouched request body before parsing. Its database transition deduplicates by checkout/payment event key and requires the provider checkout ID, payment ID, order UUID, kiosk order number, PHP amount, and pending states to match in one transaction. Redirect success is never treated as payment proof, and raw billing payloads are not retained.

Standard cancellation is allowed only before `PREPARING`. Unpaid cancellations release reserved stock; paid cancellations create a full refund to the original payment method. Refund lifecycle is tracked separately from order cancellation, and only verified provider events may confirm completion. Prepared and no-show orders are non-refundable. A restricted manual destination is collected only after an unsupported or failed provider refund.

The order-detail server action first asks the database for the locked cancellation kind. For an unpaid provider-bound order it expires the exact PayMongo checkout before the database changes order/payment state or releases inventory. For a paid order the database records `CANCELLED` plus a separate full refund request, after which the server creates the idempotent PayMongo refund using the stored payment ID. An authenticated API response or signed refund webhook updates that refund; browser navigation never does. Manual destination values use a dedicated server-only encryption key and remain in the Admin-readable restricted table.

## 11. Inventory

V1 inventory:

- prepared piece total by date and product, shared across every box size
- online-committed piece quantity
- unusable/waste-consumed piece quantity
- coating/add-on availability
- atomic reservation and release operations

```text
available = stock_total - stock_reserved - stock_sold
```

Checkout converts every requested box into pieces (`quantity × product_variants.piece_count`) before locking and updating the one daily product balance. Expired or cancelled unpaid orders reverse the same piece calculation. Admin may set the exact prepared total and record unusable pieces only through active-Admin-checked database functions. Every change writes both an inventory adjustment and an Admin audit entry. A saved total cannot be lower than already committed plus consumed pieces. Checkout availability follows the published pickup date and remaining stock; Inventory does not expose a second manual availability control.

Pickup locations, dates, time windows, lead days, cutoff time, and availability mode are admin-managed database records or settings. Made-to-order is the default; Admin can publish same-day ready-stock options when products are brought to school. Every customer sale in every mode still uses website checkout and online payment; the mode changes preparation and inventory behavior only. Waste must be recorded so checkout does not oversell. Checkout reads only published, currently eligible options. Paid orders preserve pickup snapshots so later admin edits do not rewrite existing commitments.

Responsibility and data flow:

```text
Admin Pickup
→ creates one explicit pickup date
→ assigns mode, windows, locations, cutoff, and lead time
→ publishes or closes the date

Ready Stock or Hybrid date
→ appears in Admin Inventory
→ receives one independent prepared-piece upper limit
→ checkout atomically commits pieces from that date only
```

`MADE_TO_ORDER` dates never require a `daily_inventory` row. `READY_STOCK` dates require remaining pieces. `HYBRID` uses prepared pieces for same-day checkout and made-to-order rules for eligible future checkout. The Admin Inventory summary is selected-date state, not an aggregation across future dates or an all-time count.

## 12. Orders, Reviews, and Journal

- Order and payment statuses are separate.
- Customers read only their own orders.
- Reviews belong to a completed order and its customer.
- Enforce one review per order.
- Public Journal highlights expose only approved display data.
- Journal posts support content type, icon, editable display date, publication state, optional cover media, and secure video links.
- `upsert_journal_post` is service-role-only, rechecks the active Admin, and audits creates/updates.
- A public-read `journal-media` bucket accepts only JPG, PNG, or WebP cover images up to 3 MB; uploads occur through trusted server code.

## 13. Environment Variables

Add only when the corresponding integration begins:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=

# Local .env.local only; used by npm run admin:bootstrap
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

Only values intentionally prefixed with `NEXT_PUBLIC_` may be available to the browser. The Supabase secret key, initial admin identity, PayMongo, and Resend secrets remain server-only deployment configuration. Never commit `.env.local` or real secrets.

## 14. Deployment

- UI preview: GitHub → Vercel
- production app: Vercel
- database/auth/storage: Supabase
- production authentication endpoint: `auth.tsokolitaw.com` through the Supabase custom-domain add-on
- payments: PayMongo
- transactional email: Resend using a verified domain or sending subdomain
- customer domain: `tsokolitaw.com`
- planned admin domain: `admin.tsokolitaw.com`

Use PayMongo test mode and non-production Supabase configuration before live rollout.

The default Supabase project domain is accepted for development OAuth. Production custom-domain activation requires DNS verification and TLS readiness, the branded callback in Google Auth Platform, the custom Supabase URL in Vercel, and an end-to-end session/authorization smoke test. Keep the original Supabase callback configured until the branded flow is verified.

## 15. Performance and Concurrency

The V1 target is to remain correct and responsive during a burst of at least 100 concurrent customer requests. Scaling the Vercel function alone is not sufficient: every browser request can fan out into several database requests, so the first priority is to reduce round trips and database work per request. Performance changes must preserve RLS, server-authoritative pricing, atomic inventory, payment verification, and idempotency.

### Implemented hot-path optimization

The authenticated customer order pages no longer perform a serial order/item/coating/refund fan-out:

1. My Orders uses the cookie-backed authenticated Supabase client and one RLS-scoped nested PostgREST query for orders, items, and coatings.
2. Order detail uses one RLS-scoped nested query for its order graph and latest refund state.
3. My Orders uses a stable `(created_at, id)` cursor with a page size of 20 instead of loading an unlimited history.
4. Both queries select only rendered snapshot fields and exclude provider payloads, manual refund destinations, and unused internal fields.
5. If measurement later shows the nested query plan is inefficient, replace it with a narrowly scoped authenticated SQL function or PostgreSQL 15+ `security_invoker` view. It must derive ownership from `(select auth.uid())`, never trust a browser-supplied owner ID, and retain cross-user denial tests.

React `cache()` may continue to deduplicate authentication/profile work inside one server render, but it is request-scoped and is not a shared cache between customers or requests.

### Cache safety matrix

| Data | Shared cache | Rule |
| --- | --- | --- |
| Active public catalog, coating descriptions, Journal posts, legal content | Yes | Use explicit Next.js cache lifetimes and tags. Future Admin publication invalidates the matching tag. |
| Published pickup date/time/location definitions | Short-lived only | Tag and revalidate after Admin publication. A stale definition may be displayed briefly, but checkout must revalidate it live. |
| Ready stock and current prices used for checkout | No authoritative cache | Browser display may be a preview. Every order mutation reloads and validates current database state inside the existing transactional boundary. |
| Profile, My Orders, order detail, payment, refund, account-deletion state, and Admin data | No shared cache | These are user-specific or sensitive. Use RLS-scoped live reads and request-only memoization where useful. |

The current implementation uses tagged `unstable_cache` entries for deliberately shared read-mostly catalog previews and published pickup definitions because Cache Components are not enabled. Public catalog previews revalidate after five minutes and published pickup definitions after 30 seconds. Future Admin publication must invalidate the matching tag. If the application later enables Cache Components, these entries may move to `use cache`, `cacheLife`, and `cacheTag`. Cache keys and values must not contain secrets, payment data, refund destinations, or unnecessary PII. Checkout always reloads live catalog, price, inventory, and schedule state; webhook paths never trust cached payment or order state.

### Database query and index rules

- Index every ownership, foreign-key, status, sort, and RLS filter used by a hot query. RLS filters such as `user_id = (select auth.uid())` require `user_id` to be the leading column of a usable index.
- Keep the existing order ownership/sort index and verify whether the load-test query plans need `(user_id, created_at desc, id desc)`, order-item ordering, or latest-refund indexes before adding them. Do not add speculative indexes; every index also increases write cost.
- Wrap stable RLS helpers such as `auth.uid()` in `select` so PostgreSQL can evaluate them once per statement rather than once per candidate row.
- Inspect hot reads with `EXPLAIN (ANALYZE, BUFFERS)` on local or staging data and review `pg_stat_statements`/Supabase database reports. Use plain `EXPLAIN` for production or any mutation that must not execute.
- Avoid N+1 queries, unbounded result sets, `select *`, row-by-row server loops that SQL can aggregate, and repeated count queries on every render.
- Keep checkout, cancellation, refund, webhook, expiry, and inventory transitions in bounded atomic database functions with the smallest practical lock scope. Never weaken locking to gain speed.

### Concurrency, backpressure, and failure handling

- Preserve idempotency keys for checkout creation, cancellation, refunds, webhooks, and scheduled jobs. A retry must return or advance the same operation, not create a second one.
- Apply a distributed per-user and per-IP rate limit to expensive mutations before public launch. In-memory counters are forbidden because Vercel instances do not share state. Return `429` with a retry hint instead of allowing an unlimited queue.
- Bound cart quantity, page size, filter complexity, upload size, and batch size at the server boundary.
- Add explicit timeouts to external provider calls. Retry only safe reads or idempotent operations with the same idempotency key and capped exponential backoff; never blindly retry an ambiguous write.
- Keep payment/refund provider work outside long-held database locks. Record a durable intent, call the provider, then apply an idempotent verified transition.
- Do not use loading skeletons, artificial delays, or optimistic status labels to hide slow server work. They improve perceived continuity only and are not a capacity solution.

### Deployment topology

- Run Vercel Functions in the region closest to the Supabase project. Static assets may remain globally cached, but dynamic server-to-database distance directly affects every uncached request.
- The linked development Supabase project is in Singapore (`ap-southeast-1`), so the current Vercel configuration uses `sin1`. The planned production Supabase project is in Seoul (`ap-northeast-2`); switch Vercel to `icn1` when that database becomes the active production target. Do not leave the application and database in different Asian regions by accident.
- Keep the current Supabase Data API/PostgREST client for application reads unless measurement justifies a direct PostgreSQL driver.
- If a future ORM or direct PostgreSQL client is introduced in Vercel Functions, use Supavisor transaction mode rather than opening unpooled direct connections from each serverless instance.
- Enable and validate Vercel Fluid compute for the production Node.js deployment when available. It can reduce cold starts and let one instance handle concurrent I/O-bound requests, but it does not replace query optimization or database safeguards.
- Do not add Redis or another cache service for V1 without evidence that tagged Next.js caching and query consolidation are insufficient. A new network dependency can increase both latency and operational risk.

### Observability

Every performance-sensitive route must be diagnosable without logging customer secrets:

- attach a request/correlation ID to server logs and provider operations
- record structured duration fields for authentication, profile lookup, database read/RPC, provider call, and total server time
- monitor Vercel invocation count, p50/p95/p99 duration, cold starts, and 4xx/5xx rate by route
- monitor Supabase slow/frequent queries, active connections, CPU, memory, cache hit rate, lock waits, and database errors
- redact access tokens, cookies, PayMongo signatures, customer contact data, and refund destinations
- alert on sustained p95 regression, error rate above the release threshold, connection saturation, webhook failures, or reservation-expiry backlog

### 100-concurrent-request validation gate

Run load tests against a staging deployment and staging/test database, not the developer laptop or live payment environment. Use protocol-level k6 scenarios for server capacity and a small separate browser test for user-perceived navigation. Do not load-test Google, PayMongo, Resend, or another third party without permission; replace those calls with test fixtures or exercise them separately at a safe rate.

Validation sequence:

1. Smoke test with 1–5 virtual users and verify response contents and ownership isolation.
2. Ramp through 10, 25, 50, and 100 concurrent users with realistic pacing.
3. Hold 100 concurrent users for 10 minutes across public browse, authenticated My Orders, order detail, and checkout reads.
4. Run a short 100-user spike to check cold-start/recovery behavior.
5. Run a small mutation scenario using unique seeded users and idempotency keys to prove no duplicate orders, overselling, double refunds, or cross-user reads.
6. Repeat after query, index, cache, region, or runtime changes and store the comparison with the release notes.

Initial release thresholds under the 100-user staging workload:

- less than 1% unexpected HTTP failures
- warm p95 server response below 1 second for public/authenticated reads
- warm p95 below 2 seconds for internal checkout/order mutations, excluding customer time on a hosted provider page
- zero cross-user disclosure, duplicate order, oversell, duplicate payment transition, or double refund
- no exhausted database connections, sustained lock backlog, or stuck inventory reservations
- latency and error rate return to baseline after the spike

If a threshold fails, optimize in this order: remove request fan-out and N+1 work, fix query plans/indexes, cache safe public reads, align deployment regions, add backpressure, and only then increase paid compute. Capacity upgrades without a before/after load test are not considered a completed optimization.

### Implementation sequence

1. **Instrumentation implemented:** structured duration logging wraps the consolidated commerce and order reads. Warm/cold staging measurements remain a release task.
2. **Read consolidation implemented:** My Orders and order detail use one RLS-scoped nested read each, and order history is cursor-paginated.
3. **Safe caching implemented:** public catalog previews and published schedule definitions use bounded tagged caches; authoritative checkout data remains live. Journal/legal caching waits for database-backed publication.
4. **Runtime controls implemented for current scope:** Vercel Fluid compute and the current development region are configured, and expensive customer mutations use an atomic database-backed per-user/per-IP rate limiter. Provider timeout review remains required before live mode.
5. **Load harness implemented:** repeatable k6 smoke, ramp, 100-user hold, and spike scenarios are in `tests/performance/`. The staging executions and recorded release comparison remain required before production launch.

Research basis: [Next.js shared caching](https://nextjs.org/docs/app/api-reference/functions/unstable_cache), [React request-scoped cache](https://react.dev/reference/react/cache), [Supabase nested relational reads](https://supabase.com/docs/guides/database/joins-and-nesting), [Supabase RLS performance rules](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization), [Supabase serverless connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region), [Vercel Fluid compute](https://vercel.com/docs/fluid-compute), and [k6 website load-testing guidance](https://grafana.com/docs/k6/latest/testing-guides/load-testing-websites/).

## 16. Principles

1. One codebase for V1.
2. Server-authoritative money, stock, permissions, and payment state.
3. RLS plus server-side authorization.
4. Immutable order snapshots.
5. Configurable operational values.
6. Minimal dependencies.
7. Accessible, mobile-first UI.
8. Explicit mock/deferred behavior during the UI phase.
9. Measure before scaling; reduce work per request before buying more compute.
10. Shared caches contain only deliberately public, non-authoritative data.
