# Checkout execution path

Start at `src/app/checkout/page.tsx`: require the customer, load pickup availability and loyalty,
then render `src/components/checkout/checkout-content.tsx`.

1. **Browser:** selected cart lines, customer details, date/window/location, optional reward, Terms
   acceptance. A checkout UUID is retained for retry; browser totals and remaining-stock labels are guidance.
2. **Action:** `src/app/checkout/actions.ts` authenticates, validates bounded IDs/counts/text, and
   applies the distributed user/IP rate limit. The user ID comes from the verified profile, not input.
3. **Server:** `server-checkout.ts` reloads the live catalog through `server-commerce.ts`, runs
   `commerce.ts:priceCheckoutCart`, reads current Terms, and constructs trusted priced snapshots.
4. **Transaction:** `create_pending_order` (latest definition
   `20260904030000_inline_loyalty_order_writer.sql`) locks/rechecks account, pickup, inventory, and
   reward eligibility. It inserts the order graph/Terms acceptance or returns the existing order
   for the same owner/idempotency key. Ready stock is reserved in pieces, not boxes.
5. **Provider:** `server-payment.ts` prepares or resumes the unique payment; `paymongo.ts` creates
   environment-bound Hosted Checkout using `checkout:<payment UUID>` idempotency. The stored
   provider reference is attached once. Zero-total loyalty settlement skips PayMongo.
6. **Verified result:** the [PayMongo webhook](payments.md) matches signed provider evidence to the
   stored order and amount, then commits the paid transition. Return URLs only read persisted state.
7. **Email:** a database trigger queues the confirmation. `server-notifications.ts` attempts dispatch;
   retry processing is independent of payment success.

## Files to change

- Pickup/customer state, validation feedback, submit/retry orchestration: `checkout-content.tsx`.
- Receipt mapping/layout: `checkout-order-summary.tsx`; shared item rendering: `orders/order-line-items.tsx`.
- Cart persistence/selected lines: `cart-provider.tsx`. Purchased selection is removed only after verified payment.
- Pickup definitions/eligibility: [inventory guide](inventory.md); never authorize stock from cached availability.
- Input limits and user-facing server errors: `checkout/actions.ts`, with server/SQL limits kept consistent.

A failed provider call can leave a saved pending order. Reuse its identity/payment rather than
creating another order or releasing stock blindly. Browser cancellation of payment is not order cancellation.

Tests: `commerce.test.ts`, checkout summary tests, PayMongo contract/mode/webhook tests, local
`002_payments`, `008_inventory`, `009_pickup`, and `011_loyalty` pgTAP files. For behavior changes,
smoke-test normal payment, duplicate submission, unavailable stock, provider failure/retry, and reward use on Dev.
