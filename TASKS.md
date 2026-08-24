# TsokoLitaw — Development Tasks

## Phase 0 — Project Foundation

- [ ] Initialize Next.js
- [ ] Enable TypeScript
- [ ] Enable Tailwind CSS
- [ ] Enable ESLint
- [ ] Use App Router
- [ ] Initialize Git
- [ ] Add `.env.local`
- [ ] Add `.env.example`
- [ ] Confirm `.env.local` is ignored
- [ ] Keep documentation in project root

---

## Phase 1 — Add UI References

Create:

```text
references/
```

Add:

- [ ] `customer-home.png`
- [ ] `customer-our-creations.png`
- [ ] `customer-orders.png`
- [ ] `customer-feedback.png`
- [ ] `admin-dashboard.png`
- [ ] `admin-order-management.png`

Then:

- [ ] Inspect all references
- [ ] Identify customer design system
- [ ] Identify admin design system
- [ ] Extract common colors
- [ ] Extract typography
- [ ] Extract spacing
- [ ] Extract border radius
- [ ] Identify repeated components

---

## Phase 2 — UI Foundation

- [ ] Install one icon library if needed
- [ ] Prefer Lucide React
- [ ] Create customer header
- [ ] Create customer footer
- [ ] Create admin sidebar
- [ ] Create shared buttons
- [ ] Create cards
- [ ] Create form controls
- [ ] Create status badge
- [ ] Create responsive layout primitives

Use mock data only.

No Supabase or PayMongo yet.

---

## Phase 3 — Reference Pages

Customer:

- [ ] Home
- [ ] Our Creations
- [ ] Orders
- [ ] Feedback

Admin:

- [ ] Dashboard
- [ ] Order Management

After each:

- [ ] Compare against PNG reference
- [ ] Fix spacing
- [ ] Fix alignment
- [ ] Fix sizing
- [ ] Fix typography
- [ ] Check tablet/mobile
- [ ] Run lint/typecheck

---

## Phase 4 — Missing Static Pages

Extend existing design language.

- [ ] Login
- [ ] Checkout shell
- [ ] Terms
- [ ] Privacy
- [ ] Payment success
- [ ] Payment failed
- [ ] Order detail shell
- [ ] Admin Products shell
- [ ] Admin Inventory shell
- [ ] Admin Pickup shell
- [ ] Admin Promotions shell
- [ ] Admin Feedback shell
- [ ] Admin Settings shell

Still use mock data.

---

## Phase 5 — Supabase Setup

- [ ] Create Supabase project
- [ ] Add env variables
- [ ] Create browser client
- [ ] Create server client
- [ ] Add migrations
- [ ] Enable RLS
- [ ] Add indexes/constraints
- [ ] Add seed data

---

## Phase 6 — Google Authentication

- [ ] Configure Google OAuth
- [ ] Configure Supabase Google provider
- [ ] Implement login
- [ ] Implement logout
- [ ] Create/update profile
- [ ] Protect checkout
- [ ] Configure admin identity
- [ ] Protect admin routes
- [ ] Test unauthorized access

---

## Phase 7 — Product Data

- [ ] Load products
- [ ] Load variants
- [ ] Load toppings
- [ ] Load add-ons
- [ ] Load availability
- [ ] Replace mock data

---

## Phase 8 — Product Customization

- [ ] Select box size
- [ ] One free topping
- [ ] Paid extra toppings
- [ ] Extra sauce
- [ ] Quantity
- [ ] Item total
- [ ] Validation
- [ ] Add to cart

---

## Phase 9 — Cart

- [ ] Add item
- [ ] Remove item
- [ ] Update quantity
- [ ] Display toppings
- [ ] Display add-ons
- [ ] Display subtotal
- [ ] Support multiple line items
- [ ] Persist cart
- [ ] Clear after success

---

## Phase 10 — Pickup

Admin:

- [ ] Manage pickup dates
- [ ] Manage pickup locations
- [ ] Configure lead days
- [ ] Configure grace period

Customer:

- [ ] Show valid dates
- [ ] Prevent same-day pickup
- [ ] Show locations
- [ ] Capture time
- [ ] Validate server-side

---

## Phase 11 — Inventory

- [ ] Daily inventory
- [ ] Admin stock entry
- [ ] Sold-out state
- [ ] Validate before checkout
- [ ] Reserve stock
- [ ] Release expired stock
- [ ] Convert reserved to sold after payment
- [ ] Test concurrent checkout

---

## Phase 12 — Checkout

- [ ] Require login
- [ ] Prefill profile
- [ ] Capture mobile
- [ ] Capture pickup
- [ ] Capture notes
- [ ] Show order summary
- [ ] Show allergen warning
- [ ] Require terms acceptance
- [ ] Validate price server-side
- [ ] Validate stock server-side
- [ ] Validate promotion server-side
- [ ] Create snapshots
- [ ] Generate order number

---

## Phase 13 — PayMongo Test Mode

- [ ] Add test env variables
- [ ] Create server-only PayMongo helper
- [ ] Create checkout/payment
- [ ] Store provider reference
- [ ] Redirect customer
- [ ] Success page
- [ ] Failure page
- [ ] Webhook endpoint
- [ ] Verify webhook
- [ ] Add idempotency
- [ ] Update payment
- [ ] Confirm order
- [ ] Handle failed payment
- [ ] Handle 15-minute expiry

---

## Phase 14 — Orders

Customer:

- [ ] Current orders
- [ ] Order history
- [ ] Order details
- [ ] Status
- [ ] Payment status
- [ ] Pickup details
- [ ] Cancellation before PREPARING

Admin:

- [ ] Order list
- [ ] Search
- [ ] Filters
- [ ] Details
- [ ] Status update
- [ ] Prevent invalid transitions

---

## Phase 15 — Feedback

- [ ] 1–5 stars
- [ ] Written comment
- [ ] Authenticated only
- [ ] Completed-order validation
- [ ] Prevent duplicate review
- [ ] Show public reviews
- [ ] Average rating
- [ ] Admin hide control

---

## Phase 16 — Promotions

- [ ] Promotion config
- [ ] Admin enable/disable
- [ ] Buy 2 boxes → free pieces
- [ ] Display promo
- [ ] Validate server-side
- [ ] Save order effect

---

## Phase 17 — Loyalty

- [ ] Count completed orders
- [ ] Threshold 7
- [ ] Create reward
- [ ] Show progress
- [ ] Redeem reward
- [ ] Prevent duplicate redemption
- [ ] Continue/reset progression properly

---

## Phase 18 — Admin Management

- [ ] Product management
- [ ] Variant price management
- [ ] Topping management
- [ ] Add-on management
- [ ] Inventory
- [ ] Pickup
- [ ] Promotions
- [ ] Loyalty
- [ ] Feedback
- [ ] Settings

---

## Phase 19 — Email

- [ ] Decide sending provider
- [ ] Use business Google account operationally
- [ ] Order confirmation email
- [ ] Ready-for-pickup email
- [ ] Cancellation/refund communication
- [ ] Server-side sending only

---

## Phase 20 — Security Review

- [ ] RLS review
- [ ] Admin authorization
- [ ] Cross-user access tests
- [ ] Price tampering tests
- [ ] Stock tampering tests
- [ ] Webhook spoofing tests
- [ ] Duplicate checkout tests
- [ ] Secret exposure review
- [ ] Logging review
- [ ] Rate limiting where needed

---

## Phase 21 — Responsive / Accessibility QA

- [ ] Keyboard navigation
- [ ] Focus states
- [ ] Labels
- [ ] Contrast
- [ ] Alt text
- [ ] Mobile checkout
- [ ] Mobile product customization
- [ ] Mobile navigation
- [ ] Tablet
- [ ] Desktop
- [ ] No unintended horizontal scroll

---

## Phase 22 — Production

- [ ] Deploy to Vercel
- [ ] Add production env vars
- [ ] Connect `tsokolitaw.com`
- [ ] Verify HTTPS
- [ ] Configure production Supabase URLs
- [ ] Configure Google OAuth URLs
- [ ] Configure PayMongo production webhook
- [ ] Switch to live keys after testing
- [ ] Smoke test
- [ ] Verify final prices
- [ ] Verify pickup configuration
- [ ] Verify Terms/Privacy
