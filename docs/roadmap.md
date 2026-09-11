# Current work and approved next phases

The owner defines v1.0 as the completed and accepted Phase 15 Android APK plus the working web app.
Until then the whole application is pre-release, including the Vercel Production environment.
Disposable test data does not require backward-compatibility layers. Database cleanup/rebaselining
is approved in principle; each hosted reset still needs its exact project and scope confirmed.

The production/security baseline (Phase 13) is complete. Phase 14 UI Overhaul remains in progress.
Completion of an earlier smoke test does not establish that every future deployment is healthy.
Use the current [release checks](operations/deployment.md), not old checked-off implementation lists.

## Phase 14 — stabilize the existing UI

- Complete remaining customer/Admin responsive, accessibility and loading/empty/error-state review.
- Preserve server pricing, SQL inventory/reward concurrency, ownership, signed payment verification,
  notification idempotency, and current unpaid-only cancellation throughout UI work.
- Verify Dev behavior and promote reviewed fixes through the normal PR/migration workflow.
- Maintainer handover now uses task-oriented docs, generated schema types, shared form contracts,
  and discoverable feature paths; do not add abstract layers merely for junior onboarding.

## Phase 15 — required Android APK (not implemented)

Begin only when Phase 14 is stable. Use a PWABuilder/Bubblewrap **Trusted Web Activity** around
`https://www.tsokolitaw.com`, not Capacitor, an embedded WebView, React Native or native commerce.
The existing online website remains the single application. No offline ordering or payment.

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
- Hosted Dev refund retirement and migration consolidation are complete. Finish matching Dev
  code activation and resume its paused jobs using the database migration runbook.
  Production promotion is blocked until a separate coordinated database plan is approved.
