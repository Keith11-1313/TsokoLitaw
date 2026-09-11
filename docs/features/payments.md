# Payment authority

## Choosing the checkout method

Server-only `PAYMENT_METHOD` accepts `paymongo` (default) or `manual_gcash`. New checkout uses
`create_checkout_order`, the single atomic writer, and pins `orders.payment_method` in that transaction. Retries/resume read the stored method. Changing the environment variable
does not change existing orders. Zero-total loyalty still settles without an external payment.

## Manual GCash

`GCASH_BASE_QR_PAYLOAD` is the decoded original PHP GCash QR, not a URL or image filename.
`gcash-qr.ts` validates TLV lengths, currency/country and CRC, replaces only amount tag 54,
and recalculates CRC tag 63. Checkout uses the server-priced total and stores the generated payload
on the payment, preserving its recipient even if configuration changes later. Never commit the
actual recipient payload. Invalid/missing configuration blocks new manual checkout.

The owner visits `/orders/[orderId]/payment`, saves/scans the QR, pays, then uploads a completed
receipt and reviews reference, amount, Philippine date/time and recipient. Manual GCash has its own
30-minute submission window; PayMongo retains the shared 15-minute setting. Some sending apps charge
separate transfer fees. A QR prefills an amount; it cannot prevent editing or revoke a saved code.
Late payments require direct support, not automatic reactivation or another payment.

Optional Tesseract OCR starts in the browser when a valid image is selected and never proves payment.
Uploading another image supersedes the current read; selecting the file again reruns it. Missing or
ambiguous fields stay editable. `prepare-receipt-ocr.mjs` copies
locked dependency assets into ignored `public/receipt-ocr` before dev/build; no external OCR/CDN
requests are needed. Sparse-text recognition and conservative parsing cover the validated GCash,
GoTyme and MariBank labels/date formats. A detected load-purchase receipt is warned against rather
than prefilled. Production CSP permits same-origin workers and WebAssembly, not general eval.
Manual correction remains required because wallet layouts and OCR output can change.

Server validation accepts only decoded JPG/PNG/WebP up to 3 MiB. Originals are in private
`payment-receipts` Storage; `manual_payment_submissions` retains attempts and decisions with
owner/Admin read RLS. Receipt URLs authenticate each request; no public Storage URL is returned.
Customer-entered receipt details use `reported_reference`, `reported_amount`, `reported_paid_at`,
and `reported_recipient` so they cannot be confused with the verified payment record.
Known SQL failures clean up only the newly uploaded file. Unknown commit outcomes retain evidence;
operators should reconcile orphan uploads against submissions before any deliberate cleanup.

`submit_manual_payment` locks the owned pending order and payment, checks the deadline, records
the proof, and sets payment `UNDER_REVIEW`. It does not confirm fulfillment or send confirmation.
Under-review orders cannot expire or be cancelled online, and keep inventory/reward reservations.
Admins must check this queue promptly, especially before pickup; there is no automatic approval or
timeout that discards a possible payment. Admin Orders includes up to 100 review orders alongside
the 100 most recent orders, so older reviews remain visible within that bounded queue.

Admin opens the existing order details and compares the receipt against the **actual incoming
GCash transaction**, including recipient, amount, reference and time. `review_manual_payment`
rechecks active Admin/state under a lock. Approval requires the exact total and atomically sets
payment `PAID` / order `CONFIRMED`, records an audit entry and queues the existing confirmation
event. Unique approved references prevent one normalized reference paying multiple orders.
Screenshots/OCR/customer corrections are untrusted; the Admin checkbox is an acknowledgment,
not independent verification by an API.

Reject requires a reason, retains the old receipt and opens a 15-minute correction window.
An uncorrected pending order can then expire/release normally. Do not reject an unresolved real
transfer merely to clear the queue; resolve discrepancies with the customer first. Rejection and
submission add no new email events; customers check their order status. Paid concerns remain in person.

Local tests: `012_manual_gcash.test.sql`, `gcash-qr.test.ts`, `receipt-details.test.ts`, plus the
existing payment/loyalty/inventory suite. Apply the pre-v1 baseline only through the coordinated reset workflow before the dependent app. Validate the complete flow on Dev, then deliberately promote to Production.

Local acceptance (September 11, 2026): production-build browser checks at 390, 768 and 1440 px
covered QR display, on-device OCR of a synthetic receipt, submission, owner/anonymous receipt
access, Admin approval and confirmed customer status. Checkout recalculated tampered browser
prices, retries retained the original method, and delayed approval preserved newer cart items.
The cart's hydration snapshot also stays empty until each streamed consumer hydrates.
Real wallet receipt extraction and actual received-funds reconciliation still require Dev acceptance;
these local checks made no payment and sent no email. The migrations include explicit service-role
read grants required by checkout/loyalty and the existing confirmation dispatcher on a clean database.

## PayMongo (existing flow)

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

## Expiration

`/api/cron/payment-expirations` → `expireDuePayMongoCheckouts` → `list_due_paymongo_checkouts`
→ PayMongo expiry → `expire_paymongo_order`. Failed provider expiry leaves the reservation pending
for retry; SQL rechecks races with payment. `expire_pending_orders` directly expires only eligible
overdue orders without an attached provider checkout. Customer/Admin order reads also invoke that
same idempotent direct-payment processor so a Manual GCash deadline is reflected immediately if
the scheduled job is delayed. Provider-bound PayMongo orders still require the provider-safe Cron
path and are never released by a page read. See [orders](orders.md) for state labels.

Webhooks subscribe only to `checkout_session.payment.paid`. The retired refund parser/RPCs are removed;
paid concerns are settled outside the website.

## Changes and tests

Provider changes affect [checkout](checkout.md), [orders](orders.md), inventory release, notifications,
and both environment configurations. Read the [RPC map](../architecture/database.md) and
[webhook runbook](../operations/webhooks.md). Never test with live charges without explicit approval.

Run PayMongo contract/mode/signature/route tests, `webhook-request.test.ts`, and local
`002_payments.test.sql` / `003_cancellation.test.sql`. Test duplicate, invalid-signature, wrong-mode,
wrong-amount, and expiry/payment-race cases—not just the success screen.
