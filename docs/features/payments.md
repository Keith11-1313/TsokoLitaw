# PayMongo payment authority

Provider requests: `src/lib/paymongo.ts`. Mode/key validation: `paymongo-mode.ts`.
Request/response contracts: `paymongo-contract.ts`. Raw-body verification/parsing:
`paymongo-webhook.ts`. Application coordination: `server-payment.ts`.

Checkout creates/reuses one payment row using `prepare_paymongo_checkout`, creates a QR Ph
Hosted Checkout, and attaches its immutable provider ID/URL with `attach_paymongo_checkout`.
Provider I/O happens outside long-running SQL locks. Reuse the payment-derived idempotency key.

## Paid callback

`POST /api/webhooks/paymongo` limits the body, verifies the timestamped signature against the
untouched text using the configured test/live signature mode, then parses the event.
`process_paymongo_paid_event` checks provider checkout/payment references, internal order ID,
order number, exact PHP amount, and pending states, with durable event deduplication.
Only then do payment and order become paid/confirmed and queue confirmation email.

A valid same-mode event with no matching local payment is acknowledged as unprocessed
(`other_environment`). This does not bypass signature/mode verification. `processed: false`
does not itself prove this order was paid. Do not disable matching checks to silence retries.

`/payment/success`, `/payment/failed`, and the verification poller read the owned persisted order.
Query parameters and a PayMongo browser return are never proof of payment.

## Expiration and historical refunds

`/api/cron/payment-expirations` → `expireDuePayMongoCheckouts` → `list_due_paymongo_checkouts`
→ PayMongo expiry → `expire_paymongo_order`. Failed provider expiry leaves the reservation pending
for retry; SQL rechecks races with payment. `expire_pending_orders` directly expires only eligible
overdue orders without an attached provider checkout. See [orders](orders.md) for state labels.

New webhooks subscribe only to `checkout_session.payment.paid`. Historical signed refund event
parsing remains to reconcile existing rows; the current app neither requests refunds nor collects destinations.

## Changes and tests

Provider changes affect [checkout](checkout.md), [orders](orders.md), inventory release, notifications,
and both environment configurations. Read the [RPC map](../architecture/database.md) and
[webhook runbook](../operations/webhooks.md). Never test with live charges without explicit approval.

Run PayMongo contract/mode/signature/route tests, `webhook-request.test.ts`, and local
`002_payments.test.sql` / `003_refunds.test.sql`. Test duplicate, invalid-signature, wrong-mode,
wrong-amount, and expiry/payment-race cases—not just the success screen.
