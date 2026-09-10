# Local setup

Run commands from the repository root in PowerShell. Install a Node.js version supported by
the locked Next.js package (see `node_modules/next/package.json` after installation), npm, and Git.
Docker is needed for local Supabase, not every UI edit against hosted Dev.

```powershell
git status --short
git branch --show-current
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

The copy guard preserves an existing `.env.local`; do not overwrite working credentials.
Obtain **Dev** credentials privately. Fill the variable names described in [environments](environments.md).
Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and `PAYMONGO_MODE=test` locally.

```powershell
npm run dev
```

Open `http://localhost:3000`. If the port is occupied, stop this project's earlier server in its
terminal rather than killing unrelated processes. Restart after changing environment variables.

## Choose a database deliberately

- Ordinary UI/integration work: use the isolated hosted Dev URL and matching keys. Actions persist
  to hosted Dev and can send test-environment emails; it is not a mock sandbox.
- SQL development: start Docker, run `npm run supabase:start`, and obtain local connection details
  from `npm run supabase:status`. Use matching **local** keys when testing the app against local SQL.
  Do not paste secret-bearing status output into public issues.
- Neither selecting a Git branch nor linking the CLI changes `.env.local`.

For a deliberately disposable local database only:

```powershell
npm run db:reset
npm run db:lint
npm run db:test
```

`db:reset` deletes and recreates local database contents. It is not required for ordinary onboarding,
and there is no hosted reset step. See [migration safety](../operations/database-migrations.md).

## Google sign-in and Admin access

Ask the owner to verify the Dev Supabase Auth redirect allowlist includes
`http://localhost:3000/auth/callback`. Google redirects to the Dev Supabase callback; Supabase then
redirects to the local application. Do not replace the hosted Dev Site URL with localhost merely to run locally.
Local Supabase OAuth needs its own deliberately configured provider callback if used.

For an explicitly approved Admin bootstrap only: the Google identity must sign in first, then
set `INITIAL_ADMIN_EMAIL` privately in `.env.local` and run `npm run admin:bootstrap` against the
verified intended database. This changes a role; it is not a routine onboarding command.
The database permits at most five equal-permission Admin profiles.

Before handoff follow [testing](../maintenance/testing.md). No keys belong in Git.
