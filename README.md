# TsokoLitaw

TsokoLitaw is a mobile-first storefront and administration interface for a Filipino chocolate-filled Litaw business operating through campus pickup.

## Decision Record

[`DECISIONS.md`](DECISIONS.md) explains the product, workflow, UI, and architecture decisions made during review. It records why navigation was simplified, why products are modeled as boxes and coatings, why reviews are order-linked, why Vlog became Journal, how Admin relates to Customer, and what remains intentionally unconnected.

Read it before changing established workflows. The rough PNG references do not override these approved decisions.

## Current Status

The project is in the **UI-only phase**.

Implemented with mock data:

- responsive customer and admin interfaces
- product catalog with real coating photography
- mobile-first Home carousel with supplied promotional photo, muted-autoplay video, sound control, and automatic image advancement
- 4-, 6-, and 8-piece box configuration
- single-coating and mixed-box selection
- browser-local cart with quantity and totals
- static checkout, account, profile, order, review, payment, and legal screens
- frontend-only signed-in and signed-out preview state for testing protected account screens
- Journal for announcements, stories, product features, and community highlights
- responsive admin dashboard and management screens
- admin purpose/customer-impact/connection guidance on every management area
- Admin coating-entry session preview with square-image validation and PHP additional-type pricing

Not implemented:

- Supabase or any database
- Google authentication
- PayMongo
- APIs, webhooks, email, or real CRUD
- server-authoritative pricing and inventory
- admin authorization or admin subdomain routing

All current customer, order, payment, account, and admin data is mock data. Disabled actions identify features that require future backend work.

Customer Catalog and Checkout currently share their mock commerce and pickup constants with the matching admin screens. This keeps the UI previews aligned, but admin controls do not persist changes until a database and server mutations are implemented.

The Admin Catalog can temporarily add a coating preview with name, description, a 1:1 image, and additional-type price. The preview exists only in the current page session and is not published to Our Creations.

The account preview starts signed in so Profile and My Orders can be reviewed. Logging out stores a frontend-only signed-out state and redirects protected account pages to Login. Login can restore the preview state; this does not authenticate or create an account.

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
AGENTS.md
ARCHITECTURE.md
DATABASE.md
DECISIONS.md
DESIGN.md
README.md
REQUIREMENTS.md
TASKS.md

public/
├── brand/
├── images/
│   ├── home/
│   └── products/coatings/
└── videos/home/

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
- Supplied Home promotional media is stored in `public/images/home/` and `public/videos/home/`.
- PNG files in `references/` are retained as early visual direction and project history.
- References must not be embedded as pages and are no longer pixel-perfect implementation requirements.
- The implemented design system and approved product decisions take precedence over rough reference details.

## Deployment

The public GitHub repository can be connected to Vercel during UI development. The current static/mock UI does not require Supabase or PayMongo environment variables.

Do not add production secrets until the corresponding backend integration begins. Never commit `.env.local`.

## Git Workflow

The user performs Git operations manually. Agents must report completion, validation results, changed files, and a suggested Conventional Commit message. Agents must not stage, commit, or push.
