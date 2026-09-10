# Client, server, and database boundaries

## Choosing the client

| Helper                       | Used for                              | Boundary                                       |
| ---------------------------- | ------------------------------------- | ---------------------------------------------- |
| `src/lib/supabase/client.ts` | Interactive browser Auth/session work | Public URL/key only; RLS applies               |
| `src/lib/supabase/server.ts` | Cookie-backed server reads            | User session and ownership-scoped RLS          |
| `src/lib/supabase/public.ts` | Deliberately public server reads      | Publishable credentials, no private user state |
| `src/lib/supabase/admin.ts`  | Controlled privileged operations      | Server-only secret; call sites must authorize  |
| `src/proxy.ts`               | Session refresh/cookie handling       | Does not replace route/action guards           |

`"use client"` identifies an interactive boundary; `"use server"` exposes server actions.
`import "server-only"` prevents server modules from being bundled into client imports.
Use **type-only** imports when a component needs a DTO from a server module; do not import a
runtime server operation into browser code. Avoid returning unnecessary row fields or secrets as props.

`requireCustomer()` and `requireAdmin()` in `auth.ts` load verified claims and an active profile.
Every action must check authorization independently of the page that renders its button. The
privileged client bypasses RLS, so server checks and service RPC actor/state checks both matter.

## Pricing has two meanings

`commerce.ts` is shared pure code. A browser call computes an estimate from local cart/catalog state.
`server-checkout.ts` calls it with freshly loaded catalog data before building the trusted RPC input.
Only the latter is authoritative for a new order. PostgreSQL protects the atomic write, quantities,
pickup eligibility, inventory/reward locks, and snapshot consistency; it does not make arbitrary
client-provided priced JSON safe. Browsers have no permission to call the trusted writer directly.

## TypeScript is not runtime validation

All clients use `Database` from `src/types/database.ts`, backed by generated public-schema types.
The generator cannot infer nullable function arguments; the manual wrapper explicitly permits
only the known nullable IDs/reward/search arguments. New exceptions must agree with actual SQL.

The existing manually shaped nested-query DTOs and JSON payloads still require mapping and runtime
validation. A cast does not prove a relationship, authorize a user, or validate input. Do not hide a
schema mismatch with `any` or `as unknown as`; investigate the query/schema first.

For a schema update, apply local migrations, regenerate, inspect the diff, and typecheck:

```powershell
npm run db:types
npm run typecheck
```

An explicit read-only hosted Dev refresh is available:

```powershell
npm run db:types -- --project-id mgkzphpznamjlgrpumjd
```

Generation changes only the checked-in type snapshot. It does not reset/apply SQL, copy customer
data, or change the CLI link. Generated-file length is not architectural complexity.
