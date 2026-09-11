# Checkout execution path

Start at `src/app/checkout/page.tsx`: require the customer, load pickup availability and loyalty,
then render `src/components/checkout/checkout-content.tsx`.

1. **Browser:** selected cart lines, customer details, date/window/location, optional reward, Terms
   acceptance. A checkout UUID is retained for retry; browser totals and remaining-stock labels are guidance.
2. **Action:** `src/app/checkout/actions.ts` authenticates, validates bounded IDs/counts/text, and
   applies the distributed user/IP rate limit. The user ID comes from the verified profile, not input.
3. **Server:** `server-checkout.ts` reloads the live catalog through `server-commerce.ts`, runs
   `commerce.ts:priceCheckoutCart`, reads current Terms, and constructs trusted priced snapshots.
4. **Transaction:** `create_checkout_order` in the pre-v1 baseline locks/rechecks the account,
   pickup, inventory and reward. It inserts snapshots and pins the payment method in one transaction,
   or returns the existing order for the same owner/idempotency key. Contact is email-only.
5. **Payment:** Manual GCash stores the server-total QR and routes to the owned receipt page.
   PayMongo prepares/resumes its unique hosted checkout with the existing provider idempotency key.
   Zero-total loyalty settles without external payment. See [payments](payments.md).
6. **Verified result:** the [PayMongo webhook](payments.md) matches signed provider evidence to the
   stored order and amount, then commits the paid transition. Return URLs only read persisted state.
7. **Email:** a database trigger queues the confirmation. `server-notifications.ts` attempts dispatch;
   retry processing is independent of payment success.

## Files to change

- Pickup/customer state, validation feedback, submit/retry orchestration: `checkout-content.tsx`.
- Receipt mapping/layout: `checkout-order-summary.tsx`; shared item rendering: `orders/order-line-items.tsx`.
- Cart persistence/selected lines: `cart-provider.tsx`. After the atomic writer returns a saved order,
  the browser removes only those checked-out lines immediately. The order then lives in My Orders;
  cancellation or expiry does not copy old lines back into the cart. Other cart lines remain untouched.
  Hydration removes lines tied to the retired pending-checkout storage markers so deleted pre-release
  test orders cannot leave unusable cart cards.
- Pickup definitions/eligibility: [inventory guide](inventory.md); never authorize stock from cached availability.
- Input limits and user-facing server errors: `checkout/actions.ts`, with server/SQL limits kept consistent.

A failed provider call can leave a saved pending order. The customer is sent to that saved order,
which remains available in My Orders. Reuse its identity/payment rather than creating another order
or releasing stock blindly. Browser cancellation of payment is not order cancellation.

Tests: `commerce.test.ts`, checkout summary tests, PayMongo contract/mode/webhook tests, local
`002_payments`, `008_inventory`, `009_pickup`, and `011_loyalty` pgTAP files. For behavior changes,
smoke-test normal payment, duplicate submission, unavailable stock, provider failure/retry, and reward use on Dev.
