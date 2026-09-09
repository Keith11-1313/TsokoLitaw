# Webhooks and scheduled jobs

Read [environment isolation](../getting-started/environments.md) first. Each deployed project has
its own URLs and signing/bearer secrets. This document describes configuration; it does not create jobs.

## Callback endpoints

| Endpoint                      | Sender   | Configuration / validation                                                                                                                                   |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/webhooks/paymongo` | PayMongo | Subscribe only to `checkout_session.payment.paid`; match test/live key, resource mode and endpoint secret                                                    |
| `POST /api/webhooks/resend`   | Resend   | Matching endpoint secret; `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed` |

Prefix each route with the matching Dev or canonical Production origin. Do not subscribe new
PayMongo endpoints to refunds; legacy parsing exists only for historical rows. Signed event bodies
must remain untouched until verification. Both handlers enforce bounded request bodies and durable
deduplication. Resend delivery outcomes never mark orders paid.

## Supabase Cron

| Application endpoint (GET)      | Expected schedule in UTC | Work                                                                                 |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `/api/cron/payment-expirations` | `*/5 * * * *`            | At most 100 due provider-bound checkouts; provider expiry before reservation release |
| `/api/cron/notifications`       | `*/5 * * * *`            | At most 20 due deliveries, bounded retries                                           |
| `/api/cron/account-deletions`   | `0 19 * * *`             | 3 AM Manila daily; at most 100 due profiles plus rate-limit pruning                  |

Jobs live in each environment's Supabase Cron, calling that environment's website with
`Authorization: Bearer <its CRON_SECRET>` sourced privately from Vault. Production's configured
site origin is stored as `tsokolitaw_site_url` in Vault. Never put literal secrets in docs or screenshots.
`src/lib/cron-auth.ts` provides constant-time authorization and non-cacheable responses.
`vercel.json` intentionally has no competing Vercel Cron schedule.

## Proving a job works

1. Confirm project, request URL, time range, and job schedule.
2. Inspect `cron.job_run_details` for the scheduler result.
3. Inspect the corresponding HTTP response in Supabase's HTTP request/response records and the
   matching Vercel route logs. SQL `succeeded` may mean only that an HTTP request was queued.
4. Inspect returned batch counts and the affected state. HTTP 200 can include failed/deferred items;
   it does not prove every payment expired or every email was sent.
5. For a provider error, inspect its event/request evidence without logging secrets or full customer payloads.

Do not invoke a production processor casually as a read-only test: it can change accounts/orders or
send email. Read-only checks first; approved Dev test operations next. See [troubleshooting](troubleshooting.md).
