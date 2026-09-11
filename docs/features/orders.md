# Orders, cancellation, and reviews

`/orders` and `/orders/[orderId]` use `server-orders.ts` ownership-scoped snapshot reads.
`orders-list.tsx` owns filters/pagination presentation; `order-line-items.tsx` renders the shared receipt.
Order numbers come from PostgreSQL's shared sequence (`TL-0001` style), not per-page counters.

## State authority

```text
PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED
Terminal alternatives: CANCELLED, EXPIRED
```

This describes the domain vocabulary; verified payment normally commits payment `PAID` and order
`CONFIRMED` together. Admin fulfillment uses `transition_order_status` for the paid forward-only
`CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED` path. The action is under
`src/app/admin/orders/actions.ts`, with server orchestration in `server-orders.ts` and an SQL audit record.

Payment states are separate: `PENDING`, `UNDER_REVIEW` (Manual GCash only), `PAID`, `FAILED`.
Under review keeps fulfillment at `PENDING_PAYMENT`; the customer label explains payment review.
See [manual payment verification](payments.md#manual-gcash) for proof, approval and rejection.
There is no payment `EXPIRED` value: expiration transitions unpaid payment to `FAILED` and order
to `EXPIRED`. Manual/direct overdue orders are synchronized through the existing atomic expiration
processor before customer or Admin order reads, preventing a closed payment page from disagreeing
with a still-pending order card. A provider-bound PayMongo order waits for verified provider expiry.
`src/lib/order-status.ts` presents state labels; it does not authorize transitions.

## Cancellation

`src/app/orders/[orderId]/actions.ts` → `server-cancellation.ts` → `prepare_order_cancellation`
→ expire exact provider checkout if attached → `cancel_unpaid_order` → notification attempt.
Only pending unpaid orders are cancellable online. SQL rechecks state under locks; a paid webhook
winning a race must prevent release. Paid concerns are settled in person, not through an online refund form.
The pre-v1 baseline removes the retired online refund subsystem.

## Reviews

Order detail opens the review modal. `orders/[orderId]/review/actions.ts` → `server-reviews.ts`
→ `submit_order_review`: active owner, completed order, one review, bounded text and rating.
Reviews are hidden until authorized Admin moderation through `moderate_order_review`.
Public Journal shows only safe approved display data; no customer emails.

Tests: `order-status.test.ts`, `components/orders/orders-list.test.tsx`, local `001_auth_rls`,
`002_payments`, `003_cancellation`,
`004_admin_orders`, `005_reviews`, and `011_loyalty`. Changes must preserve stored snapshots
and cross-customer denial, including direct URL/action requests.
