# TsokoLitaw

TsokoLitaw is a responsive B2C e-commerce website for a Filipino dessert business.

Customers will be able to:

- browse products
- customize toppings
- place orders
- choose campus pickup
- pay through PayMongo
- track orders
- submit feedback

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth with Google
- PayMongo
- Vercel
- Domain: `tsokolitaw.com`

## Current Project Files

```text
TsokoLitaw/
├── AGENTS.md
├── ARCHITECTURE.md
├── DATABASE.md
├── DESIGN.md
├── README.md
├── REQUIREMENTS.md
└── TASKS.md
```

The Next.js app and additional folders should be created next.

## UI References

Create:

```text
references/
```

Then place the exported Figma PNG frames:

```text
references/
├── customer-home.png
├── customer-our-creations.png
├── customer-orders.png
├── customer-feedback.png
├── admin-dashboard.png
└── admin-order-management.png
```

These images are references only.

The AI should recreate them in Next.js + Tailwind.

## Assets

There are currently no finalized assets.

For UI development:

- use Lucide React for icons if needed
- use temporary local product placeholders
- use CSS or small SVG for simple decorations

Later, real assets can be added under:

```text
public/
├── brand/
├── icons/
└── images/
    └── products/
```

## Recommended Next.js Initialization

From inside the project folder:

```bash
npx create-next-app@latest .
```

Recommended answers:

```text
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src/ directory: Yes
App Router: Yes
Turbopack: Yes
Import alias: Yes
```

If the initializer refuses because the folder already contains files, create the app in a temporary folder and move the generated Next.js files into the project root without overwriting these Markdown files.

## Initial Source Structure

After Next.js initialization, target:

```text
src/
├── app/
├── components/
├── lib/
├── types/
└── utils/
```

Do not create every folder prematurely.

## Environment Variables

Later create:

```text
.env.local
.env.example
```

Typical variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYMONGO_SECRET_KEY=
PAYMONGO_PUBLIC_KEY=
PAYMONGO_WEBHOOK_SECRET=

NEXT_PUBLIC_SITE_URL=
```

Never commit real secrets.

## Current Development Stage

Current stage:

**Project documentation + Figma UI reference preparation**

Next:

1. Export Figma frames as PNG
2. Place them in `/references`
3. Initialize Next.js
4. Recreate UI with mock data
5. Review visual fidelity
6. Create Supabase project
7. Configure Google login
8. Implement database
9. Add PayMongo
10. Deploy to Vercel
