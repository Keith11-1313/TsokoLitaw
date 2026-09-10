# Development and Production are separate systems

| Boundary                                        | Development                     | Production                       |
| ----------------------------------------------- | ------------------------------- | -------------------------------- |
| Git branch                                      | `development`                   | `main`                           |
| Separate Vercel project / website               | `https://tsokolitaw.vercel.app` | `https://www.tsokolitaw.com`     |
| Supabase project                                | `mgkzphpznamjlgrpumjd`          | `zkmlzktvjkjrbznvrsxb`           |
| PayMongo mode                                   | `test`                          | `live`                           |
| Database, Auth identities, Storage, Vault, Cron | Dev resources                   | Independent Production resources |
| Provider credentials and callback secrets       | Dev/test values                 | Production-only values           |

Project IDs and domains above are public identifiers, not secrets. Verify them against the owner's
current dashboards before any hosted operation; this document does not query deployment state.

`development` → Dev deployment → Dev Supabase → PayMongo test mode.
`main` → Production deployment → Production Supabase → PayMongo live mode.

## What actually chooses the environment

The application reads configured variables; **it does not infer a database from the Git branch**.
`src/lib/supabase/env.ts` reads Supabase URL/keys. `src/lib/site-url.ts` validates the configured
origin for callback/provider links. `src/lib/paymongo-mode.ts` defaults missing mode to test,
accepts only `test`/`live`, and checks the secret-key prefix. Provider contracts and webhook
verification also check mode. These checks do not prove the Supabase URL belongs to the right deployment.

Vercel's “Production” deployment label means the designated production branch of that Vercel
project. The **Dev Vercel project can have that label** while remaining the Dev application.
`NODE_ENV=production` means a production build, not that live credentials should be used.

## Variable names

| Name                                   | Purpose and scope                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Local origin, Dev origin, or canonical Production origin as appropriate                |
| `NEXT_PUBLIC_SUPABASE_URL`             | Selected environment's Supabase URL                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Matching browser-safe key; RLS still required                                          |
| `SUPABASE_SECRET_KEY`                  | Matching privileged server-only key; never a `NEXT_PUBLIC_` variable                   |
| `PAYMONGO_MODE`                        | Explicit `test` in local/Dev/Preview; `live` in approved Production                    |
| `PAYMONGO_SECRET_KEY`                  | Matching test/live server API key                                                      |
| `PAYMONGO_PUBLIC_KEY`                  | Retained template slot; current Hosted Checkout runtime does not read this value       |
| `PAYMONGO_WEBHOOK_SECRET`              | The matching environment's endpoint signing secret                                     |
| `CRON_SECRET`                          | Separate random secret per environment, matching its Supabase Vault and Vercel value   |
| `RESEND_API_KEY`                       | Server-only sending credential assigned to that environment                            |
| `RESEND_WEBHOOK_SECRET`                | Matching Resend endpoint's signing secret                                              |
| `EMAIL_FROM_ADDRESS`                   | Approved verified sender; Dev email can still reach real inboxes                       |
| `INITIAL_ADMIN_EMAIL`                  | Private local-only bootstrap input; not a Vercel variable                              |
| `SUPABASE_DB_PASSWORD`                 | CLI-only password for deliberate hosted database operations, not browser configuration |

Use `.env.example` as the maintained application-variable template. Do not restore the retired
`REFUND_DESTINATION_ENCRYPTION_KEY` or add unused email settings from old docs.
Public variables are built into the client; deployment-variable changes require a new deployment.

## External services

- PayMongo: separate Dev/test and Production/live webhook endpoints, both subscribed only to
  `checkout_session.payment.paid`. Secrets and signature mode must match. Never copy a live key to Preview.
- Google → Supabase → app: Google allows the respective Supabase URL ending `/auth/v1/callback`.
  Each Supabase project allows only intended application redirect URLs (app callback `/auth/callback`).
  OAuth client configuration may share an approved Google project, but callbacks and Supabase provider
  settings must be checked independently. No paid custom Auth domain is required.
- Resend: separate application webhook URLs and signing secrets; verify environment-specific credentials
  and permitted test recipients. A shared verified sending domain does not make the deployments interchangeable.
- Supabase Cron/Vault: each project calls its own website with its own bearer secret. Google secrets
  belong in Supabase provider configuration, not client code. Other server secrets belong in protected deployment settings.

## Before touching hosted data

1. Check `git branch --show-current` and the Vercel **project/domain**, not just its deployment label.
2. Inspect `.env.local` privately: confirm URL and key ownership without printing secrets.
3. For CLI operations, explicitly link Dev and read the resulting project identifier:

```powershell
npx supabase link --project-ref mgkzphpznamjlgrpumjd
Get-Content supabase/.temp/project-ref
npx supabase migration list
npx supabase db push --dry-run
```

The CLI link is separate from the app's variables and separate from local Docker.
A Git merge never applies SQL. Follow [migration promotion](../operations/database-migrations.md).
Never run `db reset --linked`, seed Production, blindly use `--include-all`, or assume a preview uses safe keys.
