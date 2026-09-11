# Database changes and promotion

## Pre-v1 rebaseline — completed on hosted Dev

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

**Production `zkmlzktvjkjrbznvrsxb` was not reset or changed. Do not push this baseline there.**
The baseline is for an empty database, not an incremental upgrade over Production's old schema.
Do not merge this cleanup into `main` until a separately approved coordinated Production plan exists.

## Finish Dev activation

The three existing Dev app Cron jobs are intentionally paused:
`tsokolitaw-payment-expirations`, `tsokolitaw-notification-retries`, `tsokolitaw-account-deletions`.
Their schedules and Vault configuration remain; credentials were not copied or changed.

1. The user deploys the matching cleanup code to the Dev Vercel project.
2. Verify Dev Supabase URL/keys and payment mode. Manual GCash needs the actual server-only QR payload.
3. Sign in with Google again. Recreate the approved Admin through `npm run admin:bootstrap`
   using the documented Dev environment and intended identity; never promote an arbitrary first user.
4. Re-upload catalog images and publish real available pickup dates/windows/locations in Admin.
5. Smoke-test email-only Profile/Checkout, PayMongo test or Manual GCash, receipt access/review,
   unpaid cancellation and inventory/reward behavior. Sending actual email requires approved recipients.
6. Resume only these three named Cron jobs after the matching endpoints and secrets are verified.
   Do not leave review/payment work unmonitored while jobs are paused.

The hosted Dev site is not considered operationally ready merely because the database reset passed.

The baseline includes the narrowly scoped `profiles` `SELECT` privilege required by the server-only
OAuth callback.

## Database changes before v1.0

Until the Android APK is accepted as v1.0, keep one clean baseline migration. Fold reviewed schema
fixes into that baseline, reset disposable local/hosted Dev data only with explicit approval, and keep
hosted Dev's migration marker aligned to `20260911010000`. Do not accumulate compatibility or patch
migrations for disposable pre-release data. Preserve RLS/grants, exact payment matching, and atomic
inventory/reward transitions. Read the [function map](../architecture/database.md).

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
