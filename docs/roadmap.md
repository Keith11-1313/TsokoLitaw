# Current work and approved next phases

The owner defines v1.0 as the completed and accepted Phase 15 Android APK plus the working web app.
Until then the whole application is pre-release, including the Vercel Production environment.
Disposable test data does not require backward-compatibility layers. Database cleanup/rebaselining
is approved in principle; each hosted reset still needs its exact project and scope confirmed.

The production/security baseline (Phase 13) and UI stabilization (Phase 14) are complete. Phase 15
Android APK work is active.
Completion of an earlier smoke test does not establish that every future deployment is healthy.
Use the current [release checks](operations/deployment.md), not old checked-off implementation lists.

## Phase 14 — UI stabilization (complete)

- Customer and Admin responsive behavior, accessibility, and loading/empty/error states were reviewed
  and stabilized through the normal Dev and PR workflow.
- Server pricing, SQL inventory/reward concurrency, ownership, signed payment verification,
  notification idempotency, and unpaid-only cancellation remain protected boundaries.
- Maintainer handover uses task-oriented docs, generated schema types, shared form contracts, and
  discoverable feature paths; do not add abstract layers merely for junior onboarding.

## Phase 15 — required Android APK (active)

Build a PWABuilder/Bubblewrap **Trusted Web Activity** around `https://www.tsokolitaw.com`, not
Capacitor, an embedded WebView, React Native or native commerce. The existing online website remains
the single application. No offline ordering or payment.

### Required v1 database freeze before the APK

Complete this gate before building and accepting the signed v1 APK:

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

Begin only after the website and Phase 15 APK are stable.

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
  deployment are complete. Each environment has exactly three active application Cron jobs. Verify
  them again after any future reset or deployment using the database migration runbook.
