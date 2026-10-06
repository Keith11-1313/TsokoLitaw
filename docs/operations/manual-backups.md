# Manual Production backups

This is a manual export procedure, not evidence that a backup already exists.
It reads Production and writes private local files; it does not reset, restore, seed or deploy anything.
The Dev reset remains a separate operation requiring its own confirmed disposal/backup decision.

## Before starting

- Open Docker Desktop and PowerShell in the TsokoLitaw repository.
- Authenticate the Supabase CLI with an account authorized to read Production.
- Verify Production in the Dashboard: project `zkmlzktvjkjrbznvrsxb`, site
  `https://www.tsokolitaw.com`. Do not confuse it with Dev `mgkzphpznamjlgrpumjd`.
- Arrange a quiet period without customer/Admin writes. Provider callbacks and Cron can still write:
  independent exports are not one synchronized database-and-files snapshot. Record the export window
  and reconcile any changes. Do not disable live callbacks/jobs casually.
- Use the existing Production database password when prompted. Do not reset it just to take a backup,
  paste credentials in chat, pass them literally on a command line, or use CLI debug output.
- The examples use the installed CLI's `--project-ref` flag, so the existing Dev link is unchanged.
  Check `npx supabase db dump --help` and `npx supabase storage cp --help` if the CLI changes.

## 1. Create a private folder outside Git

```powershell
$backupDir = "C:\Users\Jerald\Documents\TsokoLitaw-Backups\prod-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop
```

Use a new folder for each run. These files contain personal data, private receipts, Auth credentials
and possibly sensitive configuration. Restrict access to the owner and keep them outside the repository.

## 2. Export database roles, application schema and records

Run each command in the same PowerShell session. Stop on failure; do not treat a partial export as complete.

```powershell
npx supabase db dump --project-ref zkmlzktvjkjrbznvrsxb --role-only -f "$backupDir\roles.sql"
if ($LASTEXITCODE -ne 0) { throw "Roles export failed." }

npx supabase db dump --project-ref zkmlzktvjkjrbznvrsxb --schema public -f "$backupDir\schema.sql"
if ($LASTEXITCODE -ne 0) { throw "Application schema export failed." }

npx supabase db dump --project-ref zkmlzktvjkjrbznvrsxb --data-only --use-copy --schema public,auth,storage -f "$backupDir\data.sql"
if ($LASTEXITCODE -ne 0) { throw "Application/Auth/Storage metadata export failed." }

npx supabase db dump --project-ref zkmlzktvjkjrbznvrsxb --schema supabase_migrations -f "$backupDir\history-schema.sql"
if ($LASTEXITCODE -ne 0) { throw "Migration-history schema export failed." }

npx supabase db dump --project-ref zkmlzktvjkjrbznvrsxb --schema supabase_migrations --data-only --use-copy -f "$backupDir\history-data.sql"
if ($LASTEXITCODE -ne 0) { throw "Migration-history data export failed." }
```

Normal schema exports exclude managed schemas. Explicitly include Auth and Storage for data export;
check that the resulting file contains the required account/identity and bucket/object records.
These commands do not include Storage file bytes, Vault recovery keys, Cron configuration, or
dashboard/provider settings. Restricted managed tables or newer Storage features may require a
reviewed export adjustment; never exclude required account data merely to make a command pass.

Preserve custom Auth triggers and Storage RLS policies separately. Keep the exact migration/configuration
files corresponding to the deployed Production schema, not an assumed copy of the newer Dev baseline.
An explicit `--schema auth,storage` schema dump can be retained as a private reference, but includes
managed platform objects: do not blindly restore it over Supabase's existing managed schemas.

## 3. Download all required Storage files

```powershell
foreach ($bucket in @("catalog-media", "journal-media", "payment-receipts", "review-media", "brand-fonts")) {
    npx supabase storage cp --project-ref zkmlzktvjkjrbznvrsxb -r "ss:///$bucket/" "$backupDir\$bucket"
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $bucket" }
}
```

Preserve bucket names and relative paths. Check the current Dashboard for additional buckets.
Confirm empty buckets are truly empty; do not mistake a permission/download failure for an empty bucket.
Database exports save object metadata, not the uploaded photos, receipts or font binaries.

## 4. Record configuration securely

Maintain a private recovery inventory alongside the exports:

- Production project ID, backup start/end time, CLI and PostgreSQL versions, deployed app commit,
  applied migration versions and extension versions.
- Bucket visibility, upload limits, custom Auth triggers, Storage policies and application grants.
- The three intended Cron jobs: names, schedules, endpoint URLs and command definitions.
- Vault secret names and a secure way to recreate their values. Cron commands may reference Vault.
  Never paste decrypted secrets into Git, screenshots, chat or command output.
- Google/Supabase Auth provider configuration, allowed redirect URLs and recovery credentials.
- Production Vercel variable names and their environment scopes; keep actual values in a password manager.
- PayMongo/Resend callback subscriptions and secure credential references.

Vault/column encryption recovery is a separate requirement. A public dump does not preserve the
encryption root key; encrypted records may be unusable after moving to another project without the
documented key-recovery process. Follow Supabase's current encrypted backup/restore procedure and
verify it separately. Do not label this export set a complete project backup until that is covered.

## 5. Verify and generate file hashes

```powershell
Get-ChildItem -LiteralPath $backupDir -Recurse -File |
    Get-FileHash -Algorithm SHA256 |
    Export-Csv -LiteralPath "$backupDir\checksums.csv" -NoTypeInformation
```

Record and compare:

- Source/export row counts for application tables, Auth users/identities and Storage metadata.
- Source/download object counts and sizes per bucket, including nested paths.
- Expected SQL files, nonzero export sizes, successful exit codes and matching project identity.
- Backup window changes, so late orders/uploads are not silently omitted.

A file hash proves integrity against later changes, not successful restorability.

## 6. Rehearse restoration in isolation

Do not restore into Production to test a backup. Use a disposable, explicitly identified local
Supabase instance with compatible PostgreSQL/platform versions.

Before importing, isolate it from Production services: no live provider keys, outbound email,
enabled Cron processors or callback destinations. A Production snapshot can contain queued
notifications and operational commands; restoring it must not dispatch them.

Review the restore order and managed-schema differences, restore the necessary schema/data/history
and files, then verify row counts, relationships, snapshots, RLS/grants, custom triggers and file access.
Preserve restrictive default privileges; a restore must not accidentally grant anonymous/customer
access to private tables or receipts. Test with isolated identities/configuration, not a Production session.
Handle Vault keys and custom-role passwords separately. Do not run the clean-data application SQL
suite against the populated restored snapshot.

Record the restore result and any gaps. Until this rehearsal passes, the exports are an
**unverified backup**, not a proven recovery point.

## 7. Keep two encrypted copies

Encrypt the verified backup and keep one local copy plus a second copy in separate private storage.
Store the encryption password/recovery key separately and verify both copies against the checksums.
Do not put customer records, Auth data, private media or credentials in Git.
Define a retention schedule and repeat backups after meaningful changes.

Restoring the database cannot undo GCash/PayMongo transactions or retract sent emails.
Provider funds and subsequent operations must be reconciled separately before resuming service.
A Vercel rollback restores code, not these records or uploaded files.

## References

- [Supabase CLI database dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase manual backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase database backups and Storage limitations](https://supabase.com/docs/guides/platform/backups)
- [Environment isolation](../getting-started/environments.md)
- [Database migration safety](database-migrations.md)
