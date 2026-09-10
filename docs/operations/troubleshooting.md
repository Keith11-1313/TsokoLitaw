# Troubleshooting without changing data blindly

Start with the environment, affected route, timestamp, expected behavior, and exact error. Collect
minimal redacted evidence. Do not dump secrets, cookies, full billing bodies, or customer records into logs.

| Symptom                                      | First checks                                                                                           | Do not do                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Missing column/function                      | Correct app Supabase URL, CLI target, migration list and reviewed pending files                        | Reset hosted data or patch types with casts                            |
| Expired deadline but order pending           | Attached checkout, provider expiration result, Cron HTTP result and batch failures                     | Mark unpaid/release stock without provider reconciliation              |
| Expired order still labelled pending payment | Raw order/payment pair, deployed commit, expiry-sync migration, `order-status.ts`                      | Treat display copy as the database fix                                 |
| Paid return still verifying                  | Signed webhook delivery, matching mode/secret/provider IDs/amount, local payment row                   | Trust the browser redirect or fabricate a paid status                  |
| Email missing                                | `notification_deliveries` state/attempts, Resend result, matching callback secret, Cron batch          | Reverse payment or blindly resend terminal delivery failures           |
| Cron SQL succeeded but work failed           | Corresponding HTTP response and per-item result counts                                                 | Assume SQL scheduler success equals application success                |
| Vercel chart reports 5xx but search is empty | Match chart/log time windows, environment/route and actual status-code filter (500–599)                | Assume text search `500` covers all failures or proves the chart wrong |
| Admin route returns Not Found                | Active profile role in intended environment, page/action guard                                         | Remove authorization to make the page open                             |
| Pickup absent/sold out                       | Published date/window/location, mode, Manila cutoff/lead time, prepared balance                        | Invent a date in Inventory or override stock locally                   |
| Blank navigation/loading                     | Deployed commit, `app/layout.tsx`, customer navigation link, Boneyard registry/fixture, browser timing | Add an artificial delay or claim a loading fix without observing it    |

## Loading skeleton

Boneyard remains installed and registered for the shared root Suspense initial-load fallback.
Client navigation retains the current page while the clicked customer header link looks pressed
and gray and blocks repeat activation until navigation finishes.
The absence of a full-page skeleton during navigation is intentional. Do not reintroduce a route
`loading.tsx` to fix this; it would replace the current page during the transition again.
This cannot guarantee a skeleton before initial HTML arrives or prove there is no other slow route work.
Inspect browser loading/console/network behavior when diagnosing a new blank screen.
Regenerate bones only when the fixture changes; see [design](../ui/design.md).

## Safe escalation

Reproduce on Dev with an authorized account. Use focused tests and read-only schema/provider
inspection before choosing a fix. Retrying a provider write needs the same idempotency identity.
For a payment/expiry race, inspect both sides rather than issuing direct order updates.
Existing dependency advisories are a separate targeted maintenance update; documentation cleanup
does not resolve them. Review current audit evidence before changing versions; avoid forced major upgrades.
