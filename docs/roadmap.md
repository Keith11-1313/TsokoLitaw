# Current work and approved next phases

The owner defines v1.0 as the completed and accepted Phase 15C Android APK plus the working web app.
Until then the whole application is pre-release, including the Vercel Production environment.
Disposable test data does not require backward-compatibility layers. Database cleanup/rebaselining
is approved in principle; each hosted reset still needs its exact project and scope confirmed.

The production/security baseline (Phase 13) and UI stabilization (Phase 14) are complete. Phase 15A
is the active final commerce/payment update. Phase 15B completes the required Admin Dashboard
decision-support improvements before Phase 15C builds and accepts the Android APK.
Completion of an earlier smoke test does not establish that every future deployment is healthy.
Use the current [release checks](operations/deployment.md), not old checked-off implementation lists.

## Phase 14 — UI stabilization (complete)

- Customer and Admin responsive behavior, accessibility, and loading/empty/error states were reviewed
  and stabilized through the normal Dev and PR workflow.
- Server pricing, SQL inventory/reward concurrency, ownership, signed payment verification,
  notification idempotency, and unpaid-only cancellation remain protected boundaries.
- Maintainer handover uses task-oriented docs, generated schema types, shared form contracts, and
  discoverable feature paths; do not add abstract layers merely for junior onboarding.

## Phase 15A — final commerce and payment update (active)

- Add Chocolate Sprinkles to the controlled coating seed with a stable identity, active catalog
  placement, provisional price and the shared placeholder until its square catalog image is uploaded.
- Replace deployment-level `PAYMENT_METHOD` selection with `PAYMENT_MODE=automatic|manual`.
  Automatic mode offers PayMongo only. Manual mode lets the customer choose Manual GCash or Pay at
  the Counter while still creating and pricing every order through authenticated website checkout.
- Pin the selected method per order. Preserve the existing Manual GCash proof/review workflow and
  zero-total loyalty settlement. Add an audited, active-Admin-only counter-payment confirmation.
- Define and test counter-order reservation, fulfillment, cancellation, no-show and completion rules.
  Counter orders may not be represented as paid before an Admin records received funds.
- Update the single pre-v1 baseline, generated types, environment guidance, payment/order/customer/Admin
  interfaces, notifications and dashboard provider labels. Validate locally before any hosted reset.
- Activate the completed contract in hosted Dev only after exact-target reset approval. Production
  remains a later, separately approved coordinated activation.

## Phase 15B — Admin Dashboard decision support (planned, required)

Begin after Phase 15A is implemented and verified in Dev. This phase is required before the APK
freeze because administrators need reliable business and operational reporting in the v1 web app.

- Replace the paid-sales columns with an accessible line/area trend that exposes both paid sales and
  paid-order volume, retains exact keyboard-accessible values and handles longer grouped ranges.
- Surface already available but unused measures: paid-extra sales, sales per purchasing customer,
  new-versus-returning customers and previous-period fulfillment-time comparison.
- Clarify the order-outcome cohort and add a cohort-correct created-to-paid-to-completed funnel plus
  actionable active-order aging. Do not combine mismatched creation and payment cohorts.
- Replace the misleading aggregate "Inventory coverage" label with honest current stock wording,
  then add upcoming pickup-date supply-versus-demand and shortage risk from authoritative data.
- Improve chart scales, legends, category colors, empty states, visible data fallback and mobile
  presentation without weakening the existing date range or previous-period rules.
- Extend the dashboard RPC only for metrics that cannot be derived safely from its current output;
  cover every SQL addition with pgTAP and application tests before the final rebaseline.

## Phase 15C — required Android APK (planned)

Build a PWABuilder/Bubblewrap **Trusted Web Activity** around `https://www.tsokolitaw.com`, not
Capacitor, an embedded WebView, React Native or native commerce. The existing online website remains
the single application. No offline ordering or payment.

### Required v1 database freeze before the APK

Complete Phases 15A and 15B, then complete this gate before building and accepting the signed v1 APK:

Current status (September 22, 2026): the expanded review contract and private `review-media`
bucket are folded into the single baseline and activated in hosted Dev. Dev was reset, its licensed
brand fonts restored, all 364 linked database assertions passed, and exactly three Cron jobs were
recreated and smoke-tested. Production was not changed by that reset. The final coordinated
Production activation and cross-environment verification below therefore remain open.

- Finish database and Storage-backed feature work, then review every migration added after
  `20260911010000_pre_v1_baseline.sql`.
- Fold the reviewed final schema, Storage bucket metadata, grants, policies and functions into that
  single baseline; remove temporary post-baseline migration files only as part of this coordinated
  squash, never while hosted migration history still depends on them.
- Obtain exact-target approval before resetting Dev or Production. Confirm that no records, Auth
  identities, Storage files or provider-linked funds require retention before deleting anything.
- Rebaseline both hosted projects to the same single migration marker, restore required public assets
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

## Phase 16 — optional basic Web Analytics (not implemented)

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
- Hosted Dev and Production refund retirement, migration consolidation, and matching application
  deployment were completed for the earlier shared baseline. Hosted Dev now has the later review
  baseline; Production still requires its own exact-target approval and coordinated activation before
  the APK freeze can close. Each environment must have exactly three active application Cron jobs;
  verify them after every reset or relevant deployment using the database migration runbook.
