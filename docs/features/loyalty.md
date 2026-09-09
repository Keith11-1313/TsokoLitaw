# Loyalty

Seven completed orders earn a free 4-piece reward. The current threshold comes from
`business_settings`; there is no generic Admin Settings UI for changing it.

`transition_order_status` → order completion trigger → `sync_completed_order_loyalty` locks the
loyalty account, counts the completion once, and creates the threshold reward. Cancelled, expired,
unpaid, or failed orders do not earn progress.

`server-loyalty.ts` loads the signed-in customer's progress/rewards for Profile and Checkout.
`server-customers.ts` reads the Admin account summary RPC, including customer and Admin profiles
with real activity and zero-activity accounts.

Checkout submits an optional reward ID. `server-checkout.ts` calculates the eligible base discount;
the current `create_pending_order` SQL locks/verifies the earned reward, binds it to one order,
and prevents reuse. It covers one eligible 4-piece **base** box price; all coating/add-on charges
remain payable. Cancellation/expiry restores a pending redemption. A zero-total result is recorded
as a paid `loyalty` settlement and confirmed without a PayMongo session.

Change display in Profile/Checkout/Admin Customers. Change earning/redemption rules only with the
server pricing contract, SQL triggers/writer, snapshots, and tests considered together. Do not
implement an application-side reward read followed by a separate redemption update.

Definitions: initial migration for earning; `20260904030000_inline_loyalty_order_writer.sql` for
checkout. Tests: `011_loyalty.test.sql`, `010_customers.test.sql`, `commerce.test.ts`,
and payment/cancellation integration tests. See [database](../architecture/database.md).
