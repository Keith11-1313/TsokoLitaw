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

Payment states are separate: `PENDING`, `PAID`, `FAILED`, historical `REFUNDED`.
There is no payment `EXPIRED` value: expiration transitions unpaid payment to `FAILED` and order
to `EXPIRED`. `src/lib/order-status.ts` presents state labels; it does not authorize transitions.

## Cancellation

`src/app/orders/[orderId]/actions.ts` → `server-cancellation.ts` → `prepare_order_cancellation`
→ expire exact provider checkout if attached → `cancel_unpaid_order` → notification attempt.
Only pending unpaid orders are cancellable online. SQL rechecks state under locks; a paid webhook
winning a race must prevent release. Paid concerns are settled in person, not through an online refund form.
Historical refund records/reconciliation are retained, not safe dead-code deletion targets.

## Reviews

Order detail opens the review modal. `orders/[orderId]/review/actions.ts` → `server-reviews.ts`
→ `submit_order_review`: active owner, completed order, one review, bounded text and rating.
Reviews are hidden until authorized Admin moderation through `moderate_order_review`.
Public Journal shows only safe approved display data; no customer emails.

Tests: `order-status.test.ts`, `components/orders/orders-list.test.tsx`, local `001_auth_rls`,
`002_payments`, `003_refunds` (unpaid cancellation despite its historical filename),
`004_admin_orders`, `005_reviews`, and `011_loyalty`. Changes must preserve stored snapshots
and cross-customer denial, including direct URL/action requests.
