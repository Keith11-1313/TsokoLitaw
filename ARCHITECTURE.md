# TsokoLitaw — Architecture

## 1. Goal

Build a maintainable B2C e-commerce application using one Next.js codebase.

Avoid microservices in V1.

---

## 2. High-Level Architecture

```text
Customer / Admin Browser
          |
          v
Next.js App on Vercel
          |
    +-----+------+
    |            |
    v            v
Supabase      PayMongo
Postgres      Payments
Auth
Storage
```

---

## 3. Frontend

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS

Prefer Server Components.

Use Client Components only when actual client interactivity is required.

Examples:

- cart state
- product customization
- modals
- interactive forms
- client-side filters

---

## 4. Backend

Use Next.js server-side capabilities:

- Route Handlers
- Server Actions where appropriate
- Server Components
- server-only utility modules

Server responsibilities:

- price validation
- stock validation
- order creation
- promotion calculation
- loyalty calculation
- admin authorization
- PayMongo checkout creation
- PayMongo webhook processing
- terms acceptance recording

---

## 5. Supabase

Use Supabase for:

- PostgreSQL
- Google authentication
- session handling
- optional product image storage

Use separate client patterns:

```text
Browser client
Server client
Service/admin client
```

Never expose service-role credentials to the browser.

---

## 6. Authentication

```text
Google Sign-In
      |
      v
Supabase Auth
      |
      v
Authenticated User
```

Admin authorization must be server-side.

---

## 7. UI Reference Layer

Reference PNGs live in:

```text
references/
```

Expected files:

```text
customer-home.png
customer-our-creations.png
customer-orders.png
customer-feedback.png
admin-dashboard.png
admin-order-management.png
```

These are visual references only.

They are not runtime page assets.

The real UI must be implemented under `src/`.

---

## 8. UI Assets

The project currently has no finalized asset library.

For missing simple icons, use a reputable open-source icon library such as:

- Lucide React

Prefer using the library consistently instead of mixing multiple icon packs.

For product photography:

- use temporary placeholders during UI build
- replace with real product photos later

For simple decorative shapes:

- use CSS or small inline SVG where appropriate

Do not depend on premium design assets.

---

## 9. Payments

Use PayMongo only.

```text
Cart
  |
  v
Checkout validation
  |
  v
Create PENDING_PAYMENT order
  |
  v
Reserve stock
  |
  v
Create PayMongo checkout/payment
  |
  v
Customer pays
  |
  v
PayMongo webhook
  |
  v
Verify webhook
  |
  v
Update payment
  |
  v
Confirm order
```

A browser redirect is not proof of payment.

---

## 10. Payment Expiry

Initial timeout:

- 15 minutes

Flow:

```text
PENDING_PAYMENT
      |
      v
EXPIRED
      |
      v
Release reserved stock
```

Use the simplest reliable V1 implementation.

---

## 11. Order and Payment Separation

Order status = fulfillment/business state.

Payment status = financial state.

Do not combine them.

---

## 12. Inventory

Recommended V1 model:

- daily stock total
- reserved quantity
- sold quantity
- available quantity

Use database-safe operations to reduce overselling.

---

## 13. Pickup

Admin controls:

- open pickup dates
- pickup locations
- lead time
- grace period

No fixed order-per-slot limit in current rules.

---

## 14. Promotions

Use configurable promotion records.

Possible V1 type:

- `BUY_X_BOXES_GET_Y_PIECES`

Do not build a generic enterprise promotion engine.

---

## 15. Loyalty

```text
Order COMPLETED
      |
      v
Increase loyalty progress
      |
      v
Threshold reached
      |
      v
Create reward
      |
      v
Redeem reward
```

---

## 16. Feedback

Feedback should belong to:

- authenticated user
- preferably a completed order

Admin can hide invalid content.

---

## 17. Suggested Source Structure

```text
src/
├── app/
│   ├── (customer)/
│   ├── checkout/
│   ├── login/
│   ├── payment/
│   ├── admin/
│   ├── api/
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── products/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── feedback/
│   └── admin/
│
├── lib/
│   ├── auth/
│   ├── supabase/
│   ├── paymongo/
│   ├── orders/
│   ├── inventory/
│   ├── promotions/
│   ├── loyalty/
│   └── validation/
│
├── types/
└── utils/
```

---

## 18. Environment Variables

Expected:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
PAYMONGO_WEBHOOK_SECRET=

NEXT_PUBLIC_SITE_URL=
```

Never commit `.env.local`.

---

## 19. Deployment

- Next.js → Vercel
- Supabase → database/auth/storage
- PayMongo → payments
- Domain → `tsokolitaw.com`

Use test PayMongo keys before live mode.

---

## 20. Principles

1. Keep business logic out of presentation components.
2. Server-authoritative pricing.
3. Server-authoritative payment state.
4. Use RLS and database constraints.
5. Keep operational values configurable.
6. Avoid unnecessary dependencies.
7. Preserve historical order snapshots.
8. Protect admin operations server-side.
9. Keep V1 simple.
