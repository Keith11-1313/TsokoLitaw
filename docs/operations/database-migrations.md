# Database changes and promotion

## Pre-v1 rebaseline — completed on hosted Dev and Production

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

## Hosted activation and ongoing checks

Hosted Dev has exactly these three app Cron job definitions as of September 13, 2026:
`tsokolitaw-payment-expirations`, `tsokolitaw-notification-retries`, and
`tsokolitaw-account-deletions`. The second pre-v1 linked reset removed the `pg_cron` extension and
jobs while retaining Vault. The extension and exactly these three jobs were recreated afterward.
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

## Database changes before v1.0

Until the Android APK is accepted as v1.0, the accepted release state must return to one clean baseline
migration. Temporary forward migrations may be used during active development so a bounded change can
be tested safely in Dev without rewriting an already-applied file. Before the final APK build, review
and fold every such migration into the baseline, then perform one coordinated Dev and Production
rebaseline with exact-target approval so both hosted migration markers return to `20260911010000`.
Do not delete a temporary migration while hosted history still records it, and do not accumulate
compatibility layers for disposable pre-release data. Preserve RLS/grants, exact payment matching,
and atomic inventory/reward transitions. Read the [function map](../architecture/database.md) and the
required pre-APK freeze gate in the [roadmap](../roadmap.md).

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
