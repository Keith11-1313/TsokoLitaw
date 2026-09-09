# Database changes and promotion

Applied migration files are immutable history. Add a new timestamped migration for schema, RPC,
RLS, trigger, grant, index, or controlled reference-data changes. Do not edit the initial schema
to update an already deployed database, use dashboard-only SQL, or blindly repair history.

## Local first

Inspect all definitions in timestamp order. The latest replacement wins:

```powershell
rg -n "create_pending_order" supabase/migrations
```

On deliberately disposable **local** Supabase (Docker): run `npm run db:reset`, `npm run db:lint`,
`npm run db:test`, `npm run db:types`, and application typecheck/tests/build. Reset removes local data;
it is appropriate for the clean-database suite, not a hosted deployment procedure.
Review constraints/grants/RLS and old/new application compatibility, not only column presence.

## Hosted Dev

```powershell
npx supabase link --project-ref mgkzphpznamjlgrpumjd
Get-Content supabase/.temp/project-ref
npx supabase migration list
npx supabase db push --dry-run
```

Inspect every proposed file. Only after verifying the intended Dev project and reviewed migrations:

```powershell
npx supabase db push
npx supabase migration list
npm run db:lint:linked
```

The linked lint script fails on schema errors. It may need the matching CLI database password via
`SUPABASE_DB_PASSWORD`; do not print it. Smoke-test Dev with the candidate app.
The full pgTAP suite assumes disposable data: **do not run `db:test:linked` on populated hosted projects**.

## Production is a separate deliberate operation

After Dev passes, establish a rollback/backup plan appropriate to the change. Verify the existing
Production app remains compatible before promoting SQL ahead of code. Then explicitly link
`zkmlzktvjkjrbznvrsxb`, inspect its migration list and dry run, and apply only the same reviewed files
with the user's approval. Recheck migration alignment, linked lint, and the feature.
Relink Dev afterward using the command above. A branch merge does not apply these migrations.

Never use `db reset --linked`, push development seed data, use `--include-all` without inspecting
the older files, or mark real migration versions reverted merely to hide a mismatch.

## Existing migration history

- `20260827000000_initial_schema.sql`: baseline schema.
- `20260827010000` and `20260827020000`: intentional no-op markers for pre-squash hosted history;
  keep them. They do not authorize replaying the bootstrap.
- `20260830000000_production_reference_data.sql`: conflict-safe launch reference data, not test orders.
- Later September migrations supersede cancellation, coating pricing, expiry synchronization,
  inventory compatibility, and the loyalty order writer. See [function map](../architecture/database.md).

Do not claim a hosted project is current from local files alone: use its migration list and relevant
read-only schema checks. Type generation is read-only and separate from applying migrations.

## Backups and retired reset instructions

The old hosted cleanup/reset runbook was withdrawn from current docs. No hosted reset is requested.
Historical refund retirement needs its own retention/dependency review and migration; do not delete it
as a side effect of UI cleanup. Old documentation remains recoverable in Git.

For an approved backup, `supabase db dump` uses `--linked` or an explicit connection, not `--project-ref`.
Choose a fresh private output filename and verify the linked target first. A `--data-only --schema public`
dump covers public rows only, not Auth, Storage files, Vault, Cron, or the complete schema. File existence
and size are not a tested restore. Establish adequate coverage and rehearse restoration in an isolated
environment before destructive changes; never commit dumps or customer data.
