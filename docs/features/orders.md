# Orders, cancellation, and reviews

`/orders` and `/orders/[orderId]` use `server-orders.ts` ownership-scoped snapshot reads.
`orders-list.tsx` owns filters/pagination presentation; `order-line-items.tsx` renders the shared receipt.
My Orders uses All, Active (Received, Preparing, Ready for pickup), and Past (Completed).
The same three filter buttons appear on mobile and desktop; there is no mobile dropdown.
Pending payment, cancelled, and expired orders remain under All. Counts apply to the current page.
List cards show status, total, pickup details, and a full-width View order action without item breakdowns.
Order details always show the per-box price breakdown; checkout keeps its expandable breakdown.
New order numbers are allocated atomically in PostgreSQL as `TLDDMMYY001`, with the final three
digits restarting for each Manila calendar date. Existing `TL-0001` style numbers remain valid
historical references and provider callbacks accept both formats.
Receipts show the snapshotted complimentary extra as a separate `₱0.00` line. Paid extras remain
separate. Reordering copies paid selections only; the new checkout applies the current complimentary extra.
Cancelled, expired, and completed order details offer `Order again` only when every saved catalog
selection is still active. It copies selections to the cart; server checkout reprices them normally.

## State authority

```text
PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED
Terminal alternatives: CANCELLED, EXPIRED
```

This describes the domain vocabulary; verified online payment normally commits payment `PAID` and
order `CONFIRMED` together. Pay-at-counter orders start `CONFIRMED` / `PENDING`, may be prepared and
made ready while unpaid, and cannot become `COMPLETED` until Admin records payment. Admin fulfillment uses `transition_order_status` for the forward-only
`CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED` path. The action is under
`src/app/admin/orders/actions.ts`, with server orchestration in `server-orders.ts` and an SQL audit record.

Payment states are separate: `PENDING`, `UNDER_REVIEW` (Manual GCash only), `PAID`, `FAILED`.
For pay-at-counter, `PENDING` means payment is due at campus pickup and has no automatic expiry.
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
Customers can cancel only their own pending unpaid orders online. SQL rechecks state under locks; a paid webhook
winning a race must prevent release. Paid concerns are settled in person, not through an online refund form.
The pre-v1 baseline removes the retired online refund subsystem.

Admin Orders separately offers **Cancel order** for pending unpaid orders, including counter orders
in Received, Preparing or Ready for pickup (including no-shows). A confirmation dialog requires a
3–500-character reason. Paid, under-review, completed, expired and already-cancelled orders have no
new cancellation action. `cancelAdminOrderAction` authenticates and rate-limits the actor;
`server-cancellation.ts` calls `prepare_admin_order_cancellation`, expires the exact attached provider
checkout, then calls `cancel_admin_unpaid_order`. The consolidated baseline locks and rechecks
order/payment state and the provider reference before committing. It releases prepared pieces using
item snapshots and the placement date (Hybrid only reserves same-day placement), restores a bound
reward through the existing trigger, and records `order.admin_cancelled` with actor, reason and prior
status. Retries do not repeat release, audit or the existing cancellation email event. Customer
cancellation and paid-order/refund policy remain unchanged.

## Reviews

Order detail opens the review modal. `orders/[orderId]/review/actions.ts` → `server-reviews.ts`
→ `submit_order_review`: active owner, completed order, one review, a required one-to-five rating,
an optional bounded comment, allow-listed tasting highlights, and up to five validated review images.
The review form accepts HEIC/HEIF/JPG/PNG/WebP source photos (up to 25 MiB each) and prepares them
on the customer's device before submission. HEIC/HEIF conversion is loaded only when needed; all
submitted images are JPEG or WebP. The current single-request action still limits the prepared
images to 3 MiB each and 3.5 MiB combined so the request stays below hosting limits. A photo set
that cannot fit at usable quality is rejected with an inline error. Larger combined galleries
require a separately authorized direct-to-Storage upload flow.

Review images use the private `review-media` bucket and are served only to the owner, an Admin, or
after authorized Admin publication through `moderate_order_review`. Public Journal shows only safe
approved display data from `get_public_featured_reviews`: masked customer names, immutable ordered-box
summaries, review date, rating, highlights, comment, and image count. No customer emails, full public
names, or raw Storage paths are exposed. Multi-image galleries provide Previous/Next controls and
compact position dots, do not autoplay, and handle unavailable files. Images can be opened in a
full-screen viewer. Gallery images fit inside a stable
4:3 frame without cropping; other aspect ratios show the surrounding surface. A single image has no carousel controls.
Because `review-media` is private, galleries load the authorized application route directly in the
signed-in browser instead of sending that route through the unauthenticated Next.js image optimizer.

Tests: `order-status.test.ts`, `components/orders/orders-list.test.tsx`, local `001_auth_rls`,
`002_payments`, `003_cancellation`,
`004_admin_orders`, `005_reviews`, and `011_loyalty`. Changes must preserve stored snapshots
and cross-customer denial, including direct URL/action requests.

Admin cancellation additionally has server-orchestration, action-auth/validation/rate-limit, dialog
confirmation/error/dirty-close/pending/keyboard tests and `017_admin_cancellation.test.sql` covering
private grants, actor/state/payment denial, exact provider reference, stock rollback/release, reward
restoration, and idempotent audit/notification behavior.
