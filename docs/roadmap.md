# Current work and approved next phases

Owner direction (October 2, 2026): cancel the current Phase 15C APK and Phase 16 analytics work.
The active replacement is a footer-only Install app link to `/install`, with browser tutorials for
adding the existing website to the home screen. This adds no Android wrapper, analytics, database
change, offline ordering or automatic installation. The prior APK-based v1.0 acceptance definition
has not been replaced by a new release definition. The specifications below remain reference scope.

The owner defines v1.0 as the completed and accepted Phase 15C Android APK plus the working web app.
Until then the whole application is pre-release, including the Vercel Production environment.
Disposable test data does not require backward-compatibility layers. Database cleanup/rebaselining
is approved in principle; each hosted reset still needs its exact project and scope confirmed.

The production/security baseline (Phase 13), UI stabilization (Phase 14), and final commerce/payment
update (Phase 15A) are complete. Phase 15B dashboard code and SQL are implemented; authenticated
browser acceptance remains open. APK and analytics are not active next steps; the install tutorial
is implemented, and UI/operational validation continues against current code.
Completion of an earlier smoke test does not establish that every future deployment is healthy.
Use the current [release checks](operations/deployment.md), not old checked-off implementation lists.

## Phase 14 — UI stabilization (complete)

- Customer and Admin responsive behavior, accessibility, and loading/empty/error states were reviewed
  and stabilized through the normal Dev and PR workflow.
- Server pricing, SQL inventory/reward concurrency, ownership, signed payment verification,
  notification idempotency, and unpaid-only cancellation remain protected boundaries.
- Maintainer handover uses task-oriented docs, generated schema types, shared form contracts, and
  discoverable feature paths; do not add abstract layers merely for junior onboarding.

## Phase 15A — final commerce and payment update (complete)

- Add Chocolate Sprinkles to the controlled coating seed with a stable identity, active catalog
  placement, provisional price and the shared placeholder until its square catalog image is uploaded.
- Replace deployment-level `PAYMENT_METHOD` selection with `PAYMENT_MODE=automatic|manual`.
  Automatic mode offers PayMongo only. Manual mode lets the customer choose Manual GCash or Pay at
  the Counter while still creating and pricing every order through authenticated website checkout.
- Pin the selected method per order. Preserve the existing Manual GCash proof/review workflow and
  zero-total loyalty settlement. Add an audited, active-Admin-only counter-payment confirmation.
- Counter orders reserve normally, have no payment countdown, and may be prepared/made ready while
  unpaid. Existing confirmed-order cancellation rules remain unchanged; no automatic no-show state
  is added. SQL blocks completion until an Admin records received funds.
- Update the single pre-v1 baseline, generated types, environment guidance, payment/order/customer/Admin
  interfaces, notifications and dashboard provider labels. Validate locally before any hosted reset.
- Hosted Dev received the approved coordinated reset on September 24, including seed data, restored
  fonts, linked database validation and recreated Cron jobs. The owner accepted the matching Dev
  application work and Phase 15A as complete. Production received its separately approved coordinated
  activation on October 1; see the database migration runbook.

## Phase 15B — Admin Dashboard decision support (implemented; browser acceptance pending)

Phase 15A is complete. The Phase 15B application, SQL and test changes are implemented, and the
dashboard contract is folded into the single baseline active in hosted Dev and Production.
Authenticated responsive browser acceptance remains required before marking the phase complete.

The opt-in dashboard simulation fixture provides deterministic campus-shaped data for responsive and
reporting review. It is a testing aid only: loading it into disposable Dev does not complete Phase 15B,
replace browser acceptance, validate provider/Cron behavior, or authorize any Production data change.

- Replace the paid-sales columns with an accessible line/area trend that exposes both paid sales and
  paid-order volume, retains exact keyboard-accessible values and handles longer grouped ranges.
- Correct comparison windows before presenting deltas: fixed-day presets compare equivalent Manila
  calendar windows, month-to-date compares the same elapsed portion of the preceding month, and
  custom ranges retain an immediately preceding equal-length comparison.
- Surface already available but unused measures: paid-extra sales, sales per purchasing customer,
  new-versus-returning customers and previous-period fulfillment-time comparison.
- Clarify the order-outcome cohort and add a cohort-correct created-to-paid-to-completed funnel plus
  actionable active-order aging. Do not combine mismatched creation and payment cohorts or present
  recent orders that have not reached pickup as failed fulfillment.
- Rename payment-to-completion duration honestly unless authoritative preparation/ready timestamps
  are added. A customer's advance-order lead time is not an Admin preparation-speed measurement.
- Replace the misleading aggregate "Inventory coverage" label with honest current stock wording,
  then add upcoming pickup-date and fulfillment-mode-aware supply-versus-demand and shortage risk
  from authoritative data. Zero prepared stock must not label made-to-order availability out of stock.
- Improve chart scales, legends, category colors, empty states, visible data fallback and mobile
  presentation. Avoid repeated donut colors, oversized screen-reader chart labels, hover-only detail,
  squeezed long-range points and status arrows that visually imply a time trend where none exists.
- Reorganize the page around decisions: business performance, fulfillment exceptions, pickup/stock
  risk, and product/customer insight. Deep-link alerts to useful filtered Admin views; keep Catalog,
  Journal and generic quick links secondary instead of treating their counts as performance KPIs.
- Add dashboard-specific loading and failure handling, a visible Manila-time freshness indicator, and
  strict RPC response validation so a mismatched deployment cannot silently turn missing fields into
  credible-looking zeroes.
- Stop loading full Catalog, Pickup, Journal and up to 200 deeply nested order records merely to render
  small dashboard counts and five recent orders. Use bounded projections or one authorized dashboard
  response, then verify query plans and add only evidence-backed reporting indexes.
- Extend the dashboard RPC only for metrics that cannot be derived safely from its current output;
  cover comparison boundaries, empty/sample states, cohorts, inventory modes and every SQL addition
  with pgTAP. Add component tests for filtering, trend semantics, chart/table accessibility and mobile
  layouts before the final rebaseline.

## Phase 15C — Android APK (cancelled from current work)

Build a PWABuilder/Bubblewrap **Trusted Web Activity** around `https://www.tsokolitaw.com`, not
Capacitor, an embedded WebView, React Native or native commerce. The existing online website remains
the single application. No offline ordering or payment.

### Required v1 database freeze before the APK

Historical gate, to revisit only if APK work is explicitly resumed: complete Phase 15B, then
complete this gate before building and accepting the signed v1 APK. It is not an active build instruction.

Historical readiness review (October 2, 2026; not current migration state): read-only hosted checks confirmed that Dev
`mgkzphpznamjlgrpumjd` and Production `zkmlzktvjkjrbznvrsxb` each record only baseline
`20260911010000`; local code also has only that migration, including the dashboard RPC.
Dev linked schema lint passed. Both projects reported `ACTIVE_HEALTHY`. Remote `development` and
`main` both pointed to `e1e6b4ee65b6f5533d38300bc453210500400f07`; this does not independently
verify the running Vercel commit. Both hosted Home URLs returned HTTP 200. Five dashboard
date-range/chart tests passed. Production activation and font restoration are recorded in the
October 1 migration-runbook entry.

The freeze gate remains open for authenticated dashboard review at phone/tablet/desktop sizes,
deployed-commit confirmation, and current environment-specific Auth/payment/notification/Cron checks.
Dev Admin redirected to Login because the review browser had no authenticated session. Matching
migration markers do not prove full schema or configuration equivalence. Do not run clean-data tests
against populated hosted databases. This review changed no hosted application data, schema,
credentials or migration history; the CLI remains linked to Dev. No Android manifest, Digital Asset
Links, TWA wrapper or APK implementation exists yet.

- Finish database and Storage-backed feature work, then review every migration added after
  `20260911010000_pre_v1_baseline.sql`.
- Fold the reviewed final schema, Storage bucket metadata, grants, policies and functions into that
  single baseline; remove temporary post-baseline migration files only as part of this coordinated
  squash, never while hosted migration history still depends on them.
- Obtain exact-target approval before resetting Dev or Production. Confirm that no records, Auth
  identities, Storage files or provider-linked funds require retention before deleting anything.
- If further schema consolidation is needed, rebaseline both hosted projects to the same single migration marker, restore required public assets
  such as the versioned brand fonts, deploy matching application code, and recreate only the three
  approved Cron jobs with each environment's existing secrets.
- Re-run database, web, payment, notification and hosted smoke checks. Do not start the final APK
  build while either environment has unmatched migration history or missing required Storage assets.

- Add the production manifest, canonical start URL/scope, brand colors and Android-compatible icons.
- Choose the package name, build a versioned signed APK, and keep keystore/passwords outside Git
  with secure backups. Updates must reuse the same signing identity and increase the version.
- Serve matching Digital Asset Links at `/.well-known/assetlinks.json`; verify association on a
  physical device (failure can fall back to browser controls).
- Provide a separate centered Palitaw startup illustration on the branded background where the
  wrapper supports it; Android may first show its system-controlled launcher-icon splash. No fake
  progress or artificial startup delay. Launcher icon and startup artwork are different assets.
- Publish a versioned release asset and a clear website Download Android APK action with version
  and sideloading guidance. Android still requires user confirmation. No Google Play/AAB scope.
- Test install/upgrade, signing, splash, back/external links, offline errors, Google OAuth, sessions,
  cart, customer/Admin guards, and PayMongo redirect/return on physical Android hardware.
- Run web validation and inspect the release APK before publishing its link. No secrets in the package.

Ordinary website updates need no APK rebuild; wrapper/signing changes do. Do not introduce a
second authentication/payment stack inside Android.

## Phase 16 — optional basic Web Analytics (cancelled from current work; not implemented)

Begin only after the website and Phase 15C APK are stable.

- Use `@vercel/analytics` for default aggregate page views only.
- Strict `beforeSend` allowlist: `/`, `/our-creations`, `/journal`, `/terms`, `/privacy`.
  Reject Cart, Checkout, Auth/Login, Profile, Orders, Payment, Admin, API and all unknown routes
  before transmission. No personal/order IDs, form values or custom payloads.
- Update the Privacy notice before Production collection. Validate inclusion/exclusion in Dev
  browser network traffic, promote normally, then verify Production and installed TWA.
- No Speed Insights, Google Analytics, custom events, conversion funnels, session replay,
  advertising tracking, native analytics SDK or separate analytics database. TWA traffic can appear
  as Android browser traffic; distinguishing installed use is not required.

## Separate operational follow-ups

- Continue Search Console/indexing/crawl/HTTPS/security/Core Web Vitals monitoring as appropriate.
  Google Business Profile is optional and needs separate eligibility assessment.
- Resolve reported dependency advisories in a targeted, tested maintenance update; do not mix
  forced upgrades into this documentation/structure pass.
- The earlier service-role grant and dashboard migrations were folded into the pre-v1 baseline.
  Production's recorded October 1 activation uses that baseline; Dev additionally received the
  October 4 pickup-grace forward migration. Verify target compatibility before promotion; do not
  delete an applied migration or assume both environments still match. See the migration runbook. Each
  environment must have exactly three active application Cron jobs; verify them after every reset or
  relevant deployment using the database migration runbook.
