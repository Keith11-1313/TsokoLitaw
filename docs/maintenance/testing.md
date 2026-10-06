# Validation appropriate to the change

From the repository root:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Use Prettier on **edited files**, not a surprise repository-wide rewrite:

```powershell
npm run format -- path/to/edited-file.tsx
npm run format:check -- path/to/edited-file.tsx
```

The format scripts expect paths. `.prettierignore` excludes generated schema/Boneyard output,
lockfile, dependencies, and build output. A production build may require network access for fonts;
report that blocker honestly rather than claiming a pass. Tests do not prove deployed configuration.

## Match tests to risk

| Change                   | Minimum additional checks                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Documentation            | Relative links/anchors, source paths/RPC names, removed-document references, command safety                                  |
| Presentational component | Relevant rendered component tests; unchanged markup/classes for pure extraction; responsive visual review for layout changes |
| Shared form/editor       | `src/hooks/editor-contracts.test.tsx`; keyboard, dirty close, discard/stay, pending/save failure, focus restoration          |
| Pricing/cart/checkout    | `commerce.test.ts`, receipt tests, Dev checkout, relevant local payment/inventory/loyalty SQL tests                          |
| Auth/permission          | Redirect tests, local `001_auth_rls`, cross-owner and non-Admin requests                                                     |
| PayMongo                 | Mode/contract/signature/route tests, `webhook-request.test.ts`, local `002_payments` and `003_cancellation`                  |
| Notifications            | Email/Resend webhook tests, local `012_notifications`; approved test recipients                                              |
| SQL                      | Disposable local reset, lint and full pgTAP suite, regenerate types, then Dev apply/verification                             |

## Database test boundary

Start Docker and `npm run supabase:start`. `npm run db:reset` deletes/recreates **local** data;
run only when it is disposable. Then `npm run db:lint` and `npm run db:test`.
The full suite assumes a clean database even though test files roll back their writes.
Do not run `npm run db:test:linked` on populated Dev or Production.

`npm run db:lint:linked` inspects the deliberately linked hosted schema; check the project first.
`db:test:linked:cancellation` is a focused historical cancellation test, not blanket approval to
run tests on hosted data. Prefer local tests; review any hosted test's fixtures and effects before use.

No SQL/server behavior changed in a documentation or pure presentation extraction? The full local
database suite is not a prerequisite; state that it was not run rather than imply SQL was tested.

For the dashboard simulation fixture, use its `app.dashboard_fixture_commit = 'false'` mode against
local Supabase first. A successful validation prints the generated summary, raises the documented dry-run
exception and leaves zero fixture-tagged users/orders after rollback. Test `manual` and `automatic`
payment modes when changing their branching logic. A committed fixture makes the database populated;
do not run the clean-data pgTAP suite afterward without first returning to a disposable clean local state.
Never use fixture results as evidence that hosted deployment, provider or Cron integration works.

## Manual UI and release checks

Use approximately 390 px mobile, 768 px tablet, and 1440 px desktop. Check overflow, readable
prices/quantities, touch targets, keyboard operation, loading/empty/error states, and focus.
For Home changes, also confirm the two/four/four-column coating grid, the one/three/three-column pickup
steps, the cream/white section alternation, the current statically imported hero, and a fresh console
without hydration failures at those widths.
Use Dev and an authorized account for protected pages. Do not bypass production authorization to take screenshots.
For Customers/Orders pagination, check single-page navigation suppression, 10/20/50/100 row
selection, first/last disabled controls, numbered pages/ellipses, reset after filtering, and no
page-level overflow. Customer pagination queries the server; Admin Orders paginates its loaded set.
For customer photos, `src/lib/server-customers.test.ts` covers authorized page-only lookups,
Google-host validation, metadata minimization and lookup failures; `customer-avatar.test.tsx`
covers missing images, image-error fallback and a changed photo URL. Check a real Google customer
and a photo-less fixture account in the authorized Dev directory; synthetic accounts need not have
Google photos. Verify the 40px circular image and unchanged alignment at each supported width.
For public copy changes, `src/app/public-information.test.tsx` checks displayed dates and current
FAQ/Terms/Privacy behavior. A display date is not a persisted checkout acceptance-version update.
For critical behavior changes, test negative and duplicate/racing cases in addition to a happy path.

The staged k6 runbook is [tests/performance/README.md](../../tests/performance/README.md).
Only use approved staged traffic; never load-test Production or providers as a casual validation step.
Release validation is separate: follow [deployment](../operations/deployment.md).
