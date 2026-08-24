# TsokoLitaw — Requirements

## 1. Project Overview

TsokoLitaw is a responsive B2C e-commerce website for a student-operated Filipino dessert business.

Customers should be able to:

- Browse TsokoLitaw products
- Choose box size
- Choose toppings
- Add paid add-ons
- Add items to cart
- Select pickup date, time, and location
- Pay online through PayMongo
- Track order status
- Submit feedback
- Earn loyalty rewards
- View promotions

The website should work well on desktop, tablet, and mobile.

---

## 2. Technology Stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Google Sign-In
- PayMongo
- Vercel
- Domain: `tsokolitaw.com`

Use libraries only when they provide clear value.

For missing icons or simple UI graphics, prefer a reputable icon library such as:

- Lucide React
- Heroicons

Do not invent or depend on paid assets.

---

## 3. Authentication

Customer accounts are required.

Initial authentication:

- Google Sign-In only
- Supabase Auth

No guest checkout in V1.

Admin model:

- One admin role only

Admin authorization must always be checked server-side.

---

## 4. Public Navigation

Main customer pages:

1. Home
2. Our Creations
3. Orders
4. Feedback

Additional pages:

- Login
- Checkout
- Terms & Conditions
- Privacy
- Payment success
- Payment failed
- Order details

---

## 5. Figma UI References

The project uses exported Figma PNG files as visual references.

Expected files:

```text
references/
├── customer-home.png
├── customer-our-creations.png
├── customer-orders.png
├── customer-feedback.png
├── admin-dashboard.png
└── admin-order-management.png
```

These references are the visual source of truth.

Do not embed them as the actual webpage.

The implementation must recreate them using:

- semantic HTML
- Next.js components
- Tailwind CSS
- reusable React components

For missing pages, extend the same visual language instead of creating a different style.

---

## 6. Products

Initial editable seed values:

- 4-piece box — ₱60
- 6-piece box — ₱85
- 8-piece box — ₱110

These are temporary values and must be editable in the admin dashboard.

Each configured order item includes:

- 1 free topping
- 1 sea salt cream sauce

Initial topping options:

- Grated coconut
- Toasted sesame seeds
- Crushed peanuts
- Cookie crumbs
- Chocolate sprinkles
- Cocoa powder
- Powdered milk

Additional toppings:

- Initial price: ₱5 each
- Must be admin-editable

Extra sea salt cream:

- Included sauce: 1
- Additional sauce available as paid add-on
- Price must be admin-editable

---

## 7. Product Customization

Customer flow:

1. Select box size
2. Select one free topping
3. Optionally select extra paid toppings
4. Optionally add extra sea salt cream
5. Select quantity
6. Add configured item to cart

Different configurations should become separate line items inside a single order.

Do not force separate PayMongo transactions for different variants.

---

## 8. Cart

Customers should be able to:

- Add items
- Remove items
- Change quantity
- Review toppings
- Review add-ons
- See subtotal
- See promotion effects
- See final total
- Continue shopping
- Proceed to checkout

Server-side pricing is authoritative.

Never trust browser-submitted:

- prices
- discounts
- stock
- payment state

---

## 9. Checkout

Collect:

- Full name
- Email
- Mobile number
- Pickup date
- Pickup time
- Pickup location
- Optional notes

Require Terms & Conditions acceptance.

Store:

- user ID
- order ID
- terms version
- acceptance timestamp

Show before payment:

- item summary
- toppings
- add-ons
- discounts
- total
- pickup details
- allergen warning
- cancellation/no-show notice

---

## 10. Pickup Rules

Primary area:

- UCC North Congress Campus

Pickup dates should be admin-controlled and usually opened only on face-to-face class days.

Pickup locations must be admin-configurable.

Initial examples:

- Social Hall
- Court
- Isles
- Floor/location options

Rules:

- No same-day pickup
- Minimum lead time: 1 day
- Pickup grace period: 15 minutes
- No-show: no automatic refund

There is no fixed maximum number of orders per pickup time slot in the current business rules.

The business primarily operates until stocks last.

---

## 11. Inventory

Support:

- Daily stock
- Product availability
- Variant availability
- Topping availability
- Add-on availability
- Pickup date availability

Once applicable stock reaches zero, ordering should be blocked.

Stock reservation should happen during pending payment.

Reserved stock should be released after payment expiry where appropriate.

---

## 12. PayMongo

Use PayMongo only.

Flow:

```text
Checkout
→ Create PENDING_PAYMENT order
→ Reserve stock
→ Create PayMongo checkout/payment
→ Customer pays
→ PayMongo webhook
→ Verify webhook
→ Update payment
→ Confirm order
```

Pending payment timeout:

- 15 minutes initially
- Must be configurable

A success redirect is not authoritative proof of payment.

---

## 13. Order Statuses

Order statuses:

- `PENDING_PAYMENT`
- `PAID`
- `CONFIRMED`
- `PREPARING`
- `READY_FOR_PICKUP`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`

Payment statuses:

- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED`

Keep order and payment status separate.

---

## 14. Cancellation and Refunds

Customers may self-cancel before:

- `PREPARING`

No self-cancellation after:

- `PREPARING`
- `READY_FOR_PICKUP`
- `COMPLETED`

Refunds should initially be handled through customer service.

Exact refund conditions remain a business-policy item before production launch.

No-show:

- No automatic refund

---

## 15. Promotions

Initial launch idea:

- Buy 2 boxes
- Receive 2 extra TsokoLitaw pieces free

Promotion rules must be configurable.

Do not hardcode them into page components.

---

## 16. Loyalty

Initial loyalty rule:

- Every 7 completed orders
- Customer earns a free 4-piece reward

Only completed orders count.

The following should not count:

- cancelled
- expired
- unpaid
- failed

Prevent double redemption.

---

## 17. Feedback

Requirements:

- Authenticated customer only
- Prefer completed-order verification
- 1–5 stars
- Written comment
- No routine pre-approval
- Admin may hide spam, abusive, illegal, or invalid content

Public feedback should not expose unnecessary personal information.

---

## 18. Notifications

V1:

- Website order status
- Email notifications

Possible email events:

- Payment successful
- Order confirmed
- Preparing
- Ready for pickup
- Completed
- Cancellation/refund information

The business already has a Google account.

The initial operational email can use that account.

A custom-domain email can be added later.

---

## 19. Admin

One admin role.

Admin can manage:

- Products
- Prices
- Images
- Toppings
- Add-ons
- Stock
- Pickup dates
- Pickup locations
- Promotions
- Loyalty settings
- Orders
- Feedback
- Business settings

Do not expose infrastructure secrets in admin settings.

---

## 20. Admin Dashboard

Show:

- Today's orders
- Pending
- Preparing
- Ready for pickup
- Completed
- Revenue
- Recent orders
- Average rating
- Remaining stock
- Upcoming pickup orders

---

## 21. Terms & Privacy

Create:

- Terms & Conditions
- Privacy page

Terms should eventually cover:

- ordering
- availability
- pricing
- payment
- pickup
- late pickup
- no-show
- cancellation
- refunds
- food handling
- allergens
- customer responsibilities
- data processing
- contact information

Do not invent unresolved legal/business rules.

---

## 22. Allergen Warning

Show a clear allergen notice.

Potential allergens may include:

- peanuts
- dairy
- coconut
- sesame
- chocolate ingredients
- other topping ingredients

Final wording must match the actual recipe.

---

## 23. Responsive and Accessible UI

Support:

- Desktop
- Tablet
- Mobile

Use:

- semantic HTML
- proper labels
- keyboard navigation
- visible focus states
- accessible contrast
- meaningful alt text

Avoid horizontal overflow.

---

## 24. Security

- Never expose secret keys
- Validate server input
- Verify authorization server-side
- Verify PayMongo webhooks
- Never trust frontend pricing
- Never trust frontend payment state
- Protect admin routes
- Prevent cross-user order access
- Avoid duplicate checkout/payment submissions
- Avoid logging secrets

---

## 25. Editable Operational Data

Keep operational values in the database.

Examples:

- product prices
- topping prices
- add-on prices
- stock
- pickup dates
- pickup locations
- availability
- promotions
- loyalty threshold
- grace period
- payment expiry
- support email

Do not hardcode values that the admin may need to change.

---

## 26. V1 Scope

V1 should prioritize:

- Google authentication
- Product browsing
- Product customization
- Cart
- Checkout
- Pickup scheduling
- PayMongo
- Order tracking
- Admin management
- Feedback
- Promotions
- Loyalty
- Terms/privacy
- Responsive UI
