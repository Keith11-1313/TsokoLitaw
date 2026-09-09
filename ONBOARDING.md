# Maintaining TsokoLitaw

Start here, then consult the specifications for the feature you change. This is one Next.js application using Supabase for data/Auth, PayMongo for QR Ph payments, and Resend for email.

## First local run

1. Use `development`. The user manages Git commits, pushes, and the PR to `main`.
2. Run `npm ci` with a Node.js version supported by the installed Next.js version.
3. Obtain Dev credentials privately and populate `.env.local` from `.env.example`.
4. Run `npm run dev`. Confirm sign-in and catalog reads use the intended Dev environment.
5. Before handoff, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

Docker is needed for local database work, not every UI edit against hosted Dev. A hosted reset is not part of onboarding or the current roadmap. `npm run db:reset` recreates the local database and deletes its contents; use it only for deliberately disposable local data.

## Find the code

| Work | Start here |
| --- | --- |
| Customer UI | `src/app/<route>/page.tsx` and its component imports |
| Admin UI | `src/app/admin/<area>/page.tsx`, `actions.ts`, and `src/components/admin/` |
| Styling | `src/app/globals.css`, `src/components/ui/`, `DESIGN.md` |
| Authorization | `src/lib/auth.ts` and `src/lib/supabase/` |
| Data operations | `src/lib/server-<feature>.ts` |
| Database rules | `supabase/migrations/` in timestamp order and `DATABASE.md` |
| Tests | Nearby `*.test.ts(x)` and `supabase/tests/database/` |

Format edited files with `npm run format -- path/to/file.tsx`; verify with `npm run format:check -- path/to/file.tsx`. Keep formatting separate from functional edits when practical. Generated Boneyard files are excluded; use the existing skeleton command when its fixture changes.

## Follow checkout once

1. `src/components/checkout/checkout-content.tsx` submits the selected cart and pickup option.
2. `src/app/checkout/actions.ts` authenticates, validates input, and applies rate limits.
3. `src/lib/server-checkout.ts` reloads prices, reads current Terms, and invokes `create_pending_order`.
4. Its latest definition in `supabase/migrations/20260904030000_inline_loyalty_order_writer.sql` atomically writes order snapshots, reserves inventory, and handles loyalty. Search later migrations for replacements before editing a function; add a migration instead of changing applied history.
5. `src/lib/server-payment.ts` opens or reuses checkout; `src/lib/paymongo.ts` owns provider requests. Zero-total loyalty orders skip PayMongo.
6. `src/app/api/webhooks/paymongo/route.ts` verifies paid events and processes the database transition. A browser success redirect is not proof of payment.
7. `src/lib/server-notifications.ts` sends queued email. Failed email does not reverse payment.

`src/lib/server-cancellation.ts` cancels only unpaid orders. It expires the provider checkout before releasing the reservation. Payment-expiration Cron follows the same provider-first rule. Historical refund records and reconciliation remain for earlier transactions; they are not a current customer feature and are not safe to delete simply because their UI was removed.

## Database types and changes

`src/types/database.generated.ts` is a checked-in schema snapshot. Clients import `Database` from `src/types/database.ts`, which adds explicit nullable RPC argument exceptions that PostgreSQL type generation cannot infer. Do not hand-edit generated types or hide mismatches with casts.

After reviewed local migrations, run `npm run db:types`. For a read-only refresh from hosted Dev:

```powershell
npm run db:types -- --project-id mgkzphpznamjlgrpumjd
npm run typecheck
```

Generation does not apply migrations, reset databases, change the linked project, or copy customer data. Review the generated diff. The initial snapshot came from hosted Dev. For SQL changes, run database lint and pgTAP on a disposable local database; the full suite is not intended for populated hosted databases.

## Shared form contracts

- `useFormGate` needs `formRef`, `formProps`, and named inputs. It compares against the initial mount: remount editors when changing records; it does not automatically adopt a saved baseline. Pass asynchronous image validity through `extraValid`.
- `CustomSelect` uses a hidden native select for values and validity. Its change event must reach the form gate. Preserve keyboard navigation, disabled options, and focus.
- `useEditorDialog` handles scroll locking, focus, Escape, and dirty-close confirmation. Route close actions through `requestClose`, pass `pending`, and mount `DiscardChangesDialog` with the returned ref/handlers. Successful save may close directly.
- Server actions and SQL still validate mutations. Browser validation does not authorize writes.

## Deployment and troubleshooting

`development` deploys to `tsokolitaw.vercel.app` with Dev Supabase (`mgkzphpznamjlgrpumjd`). `main` deploys to `www.tsokolitaw.com` with Production Supabase (`zkmlzktvjkjrbznvrsxb`). Test Dev, then use one reviewed PR. Migrations are promoted separately; a Git merge does not apply SQL.

For failures, inspect the relevant Vercel route logs and provider events. Supabase Cron calls payment expiration and notification retries every five minutes and account deletion daily. A successful Cron SQL invocation does not establish HTTP success: inspect the HTTP response and application logs. Configuration is in [README.md](README.md#deployment).

Use [REQUIREMENTS.md](REQUIREMENTS.md) for current behavior, [DECISIONS.md](DECISIONS.md) for rationale, [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries, [DATABASE.md](DATABASE.md) for schema, and [TASKS.md](TASKS.md) for remaining work. Completed phase checklists record history; current requirements take precedence over superseded checklist wording.
