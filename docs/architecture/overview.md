# Architecture overview

TsokoLitaw is one Next.js App Router application on Vercel. React/TypeScript/Tailwind provide
the UI; Supabase supplies PostgreSQL, Auth, RLS, and media Storage. PayMongo handles QR Ph
Hosted Checkout. Resend sends transactional email. There is no separate native commerce backend.

| Layer                                | Responsibility                                                                         | Never assume                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Browser components                   | Configuration, local cart, estimates, forms, navigation                                | Browser totals or identity authorize a write                |
| Server pages/actions/routes          | Verified identity, input validation, live repricing, provider coordination             | A hidden control or redirect protects an operation          |
| PostgreSQL functions/constraints/RLS | Ownership, atomic order graph, stock and reward locks, transition rules, deduplication | Multiple app-side updates are equivalent to one transaction |
| PayMongo                             | Hosted collection and signed provider evidence                                         | A browser return means paid                                 |
| Resend                               | Message dispatch and delivery evidence                                                 | Delivery success/failure changes commerce state             |

See [client/server boundaries](client-server-boundaries.md) and the [RPC map](database.md).

## Why the necessary complexity stays

Two customers can buy the last stock simultaneously. A provider may retry a callback, or payment
can race expiration. SQL locks, unique keys, service-only RPCs, and idempotent provider operations
protect those cases. They are production safeguards, not speculative architecture.

Keep the existing naming and direct page → action → server module → RPC path. Do not add a
repository/service abstraction simply to make the folders look layered. Most `src/lib` files are
discoverable by their feature prefix; use the [project map](project-map.md) instead of moving them all.

## Reads and caches

`server-commerce.ts` has live reads for authoritative checkout and tagged caches for public catalog
previews (five minutes) and published pickup definitions (30 seconds). Admin publication invalidates
the relevant tags. A cached pickup display never reserves inventory.

`server-orders.ts` uses ownership-scoped nested reads; customer history is cursor-paginated, 20 per
page. `auth.ts` uses React `cache()` for request-only deduplication. Private Profile, Orders, payment,
and Admin data must not enter a shared cache. Cache Components are not enabled in the current configuration.

Performance changes should start with measured slow reads, query plans, and request fan-out—not
new infrastructure. `tests/performance/` contains staged k6 checks. Vercel configuration uses Fluid
compute and `sin1`; separate environment-specific region machinery is not currently justified.

## Scheduled work

Supabase Cron is the single scheduler. It invokes protected application endpoints for provider-first
payment expiration, notification retries, and due-account deactivation. The two Supabase projects
have independent jobs/secrets. Vercel deployment alone does not create or verify those jobs.
See [webhooks and Cron](../operations/webhooks.md).
