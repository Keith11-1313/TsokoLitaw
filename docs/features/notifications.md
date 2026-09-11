# Transactional notifications

Committed order transition → SQL enqueue trigger → `notification_deliveries` →
`server-notifications.ts` → Resend → signed delivery webhook → delivery metadata.

Active order events: `order.confirmed`, `order.ready_for_pickup`, `order.cancelled` (unpaid only).
Refund templates and triggers were removed in the pre-v1 cleanup. Customer contact is email-only.
Do not add a new event just because a new UI action was introduced.

## Files and data

- SQL `enqueue_transactional_order_email`: unique event/entity
  keys queue messages from persisted transitions, not browser clicks.
- `src/lib/server-notifications.ts`: claims due deliveries, builds snapshot payloads, sends with
  the stored Resend idempotency key, records results, and reconciles early callbacks.
- `src/lib/notification-email.ts`: HTML/plain-text copy using stored order/pickup information.
- `/api/cron/notifications`: protected retry batch, at most 20 deliveries per call.
- `/api/webhooks/resend`, `resend-webhook.ts`, `process_resend_delivery_event`: raw-body signature
  verification, event ID deduplication, and newer-only delivery state.

Local send attempts are capped at five; stale processing claims can recover after ten minutes.
The request timeout is 15 seconds. `SEND_FAILED` is a retryable local failure; provider-reported
`FAILED`, `BOUNCED`, `COMPLAINED`, and `SUPPRESSED` are terminal evidence, not automatic resends.
Delivery states do not change commerce state. A payment remains paid even if confirmation email fails.

Modify email wording in `notification-email.ts` and its tests; modify scheduling/retry behavior
in the server processor and [Cron configuration](../operations/webhooks.md). Preserve keys and
claim safety. Tests: `notification-email.test.ts`, `resend-webhook.test.ts`, and local
`012_notifications.test.sql`. Dev sending can reach actual inboxes; use approved recipients.
