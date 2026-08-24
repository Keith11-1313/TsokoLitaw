# TsokoLitaw

TsokoLitaw is a mobile-first storefront and administration interface for a Filipino chocolate-filled Litaw business operating through campus pickup.

## Current Status

The project is in the **UI-only phase**.

Implemented with mock data:

- responsive customer and admin interfaces
- product catalog with real coating photography
- 4-, 6-, and 8-piece box configuration
- single-coating and mixed-box selection
- browser-local cart with quantity and totals
- static checkout, account, profile, order, review, payment, and legal screens
- Journal for announcements, stories, product features, and community highlights
- responsive admin dashboard and management screens

Not implemented:

- Supabase or any database
- Google authentication
- PayMongo
- APIs, webhooks, email, or real CRUD
- server-authoritative pricing and inventory
- admin authorization or admin subdomain routing

All current customer, order, payment, account, and admin data is mock data. Disabled actions identify features that require future backend work.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript 5 in strict mode
- Tailwind CSS 4
- ESLint 9
- Lucide React
- Next.js fonts and image optimization

Future services:

- Supabase PostgreSQL and Google authentication
- PayMongo payments
- Vercel hosting
- `tsokolitaw.com`
- planned admin host: `admin.tsokolitaw.com`

## Customer Routes

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

Compatibility redirects currently remain at `/vlog` and `/feedback`.

The main navigation contains Home, Our Creations, and Journal. My Orders is account-scoped and is available from the Account menu and Profile—not the main navbar.

## Admin Routes

```text
/admin
/admin/orders
/admin/products
/admin/inventory
/admin/pickup
/admin/promotions
/admin/customers
/admin/reviews
/admin/journal
/admin/settings
```

Admin pages remain under `/admin` until subdomain routing, authentication, and server authorization are implemented. Compatibility redirects remain for older admin URLs.

## Current Product Model

Temporary UI prices:

- Box of 4 — ₱60
- Box of 6 — ₱85
- Box of 8 — ₱110
- First coating type included
- Each additional coating type — ₱5
- Extra sea salt cream — ₱18 per cup

Coatings:

- Cocoa
- Milk
- Palitaw: sugar, niyog, and sesame seeds
- Crushed Nuts
- Plain
- Sesame Seeds
- Cookies and Cream

Mixed boxes allocate every piece to a coating. The allocated piece count must equal the selected box size.

These browser values are previews. Future checkout pricing must be recalculated from database values on the server.

## Project Structure

```text
public/
├── brand/
└── images/products/coatings/

src/
├── app/                 # App Router pages
├── components/
│   ├── admin/
│   ├── cart/
│   ├── checkout/
│   ├── creations/
│   ├── customer/
│   ├── feedback/       # Order-linked review UI
│   ├── home/
│   ├── layout/
│   ├── orders/
│   └── ui/
├── lib/                 # Mock commerce and order data
└── types/
```

## Local Development

Install dependencies once:

```bash
npm install
```

Start development:

```bash
npm run dev
```

If port 3000 is already occupied by this project, Next.js may report the existing server or select another port. Stop the earlier terminal process before starting a second development server.

Validation:

```bash
npm run lint
npm run typecheck
npm run build
```

## Assets and References

- The current logo is stored in `public/brand/logo.png` and is also used for the favicon.
- Product photos are stored in `public/images/products/coatings/`.
- PNG files in `references/` are retained as early visual direction and project history.
- References must not be embedded as pages and are no longer pixel-perfect implementation requirements.
- The implemented design system and approved product decisions take precedence over rough reference details.

## Deployment

The public GitHub repository can be connected to Vercel during UI development. The current static/mock UI does not require Supabase or PayMongo environment variables.

Do not add production secrets until the corresponding backend integration begins. Never commit `.env.local`.

## Git Workflow

The user performs Git operations manually. Agents must report completion, validation results, changed files, and a suggested Conventional Commit message. Agents must not stage, commit, or push.
