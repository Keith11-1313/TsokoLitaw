# TsokoLitaw

Mobile-first storefront and Admin interface for a student-operated chocolate-filled Litaw business.
Customers configure 4-, 6-, or 8-piece boxes, pay online with QR Ph, and collect at published campus pickups.

**New maintainer:** start with [onboarding](docs/getting-started/onboarding.md).
The [documentation index](docs/index.md) points to feature paths, SQL rules, testing and deployment.

## Stack and status

Next.js App Router, React, strict TypeScript, Tailwind, Supabase PostgreSQL/Auth/Storage,
PayMongo Hosted Checkout, Resend and Vercel. One application; no separate native commerce backend.

Production/security is implemented. Phase 14 UI stabilization is in progress.
The thin Android TWA APK (Phase 15) and optional public-page analytics (Phase 16) are planned,
not installed features. See the [roadmap](docs/roadmap.md).

## Quick start

Use the `development` branch and obtain **Dev** configuration privately.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Fill Dev values privately, then:
npm run dev
```

Open `http://localhost:3000`. Docker is needed for local database work, not every UI change.
Follow [local setup](docs/getting-started/local-setup.md) for credentials, OAuth and disposable SQL testing.
Do not reset a hosted database for onboarding.

## Common commands

| Command                           | Purpose                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                     | Local app                                                  |
| `npm run typecheck`               | TypeScript checks                                          |
| `npm run lint`                    | ESLint                                                     |
| `npm test`                        | Application tests                                          |
| `npm run build`                   | Production build                                           |
| `npm run format -- <paths>`       | Format edited files                                        |
| `npm run format:check -- <paths>` | Check formatting of edited files                           |
| `npm run db:types`                | Regenerate types from local Supabase, without changing SQL |
| `npm run skeleton:build`          | Regenerate Boneyard bones from the running local fixture   |

Database tests/reset commands and their safety conditions belong in the
[testing guide](docs/maintenance/testing.md), not an unconditional quick start.

## Dev is not Production

`development` deploys to `tsokolitaw.vercel.app` with Dev Supabase and PayMongo test mode.
`main` deploys to `www.tsokolitaw.com` with independent Production Supabase and live configuration.
Branch selection does not change local credentials; a Git merge does not apply database migrations.
Read [environment isolation](docs/getting-started/environments.md) before any hosted operation.

## Maintaining and releasing

- [Project map](docs/architecture/project-map.md) and [common changes](docs/maintenance/common-changes.md)
- [Current product decisions](docs/product/decisions.md) and [UI contracts](docs/ui/design.md)
- [Change safety](docs/maintenance/change-safety.md) and [database boundaries](docs/architecture/database.md)
- [Deployment](docs/operations/deployment.md), [migrations](docs/operations/database-migrations.md), [troubleshooting](docs/operations/troubleshooting.md)

The user performs Git staging, commits, pushes and merges. Agents report changes, validation and a
suggested Conventional Commit message; they do not perform Git writes. Never commit secrets or customer backups.
