# TsokoLitaw — Requirements

## 1. Product Overview

TsokoLitaw is a mobile-first B2C storefront for a student-operated Filipino dessert business. It sells chocolate-filled Litaw in configurable boxes for campus pickup.

The product must eventually support browsing, customization, cart, checkout, online payment, order tracking, completed-order-linked reviews, promotions, loyalty, and administration.

## Decision Governance

`DECISIONS.md` is the rationale record for these requirements. Requirements define what must be true; the decision log explains why the workflow and UI were chosen.

Do not restore discarded rough-draft behavior—such as public Feedback, delivery addresses, outdated flavors, duplicate Order Now navigation, or Vlog-only content—without a new explicit product decision and synchronized documentation update.

Workflow changes must be reflected together in:

- customer requirements
- admin requirements and customer impact
- architecture/data flow
- proposed database constraints
- design behavior and states
- implementation tasks

## 2. Delivery Stages

### Current: UI-only

- Next.js, React, TypeScript, and Tailwind UI
- mock product, customer, order, and admin data
- temporary client-side component interactions
- frontend-only signed-in and signed-out preview state for protected account UI
- browser-local cart persistence
- static payment and account previews
- no secure or persistent backend behavior

### Deferred

- Supabase PostgreSQL
- Supabase Google authentication
- PayMongo
- APIs, webhooks, email, and real CRUD
- server authorization and validation
- admin subdomain configuration

UI labels must clearly distinguish mock or unavailable backend actions.

## 3. Technology

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- Lucide React
- Vercel

Future integrations:

- Supabase PostgreSQL and Auth
- Google Sign-In
- PayMongo
- `tsokolitaw.com`
- planned `admin.tsokolitaw.com`

## 4. Customer Navigation and Routes

Main navigation:

1. Home
2. Our Creations
3. Journal

Header actions:

- Account/Profile
- Cart with item-count badge

My Orders must exist inside Account/Profile, not in the main navigation. There is no public Feedback navigation.

Routes:

```text
/
/our-creations
/journal
/cart
/checkout
/login
/profile
/orders
/orders/[orderId]
/orders/[orderId]/review
/terms
/privacy
/payment/success
/payment/failed
```

Legacy `/vlog` and `/feedback` URLs may redirect to `/journal`.

## 5. Authentication and Account

Future V1 authentication:

- customer accounts required
- Google Sign-In through Supabase
- same sign-in flow for new and returning customers
- no guest checkout
- one admin role

Signed-out Account opens `/login`. Future signed-in Account opens a menu containing Profile, My Orders, and Log out.

Profile UI includes:

- name
- read-only Google email
- optional mobile number; Google email is the primary contact method
- loyalty progress
- recent-order/account shortcuts

Authentication and authorization must never rely on frontend state alone.

## 6. Product and Pricing

Temporary editable seed values:

- 4-piece box — ₱60
- 6-piece box — ₱85
- 8-piece box — ₱110
- first coating type included
- each additional coating type — ₱5
- extra sea salt cream — ₱18 per cup

Coatings:

- Cocoa
- Milk
- Palitaw: sugar, niyog, and sesame seeds
- Crushed Nuts
- Plain
- Sesame Seeds
- Cookies and Cream

Product photography should use the local coating images when available.

All prices must eventually be admin-editable and recalculated from database values on the server.

## 7. Product Customization

Customer flow:

1. Select 4-, 6-, or 8-piece box.
2. Choose single coating or mixed box.
3. For mixed boxes, allocate each piece to a coating.
4. Require allocated pieces to exactly equal the selected box size.
5. Charge ₱5 for each distinct coating type after the first.
6. Optionally add extra sea salt cream.
7. Select quantity.
8. Add configuration to cart.

Different configurations become separate cart line items. One order may contain multiple line items and must use one payment transaction.

## 8. Cart

Current frontend cart supports:

- add item
- remove item
- update quantity
- item count
- coating summary
- calculated subtotal
- browser-local persistence
- checkout navigation

The browser cart is a UI convenience only. Future checkout must reject manipulated prices, discounts, stock, and payment values.

## 9. Checkout and Pickup

Future checkout collects:

- full name
- Google account email
- optional mobile number
- pickup date
- pickup time
- pickup location
- optional notes
- Terms & Conditions acceptance

Campus pickup only.

Primary location:

- UCC North Congress Campus

Pickup dates and locations must be admin-controlled. Initial business rules:

- no same-day pickup
- minimum lead time: one day unless operations configure otherwise
- pickup grace period: 15 minutes
- no automatic refund for no-show
- availability continues until configured stock is exhausted

Before payment show order summary, discounts, total, pickup details, allergen notice, and cancellation/no-show notice.

## 10. Orders and Reviews

Customers can view:

- current orders
- order history
- order details
- fulfillment and payment status
- pickup details

Reviews:

- available only from an eligible completed order detail
- one review per completed order
- 1–5 stars and written comment
- authenticated customer only
- no unnecessary public personal data
- admin may hide spam, abusive, illegal, or invalid content

Selected order-linked reviews may appear as community highlights in the Journal.

## 11. Journal

Journal replaces Vlog and may contain:

- announcements
- kitchen stories
- product features
- customer stories
- selected order-linked reviews
- videos

Admin requires Journal management for draft/published content and featured review selection.

## 12. Payment

Use PayMongo only in a later approved phase.

```text
Checkout
→ Validate server-side
→ Create PENDING_PAYMENT order
→ Reserve stock
→ Create PayMongo checkout
→ Customer pays
→ Verify PayMongo webhook
→ Record payment
→ Confirm order
```

- initial payment expiry: 15 minutes, configurable
- success redirect is not proof of payment
- never store card details
- webhook handling must be idempotent

Order statuses:

```text
PENDING_PAYMENT, PAID, CONFIRMED, PREPARING,
READY_FOR_PICKUP, COMPLETED, CANCELLED, EXPIRED
```

Payment statuses:

```text
PENDING, PAID, FAILED, REFUNDED
```

Keep fulfillment and payment state separate.

## 13. Inventory

Future inventory supports:

- daily stock by box variant
- reserved, sold, and available quantities
- coating and add-on availability
- pickup date availability
- sold-out UI
- reservation during pending payment
- release after expiry
- atomic updates to prevent overselling

## 14. Promotions and Loyalty

Initial promotion idea:

- buy two boxes and receive two extra pieces

Promotion rules must be configurable and validated server-side.

Initial loyalty rule:

- every seven completed orders earns a free 4-piece box

Cancelled, expired, unpaid, or failed orders do not count. Prevent duplicate rewards and redemption.

## 15. Admin

Admin pages:

- Dashboard
- Orders
- Products
- Inventory
- Pickup
- Promotions
- Customers
- Reviews
- Journal
- Settings

Admin may eventually manage boxes, PHP prices, coatings, add-ons, product images, stock, pickup schedules and locations, promotions, loyalty, orders, reviews, Journal posts, and operational settings.

The TsokoLitaw brand/store name is fixed and must not appear as an editable setting. Never expose infrastructure secrets in admin UI.

Admin currently lives under `/admin`. A future `admin.tsokolitaw.com` mapping must still enforce server-side authorization.

## 16. Terms, Privacy, and Allergens

Terms and Privacy links must appear in the footer and checkout.

Final Terms must cover ordering, pricing, availability, payment, pickup, late/no-show behavior, cancellation, refunds, food handling, allergens, data processing, and customer responsibilities.

Potential allergens include peanuts, dairy, coconut, sesame, chocolate ingredients, and cookie ingredients. Final wording must match the actual recipe and business policy.

## 17. Responsive and Accessible UI

- mobile-first
- desktop and tablet support
- semantic HTML and landmarks
- explicit labels
- keyboard-operable custom controls
- visible focus states
- accessible contrast
- meaningful alt text
- touch-friendly targets
- responsive tables
- no unintended horizontal overflow

## 18. Security Requirements

When backend work begins:

- protect customer and admin data with RLS
- verify admin authorization server-side
- prevent cross-customer order access
- validate every mutation and transition
- calculate prices, promotions, and stock server-side
- verify PayMongo signatures and event uniqueness
- avoid duplicate checkout submissions
- never log or expose secrets
- preserve order-item snapshots
