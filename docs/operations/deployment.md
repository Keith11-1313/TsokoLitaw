# Deploying a reviewed change

Routine work stays on `development`; risky/large work may use a feature branch that returns to
`development`. The user stages, commits, pushes, and opens one reviewed `development` → `main` PR.
Agents do not perform those Git operations. Both branches are connected to **separate** Vercel projects.

## Release sequence

Website-only v1.0 replaces the earlier APK requirement as of October 6, 2026. Do not mark v1.0
accepted until the release checks below pass. This includes
the existing pre-v1 schema-consolidation policy, security fixes, matching Production contracts,
and authenticated desktop/mobile acceptance. Release naming does not authorize a hosted reset,
provider charge, Git merge/tag, or deployment.

The latest Dev-only consolidation/reset completed on October 6. Its baseline includes Admin
unpaid cancellation, snapshot-based stock release and consistent payment lock ordering; no forward
files remain. Production received the matching baseline through the separately approved October 7
no-backup reset, with owner-confirmed DB-first ordering. Matching application deployment still needs
the owner's merge and Vercel verification; the older app's pickup-settings writer is incompatible.
A dry run showing no pending files or matching markers alone does not prove schema parity. Future
rebaselines require their own coordinated approval, never an ordinary push of an edited applied file.

1. Review the diff and run [validation](../maintenance/testing.md). Keep formatting, behavior,
   dependency upgrades, and database changes separately reviewable where practical.
2. If SQL changed, test locally and apply reviewed migrations to hosted **Dev** first using the
   [migration runbook](database-migrations.md). Deploying code does not run migrations.
3. Push the candidate to Dev; verify Vercel build/commit, environment variables, and Dev URLs.
   Exercise the changed feature and relevant protected/payment paths with Dev/test resources.
4. For a database-dependent release, apply the same reviewed migrations to Production before
   dependent code **only when the old production app is compatible**. Otherwise stop and plan a
   coordinated release; do not introduce a window where either app/schema combination is broken.
5. Review/merge the PR to `main`; check the Production Vercel deployment is Ready at the expected commit.
6. Smoke-test the canonical site: public pages (including FAQ, Terms, and Privacy), Google sign-in/logout, correct catalog/pickup,
   own order history, and Admin guard. Test changed operations deliberately; a real QR Ph charge
   or live-key change requires separate explicit approval.
   Confirm `/robots.txt` permits intended public pages and excludes private routes, and that
   `/sitemap.xml` lists only canonical public URLs. Do not give every page a fabricated modification date.
7. Inspect route/provider/Cron results, not just successful build output. Relink the CLI to Dev
   after any approved Production database session.

No SQL changed? Skip migration commands entirely. Routine releases have no reset or reseed step.
The separately approved pre-v1 consolidation is an exceptional coordinated operation, not routine
deployment. After accepted v1, keep the baseline immutable and use reviewed forward migrations.

## Recovery

A Vercel rollback changes code, not database state, credentials, provider events, or customer records.
Confirm the previous build works with the current schema before reverting a deployment. Correct
database defects with reviewed forward migrations; never delete migration history to imitate rollback.
For destructive schema work, define and validate the backup/restoration procedure before applying it.
Use the [manual backup guide](manual-backups.md); an untested export is not a proven recovery point.

Keep secrets private; never copy Production variables to Dev/Preview. DNS, provider configuration,
and Google callback changes are separate external operations, not consequences of a Git merge.
See [environments](../getting-started/environments.md) and [webhooks](webhooks.md).
