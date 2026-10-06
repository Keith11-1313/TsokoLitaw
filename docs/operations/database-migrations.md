# Database changes and promotion

## October 7 final website-v1 baseline — Production rebaseline activated

The owner explicitly approved resetting Production `zkmlzktvjkjrbznvrsxb` without a backup and
confirmed DB-first ordering before their matching-code merge/deployment. Fresh read-only inventory
found 10 Auth users/profiles, zero orders/payments/reviews, three Journal posts and 15 Storage
objects (three fonts plus 12 catalog/Journal files); there were no paid or pending provider obligations.
Exactly the 12 inventoried non-font objects were removed through the Storage API. A guarded SQL
transaction replaced public schema, deleted the 10 Auth users, installed the final baseline/seed,
and replaced migration history with `20260911010000`. No backup was retained; Git does not recover
the discarded accounts, posts or uploads. Dev was not reset or changed.

Local SQL lint and all 573 assertions in 19 files passed again before activation. Production then
had zero Auth/profile/order/payment/review/Journal records, one product, three variants, eight
coatings and the matching `2026-10-05-admin-customer` policy. Its public function definitions and
ACL fingerprint matches the locally validated final schema. Production SQL lint passed. All three
fonts, three Vault entries and exactly the three Cron jobs survived; Vault and Cron definition
fingerprints are unchanged. The CLI remains linked to Dev; Production commands used an explicit ref.
All three retained fonts returned HTTP 200. One authenticated smoke request per Production Cron
endpoint returned HTTP 200 with zero examined records and zero failures, without initiating payments.
Home, Our Creations, FAQ, Terms and Privacy returned HTTP 200 after activation; these status checks
do not establish authenticated acceptance or that the latest application commit is deployed.

Matching application deployment and authenticated acceptance are still required. The previous
`main` code sends the removed pickup-grace argument, so Admin pickup-rule saves can fail during
the owner-approved DB-first gap. Merge/deploy the matching candidate promptly, then verify its
commit, bootstrap approved Admin access after fresh sign-in, restore catalog media, publish pickup
availability and retest customer/Admin/payment operations. This reset alone is not v1 acceptance.

## October 6 final website-v1 consolidation — Dev rebaseline activated

The owner approved a Dev-only reset of `mgkzphpznamjlgrpumjd`, without a data backup,
after confirming disposable test records and no real-fund retention requirement. Production
`zkmlzktvjkjrbznvrsxb` was not contacted or changed. The two October 6 forward migrations
were folded into `20260911010000_pre_v1_baseline.sql`: five stock/payment function definitions
were replaced in place, and the two private Admin cancellation RPCs were included once.
The temporary forward files were removed only after hosted history returned to the single
`20260911010000` marker. Earlier activation sections below describe historical states.

The consolidated local baseline passed a clean reset, SQL lint, 573 assertions in 19 files,
252 application tests, application lint, typecheck and the production build. Generated types
are unchanged. All public function definitions and ACLs matched current Dev before replacement
and matched again afterward. The displayed/stored policy synchronization check passed.

The approved disposal removed 10 Auth users/profiles, 17 orders/payments (including five paid
test payments and one receipt under review), two reviews, three Journal posts, and 13 non-font
Storage files through the Storage API. No pending provider checkout was attached. No backup
was retained; Git does not recover discarded data. The public-schema replacement, Auth deletion,
seed and migration marker replacement committed atomically. The three licensed font objects,
six Vault entries and all three Cron IDs, schedules, active flags and command hashes survived.

Read-only verification found zero Auth/profile/order/payment/review/Journal records, one product,
three variants, eight coatings, the matching `2026-10-05-admin-customer` policy, and one migration.
Linked SQL lint and migration dry-run parity passed. All three retained fonts returned HTTP 200.
One authenticated request to each Dev Cron endpoint returned HTTP 200 with zero examined records
and zero failures. Fresh sign-in, approved Admin bootstrap, catalog-media restoration,
pickup publication and customer/Admin retesting remain necessary. This Dev operation does not
mark Production ready or authorize its reset; website-v1 acceptance still needs Production parity.

## Historical October 6 stock-release activation — superseded by consolidation

`20261006020000_stock_release_snapshots.sql` was applied additively to verified Dev
`mgkzphpznamjlgrpumjd`, with no hosted reset or seed. It replaces customer/direct/provider
release paths with placement-date and immutable-piece accounting, strict stock rollback, and payment
rechecks. PayMongo expiry/replacement/paid-event writers now lock order before payment, consistent
with cancellation and manual-payment writers. Existing signatures, private grants and provider
verification remain intact. The applied baseline and Admin-cancellation migration were not edited.

A verified-empty local Docker reset rehearsed all three migration files. Local SQL lint passed,
and the final full suite passed 573 assertions in 19 files (97 new assertions). Schema types were
regenerated without a semantic contract change. Linked Dev lint passed; before/after counts remained
3 orders, 3 payments and 3 active Cron jobs, with current policy `2026-10-05-admin-customer`.
Read-only function/grant checks confirmed placement-date/snapshot release, no browser EXECUTE grant,
and service-role EXECUTE. Final dry run has no pending migrations. No hosted order was cancelled,
no hosted regression fixtures were loaded, and Production was not modified.

At this additive activation, matching application deployment and authenticated acceptance were still
required. The forward migration was subsequently folded into the approved Dev rebaseline above;
its file and hosted marker no longer remain. Do not replay this historical activation.

## Historical October 6 Admin cancellation activation — superseded by consolidation

Additive migration `20261006010000_admin_order_cancellation.sql` was applied to confirmed Dev
`mgkzphpznamjlgrpumjd` only, without reset or seed. It adds two service-role-only RPCs for the
approved Admin unpaid-order cancellation action; existing customer writers and fulfillment transitions
are unchanged. Finalization atomically rechecks payment/status/provider expiry, releases prepared
pieces using immutable item snapshots and placement-date eligibility, restores any bound reward,
and audits the required reason. It reuses the existing cancellation notification event, not a new event.

Local SQL lint and all 476 assertions passed. Linked Dev lint, private RPC grants and final migration
dry-run parity passed. Before/after public counts remained 6 profiles, 2 orders, 2 payments, 1 review,
3 Journal posts and 30 audit entries. Post-activation checks also found 6 Auth users, 15 Storage objects
and exactly 3 active Cron jobs. No hosted order was cancelled during validation. Production was not
contacted or changed. Matching application code still requires the owner's development push/deployment
and authenticated desktop/mobile acceptance. Browser-control verification was unavailable locally.

This migration was retained until the separately approved Dev consolidation above, then folded into
the baseline and removed with its hosted marker. Ordinary applied history remains immutable;
this completed disposal does not authorize another reset or a Production activation.

## October 5 Admin/customer separation — Dev rebaseline activated

The consolidated `20260911010000_pre_v1_baseline.sql` enforces customer-role checkout, payment,
cancellation and review writers, customer-only profile/deletion cancellation, loyalty ownership,
and customer-directory/dashboard counts. Matching application guards hide customer actions from
Admins and redirect customer routes to `/admin`. Admin business operations remain unchanged.
It archives policy version `2026-10-05-admin-customer`; displayed policy dates remain October 1.
Shared policy checks target this baseline snapshot and the seed. The owner explicitly confirmed
Dev-only disposal of accounts, commerce, reviews, Journal and uploaded media, including disposable
paid test orders. The Pickup-grace, review-privacy and role-separation forward changes were folded
into one locally rehearsed baseline; the temporary migration files were removed as part of this
coordinated replacement. Production was not contacted or changed and still requires separate approval.
Local validation passed: 218 application tests, 443 database assertions, SQL lint, generated types,
typecheck, application lint, formatting checks and the production build. Authenticated browser
acceptance remains pending. Read-only Dev inventory found 5 Auth users (4 Admins, 1 customer),
18 Admin-owned orders, 18 payments, 2 reviews, 3 Journal posts, 47 Storage objects and 3 active Cron
jobs. There were 11 paid test orders, 3 pending orders, no provider-bound pending checkout and no
Manual GCash review queue. The approved reset deleted all 5 Auth users, 18 orders/payments,
2 reviews, 3 Journal posts and 44 non-font Storage objects without retaining a data backup.
The three licensed fonts were retained and verified by HTTP 200. Vault's six entries and exactly
the three existing Cron jobs survived the transactional public-schema replacement.
Final Dev state has zero Auth/profile/order/payment/review/Journal records, the controlled seed
(one product, three variants, eight coatings), the current matching policy hash, no pickup grace,
and only migration marker `20260911010000`. Linked lint and migration dry-run parity passed.
An initial account-deletion smoke request returned HTTP 500 immediately after the schema switch;
its underlying due-profile query passed on recheck. Repeated smoke checks returned HTTP 200
from all three endpoints with zero examined records and zero failures.
Matching application deployment, fresh approved Admin sign-in/bootstrap, catalog media upload,
pickup publication and authenticated customer/Admin acceptance are still required.

## October 5 review privacy and policy synchronization — Dev activated

`20261005010000_review_privacy_and_policy.sql` removes public raw-review reads while retaining
active-owner/Admin access and the existing masked public projection. It inserts policy version
`2026-10-05`, containing the exact displayed Terms and Privacy, without modifying older versions
or order acceptance snapshots. The display date remains October 1 at the owner's request.
Deploy the migration and matching checkout guard together: mismatched version/content blocks
new checkout rather than recording acceptance against unrelated text.
Run `node scripts/check-policy-sync.mjs` to verify shared content against migration/seed;
production prebuild also runs it. Future content changes require a new reviewed version and migration,
not edits to an applied snapshot. On October 5, the owner approved Dev activation after Docker
became available. A verified-empty local reset, schema lint, all 425 database assertions, generated
type parity, and typecheck passed. The inactive-owner test fixture was corrected to include its
required deactivation timestamp before the successful full rerun.
Only this pending migration was applied to confirmed Dev `mgkzphpznamjlgrpumjd`; no hosted reset
or seed ran. Before/after counts remained 5 Auth users, 18 orders, 2 reviews and 47 Storage objects.
The old policy content hash is unchanged, version `2026-10-05` is current with the matching displayed
text hash, anonymous raw-name grants are removed, owner/Admin-only RLS is active, and all three
expected Cron jobs remain active. Linked schema lint passed, migration history matches local files,
and the final dry-run reports no pending migrations. Matching application deployment and authenticated checkout/review
smoke checks remain required. Production was not contacted or changed.

## October 4 Pickup grace cleanup — Dev database activated

`20261004010000_remove_pickup_grace.sql` removes the unused setting and replaces its reader/writer
contracts without resetting records. The applied baseline is unchanged. The new writer takes five
arguments, so coordinate matching Dev application deployment and migration activation; the old
deployed Admin form cannot save against the replacement signature. Local lint and all 417 database
assertions passed. At the owner's explicit request, migration `20261004010000` was applied to Dev
`mgkzphpznamjlgrpumjd` before matching application deployment. Linked schema lint passed, migration
history matches, and the subsequent dry-run has no pending migrations. Matching Dev code deployment
and Admin save/checkout smoke checks remain required. Production `zkmlzktvjkjrbznvrsxb` was not
changed. No hosted reset or seed was run.

## Pre-v1 rebaseline history and current activation state

The owner approved discarding pre-release Dev records, Auth users and Storage files.
On September 11, 2026, hosted Dev `mgkzphpznamjlgrpumjd` was rebuilt from
`supabase/migrations/20260911010000_pre_v1_baseline.sql` and the controlled `supabase/seed.sql`.

Verified afterward: zero Auth users, profiles, orders and Storage objects; one migration version
`20260911010000`; no old checkout function, phone columns or refund tables. Linked schema lint passed.
The reset deleted 7 Auth users, 29 orders and 9 catalog files plus associated test records.
No backup was retained for this owner-approved disposal. Old SQL remains in Git; that does not recover data.

Later on September 11, the owner approved reapplying the same baseline after its final naming cleanup.
That reset removed 2 new test Auth users and 2 test orders; Storage was already empty. Verification again
found zero Auth users, profiles, orders and Storage objects, the single matching migration marker, the
simplified schema fields, required service-role profile read access, and no linked schema lint errors.

On September 13, the owner approved another hosted Dev rebaseline for the PayMongo checkout replacement
and Admin customer pagination contracts. It removed 3 test Auth users, 4 test orders, 1 manual receipt
submission and its orphaned Storage object. The single baseline marker, empty Auth/order/receipt state,
linked schema lint, all 327 linked PostgreSQL assertions, and all three Cron endpoint HTTP 200 responses
were verified afterward. The three named Cron jobs were recreated with their existing Vault configuration.

On September 17, 2026, the owner separately approved the coordinated reset of Production
`zkmlzktvjkjrbznvrsxb` after confirming its records involved no real funds and required no retention.
The reset discarded its pre-release database records, Auth users, Storage objects and old migration
history, then installed the same baseline and controlled seed. Verification found the single matching
migration marker, empty customer/order/receipt state, no retired refund or phone fields, and the seeded
default catalog data. Matching application code was deployed before the three authenticated Cron
endpoints returned HTTP 200 and exactly the three expected jobs were activated.

On September 21, 2026, the owner approved a new Dev-only pre-v1 rebaseline after the Admin
decision dashboard and dated order-number work. The four temporary post-baseline migrations were
folded into `20260911010000_pre_v1_baseline.sql`, and hosted Dev `mgkzphpznamjlgrpumjd` was reset
to that single migration marker. The reset deleted 3 test Auth users, 3 profiles, 3 orders,
3 payments, 1 pickup date and the 3 hosted font objects; there were no pending provider checkout
sessions, receipt submissions, reviews or Journal posts. The controlled seed and all three versioned
Pally/Neco font objects were restored. Linked schema lint and all 361 linked PostgreSQL assertions
passed, and the three existing app Cron jobs remained active. Production was not changed and still
requires separate exact-target approval and validation before receiving this revised baseline.

On September 22, 2026, the owner approved another Dev-only reset to activate the expanded moderated
review contract and private `review-media` bucket already folded into the single baseline. The target
was confirmed as `mgkzphpznamjlgrpumjd`; the discarded state contained 3 test Auth users, 2 test
orders and 2 paid PayMongo **test-mode** payment records, with no pending provider checkout, manual
receipt or live-fund obligation. The reset restored the controlled seed and all three versioned brand
font objects. The single migration marker, linked schema lint and all 364 linked PostgreSQL assertions
passed. Because the reset removed `pg_cron`, the three approved jobs were recreated from the surviving
Dev Vault entries; their schedules were verified and one authorized smoke request per endpoint returned
HTTP 200 with zero work and zero failures. Production was not changed.

Later on September 22, the owner approved a further Dev-only pre-v1 rebaseline to activate the safe
anonymous featured-review projection used by Journal. The confirmed target was again
`mgkzphpznamjlgrpumjd`; the discarded state contained 2 test Auth users, 1 test order and 1 paid
PayMongo **test-mode** payment, with no provider-bound pending checkout or manual receipt submission.
The controlled catalog seed and all three versioned Pally/Neco font objects were restored. Anonymous
Journal access, zero customer/order/review state, the three active app Cron jobs, the single
`20260911010000` migration marker, linked schema lint and all 368 linked PostgreSQL assertions were
verified afterward. Temporary activation and verification markers were removed. Production was not
changed.

On September 24, 2026, the owner approved the Dev-only coordinated reset for the final Phase 15A
commerce/payment contract. The linked target was confirmed as `mgkzphpznamjlgrpumjd`; Production
`zkmlzktvjkjrbznvrsxb` remained unlinked and unchanged. The reset discarded the approved disposable
Dev database, Auth and Storage state without a backup, reapplied the baseline plus the service-role
grant migration, and loaded the controlled seed containing Chocolate Sprinkles and the current
₱40/₱55/₱75 box prices. The three licensed Pally/Neco font objects were restored and returned HTTP
200 from the Dev `brand-fonts/v1/` paths. Linked schema lint and all 385 PostgreSQL assertions passed,
including the new pay-at-counter authorization and paid-before-completion contract. Because the reset
removed `pg_cron`, exactly the three approved jobs were recreated from surviving Vault values; their
names, schedules and endpoint paths passed seven direct SQL assertions, and one authorized request to
each endpoint returned HTTP 200. The temporary Cron activation migration/history marker and verification
files were removed, leaving the two intended application migration markers. The owner subsequently
accepted the matching Dev application work and marked Phase 15A complete; that acceptance does not
authorize or imply the still-separate Production reset.

## Hosted activation and ongoing checks

Phase 15B originally used temporary migration `20260924020000_phase_15b_dashboard.sql` to replace the
service-role Admin dashboard projection and add targeted partial reporting indexes. On September 24, 2026, the owner
approved a Dev-only coordinated reset and the migration was activated on confirmed project
`mgkzphpznamjlgrpumjd`; Production was not changed. The discarded disposable Dev state contained
1 Auth user, 3 orders, 1 review, 2 paid Manual GCash records and 1 paid counter record, with no
provider-bound pending checkout or receipt under review. No backup was retained.

The reset reapplied the baseline, service-role grant migration, Phase 15B migration and controlled
seed. All three licensed font objects were restored and returned HTTP 200. Linked schema lint and all
393 application PostgreSQL assertions passed; seven additional assertions verified exactly the three
approved Cron definitions, schedules and paths. The jobs were recreated from the surviving Dev Vault
values, and one authorized request to each documented Dev endpoint returned HTTP 200 with zero work and
zero failures. Responsive browser acceptance remains part of the matching Dev application deployment.
The application deployment and this migration must move together because the strict response parser
rejects the older dashboard contract rather than showing false zeroes.

On September 28, 2026, the owner approved the final Dev-only pre-v1 rebase after confirming that
all 413 existing orders, Auth users, reviews, receipt/review/catalog files and Journal records were
disposable and required no backup. The confirmed target was `mgkzphpznamjlgrpumjd`; Production was
not contacted. The service-role grant correction and Phase 15B dashboard migration were folded into
`20260911010000_pre_v1_baseline.sql`, and their two forward migration files were removed. The corrective
reset then applied only that single baseline and controlled seed. The optional dashboard fixture was
not loaded. Final Dev state contains one approved Admin, zero orders, zero reviews, zero Journal posts,
zero Journal media objects and the three licensed font objects.

This reset cleared Dev Vault as well as `pg_cron`, so both Cron Vault values were explicitly restored
before recreating exactly the three approved jobs. The payment-expiration and notification jobs run
every five minutes; account deletion runs at `0 19 * * *` UTC. All use `net.http_get`, matching the
GET-only application routes. The final verification found one Auth user, zero simulated commerce or
Journal records, three Cron routes, two Vault values and three restored font objects. One authorized request to every Cron
endpoint returned HTTP 200 with zero work and zero failures. Temporary activation functions, files
and migration-history markers were removed; linked migration history and dry-run push matched only
the single rebased migration.

Later on September 28, 2026, the owner approved another Dev-only coordinated reset to activate the
persisted Journal cover-format contract. The confirmed target was `mgkzphpznamjlgrpumjd`; Production
was not contacted. The discarded state contained one Auth/Admin identity, one Journal post, zero
orders, zero payments and no provider-fund obligation. The reset applied the single baseline and
controlled seed; the optional dashboard simulation fixture was not loaded. Final verification found
zero Auth users, orders and Journal posts, one `journal_posts.cover_format` column, the single matching
migration marker, two restored Vault values, exactly three active app Cron jobs, and the three restored
brand-font objects. Linked lint and migration dry-run parity passed. One authenticated request to each
Cron endpoint returned HTTP 200 with zero work and zero failures. The owner must sign in again before
the approved email can be promoted back to Admin.

On September 30, 2026, the owner approved a Dev-only coordinated reset to activate audited Journal
draft deletion already folded into the clean pre-v1 baseline. The confirmed target was
`mgkzphpznamjlgrpumjd`; Production was not contacted. The discarded state contained 4 Auth users and
profiles, 3 orders and payments, 2 reviews, 4 Journal posts, and 21 non-font Storage objects. There
were no pending orders, pending PayMongo payments, or Manual GCash receipts under review. The reset
reapplied the single baseline and controlled seed, restored the three licensed brand-font objects,
and recreated exactly the three documented Cron jobs from two restored Vault values using the Dev
site `https://tsokolitaw.vercel.app`. The temporary service-role restoration and verification helpers
were removed from the schema and migration history. Final verification found zero Auth/application
records, only the three intended font objects, the deployed `delete_journal_draft` contract, one
matching migration marker, no linked schema lint errors, all 414 linked PostgreSQL assertions passing,
and HTTP 200 from each authenticated Dev Cron endpoint.

On October 1, 2026, the owner approved a coordinated Production rebaseline for
`zkmlzktvjkjrbznvrsxb` after confirming that no records or provider funds required retention and
declining a backup. The pre-reset inventory contained 7 Auth users, 2 cancelled/expired orders,
2 failed payments, no review or Journal records, no Storage objects, 3 Vault entries, and the 3
documented active Cron jobs. The clean public schema and Auth users were replaced with the single
`20260911010000` baseline and controlled seed; Vault and Cron were retained. Production then had
zero Auth users, orders, payments, reviews, and Journal posts, the seeded catalog, five intended
Storage buckets, one matching migration marker, no pending migrations, and no linked schema-lint
errors. The three licensed font objects were restored to `brand-fonts/v1/` and returned HTTP 200.
The merged `main` deployment completed after the database change, and the new public builder and
FAQ loaded. The two five-minute Cron jobs subsequently reported success, with contemporaneous HTTP 200
responses; two HTTP 500 responses occurred during the schema switch. Confirm approved Admin access and
publish intended pickup availability before accepting orders; verify Production payment mode and
provider configuration independently.

During post-reset review-image testing on September 22, 2026, the application-equivalent
`service_role` request exposed incomplete table ACLs inherited from the dumped baseline: the
private review-image route could not read `public.reviews` and converted that authorization error
to its generic unavailable-image response. Temporary forward migration
`20260922050000_restore_service_role_table_grants.sql` restores server-only CRUD privileges on
current public tables and usage on public sequences without expanding `anon` or `authenticated`
access. This correction and the Phase 15B dashboard migration were folded into the single baseline on
September 28, 2026; neither forward migration file remains.

Hosted Dev has exactly these three app Cron job definitions as of September 30, 2026:
`tsokolitaw-payment-expirations`, `tsokolitaw-notification-retries`, and
`tsokolitaw-account-deletions`. A linked reset removes the `pg_cron` extension and jobs and may also
clear Vault. The extension, required Vault values and exactly these three jobs must be recreated afterward.
Their routes, schedules, Vault-backed bearer authorization, and one HTTP 200 response per endpoint
were verified. A future linked reset will remove the jobs again, so inspect and recreate them before
calling that environment ready.

Later on September 13, the stale `pg_cron` launcher left every newly recreated job without run
history. Hosted Dev was restarted and a temporary harmless Cron health check then completed
successfully. On September 14, the corrected Resend sender and credentials were deployed, five
previously failed messages were retried successfully, and all seven current delivery records reached
`DELIVERED`. The notification retry job is active again on its five minute schedule.

1. Verify the exact Vercel and Supabase target before changing either hosted environment.
2. Verify environment-specific Supabase keys, payment mode, provider webhooks, Resend credentials and
   Manual GCash QR payload where applicable.
3. After a separately approved reset, deploy matching application code, recreate only approved Admins,
   restore intended catalog/pickup data, and repeat the relevant smoke tests.
4. Confirm only these three named Cron jobs remain active after any future database reset.
   Do not leave review/payment work unmonitored while jobs are absent or paused.

Neither hosted site is operationally ready merely because its database reset passed.

The baseline includes the narrowly scoped `profiles` `SELECT` privilege required by the server-only
OAuth callback.

The September 28, 2026 pre-v1 reconstruction regenerated the public schema from its validated final
state, removed duplicate post-dump definitions, and emitted the final grants once. Browser-facing
roles have no administrative table or sequence privileges; Auth-trigger and Storage-bucket setup are
kept as the only cross-schema bootstrap. The rebuilt schema was proven equivalent to the prior
effective public schema after normalizing harmless grant-order differences, then passed a clean local
reset, schema lint, and all 404 database assertions. Dev `mgkzphpznamjlgrpumjd` was reset to the single
`20260911010000` marker with zero Auth users, profiles, orders, and non-font Storage objects. The three
licensed font objects survived and were verified. Two Vault values and exactly the three documented
Cron jobs were restored through a temporary service-role-only helper; the helper and its two temporary
history markers were removed afterward. All three authenticated Cron endpoints returned HTTP 200 with
zero work and zero failures. Production was not contacted.

## Database changes before v1.0

On October 6 the owner adopted website-only v1.0 acceptance; an APK is not required.
The existing pre-v1 consolidation policy remains: the accepted release state must return to one clean baseline
migration. Temporary forward migrations may be used during active development so a bounded change can
be tested safely in Dev without rewriting an already-applied file. Before final website release acceptance, review
and fold every such migration into the baseline. Dev completed the latest consolidation/reset on
October 6; Production received the separately approved matching baseline on October 7. Matching
application deployment and operational acceptance still require verification. Compare definitions
as well as the `20260911010000` marker; these completed approvals do not authorize another reset.
Do not delete a temporary migration while hosted history still records it, and do not accumulate
compatibility layers for disposable pre-release data. Preserve RLS/grants, exact payment matching,
and atomic inventory/reward transitions. Read the [function map](../architecture/database.md) and the
current website acceptance requirements in the [release sequence](deployment.md). Neither this policy nor a docs update
authorizes a hosted reset; exact-target approval is still required.

After v1.0, treat the accepted baseline as immutable and use reviewed forward migrations for every
schema change.

On disposable local Supabase:

```powershell
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run typecheck
npm test
npm run build
```

Local reset deletes local data. The clean-data suite must not run against populated hosted databases.
Generated types are produced by the generator, not edited by hand.

Optional files under `supabase/fixtures/` are not migrations and are not loaded by the controlled
`supabase/seed.sql`. The dashboard simulation fixture requires explicit scope, commit and payment-mode
settings in the same SQL session. Validate it first with commit set to `false`; its final exception is
the expected rollback signal. Running the fixture against disposable Dev is a deliberate data operation,
not migration promotion, and never authorizes a reset or any Production use. See the
[Admin guide](../features/admin.md#dashboard-simulation-fixture).

Before reconciling hosted Dev during the approved pre-v1 rebaseline:

```powershell
npx supabase link --project-ref mgkzphpznamjlgrpumjd
Get-Content supabase/.temp/project-ref
npx supabase migration list
npx supabase db push --dry-run
```

Inspect the exact target and migration history. A pre-v1 baseline reconciliation is a coordinated
reset/history operation, not an ordinary `db push`. After v1.0, only apply reviewed incremental files,
then check `npm run db:lint:linked` and the feature. A Git merge or Vercel deployment never runs SQL.

## Backups and destructive work

This one-time pre-v1 disposal is not ongoing permission to reset data. Future hosted resets require
explicit target and scope. Once v1.0 is accepted, retain operational records and use reviewed migrations.
A public data dump is not a complete backup of Auth, Storage files, Vault, Cron or provider obligations.
Never commit credentials, customer data or private receipts.
