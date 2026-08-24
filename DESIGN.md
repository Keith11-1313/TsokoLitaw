# TsokoLitaw — Design System

## 1. Current Source of Truth

The implemented customer and admin design systems are the current UI source of truth.

The PNG files in `references/` are rough early drafts. Use them for broad visual context only. Do not embed them, trace them pixel by pixel, or restore outdated navigation and product decisions from them.

Priority order:

1. Current approved product and navigation decisions
2. Existing reusable UI components and tokens
3. Responsive and accessibility requirements
4. Rough reference PNGs

The reasons behind established behavior are recorded in `DECISIONS.md`.

## Workflow-Driven UI Rationale

UI structure must communicate the real workflow rather than merely resemble a draft image.

| UI choice | Workflow reason |
| --- | --- |
| Our Creations is the shopping entry | It owns product discovery and box configuration |
| Cart is a separate header action | It owns line-item editing and the transition to Checkout |
| My Orders is inside Account | It is private customer activity, not public navigation |
| Mobile builder appears before coatings | Customers need configuration context before scanning all choices |
| Mixed-box counters are on coating cards | Allocation happens piece by piece against visible coating options |
| Terms and Privacy are in Footer and Checkout | They remain accessible and appear where acceptance matters |
| Reviews begin on completed order details | Review eligibility is tied to a specific fulfilled order |
| Journal replaces Vlog | Announcements and stories are not always videos |
| Admin pages show purpose and connection | Mock controls must not imply a live customer change |

When visual polish conflicts with workflow clarity, preserve the workflow and adjust the presentation around it.

## 2. Customer Design Language

The storefront should feel warm, appetizing, calm, and recognizably Filipino.

Use:

- cream page backgrounds
- white-cream elevated surfaces
- chocolate-brown text and actions
- serif display headings
- script typography as restrained decorative emphasis
- soft borders and rounded cards
- clear product photography
- generous but consistent whitespace
- mobile-first stacking

The main customer navigation is:

- Home
- Our Creations
- Journal

Account/Profile and Cart are actions. My Orders belongs inside the account experience and must not appear as a main navigation item.

Journal includes announcements, kitchen stories, product features, customer stories, selected reviews, and optional video—not video alone.

## 3. Admin Design Language

Admin pages reuse the same core tokens with a denser operational layout:

- persistent desktop sidebar
- drawer navigation on mobile
- consistent page title and action area
- metric cards
- bordered tables and cards
- reusable status badges
- responsive table containers
- cream form controls

Do not create a separate visual identity for each admin page.

## 4. Design Tokens

Tokens live in `src/app/globals.css`.

### Colors

| Token | Value | Purpose |
| --- | --- | --- |
| `background` | `#faf5ee` | Page background |
| `surface` | `#fffdf9` | Cards and navigation |
| `surface-muted` | `#f5ece3` | Soft highlights |
| `surface-control` | `#faf1e6` | Inputs and controls |
| `foreground` | `#361e0a` | Primary text |
| `brand` | `#4a2c11` | Primary actions |
| `brand-hover` | `#5d3918` | Hover state |
| `muted-foreground` | `#60462e` | Secondary text |
| `subtle-foreground` | `#785e43` | Tertiary text |
| `border` | `#e9dfd3` | Borders and separators |
| `focus` | `#805436` | Visible focus rings |

Semantic success, information, warning, and danger token pairs are also defined in `globals.css`.

### Typography

- Body: Lato
- Display: DM Serif Display
- Decorative script: Italianno

Use the script face sparingly. Body copy, controls, tables, and long-form legal content must remain highly readable.

### Radius

- Controls: `0.75rem`
- Images: `1rem`
- Cards: `1.25rem`
- Primary compact actions may use full pill rounding

### Content Widths

- Customer container: `80rem`
- Reading container: `48rem`
- Admin content: `66.5rem`

### Spacing

- Default section spacing: `5rem`
- Mobile section spacing: `3.5rem`
- Prefer existing Tailwind spacing increments and shared containers over arbitrary page-specific widths.

## 5. Reusable Components

Customer and shared:

- `CustomerHeader`
- `HeaderActions`
- `CustomerFooter`
- `CustomerPageShell`
- `SiteContainer`
- `BrandLockup`
- `PrimaryButton`
- `SecondaryButton`
- `FormField`
- `CustomSelect`
- `StatusBadge`

Admin:

- `AdminSidebar`
- `AdminShell`
- `AdminPageLayout`
- `AdminStatCard`
- `AdminDataTable`
- `AdminScopeNote`

Reuse these before adding page-local alternatives. Do not abstract tiny one-use fragments without a concrete reuse case.

Every admin area should explain its purpose, customer impact, and current connection state. Do not use “active,” “open,” or similar live-system language for behavior that is only a mock preview.

## 6. Product Presentation

Real coating photography lives in `public/images/products/coatings/`.

Product cards should:

- use `next/image`
- provide meaningful alt text
- keep a consistent aspect ratio
- show selection clearly
- preserve the food as the focal point
- avoid layout shifts

Placeholders remain acceptable only when an actual asset is unavailable.

## 7. Forms and Dropdowns

Controls use cream surfaces, chocolate text, visible borders, rounded corners, and visible focus rings.

The custom dropdown must support:

- Arrow Up and Arrow Down navigation
- Enter and Space selection
- Escape closing
- outside-click closing
- selected and disabled states
- labels and validation text
- touch-friendly targets

Do not introduce another UI library solely for dropdowns.

## 8. Responsive Rules

Design mobile first, then enhance for tablet and desktop.

- minimum practical touch target: 44px
- stack forms and cards on narrow screens
- use the admin drawer below desktop width
- keep tables within responsive overflow containers
- avoid page-level horizontal scrolling
- keep primary actions close to their related content
- maintain readable line lengths

The Our Creations builder appears before the coating gallery on mobile and becomes a compact sticky sidebar on desktop.

## 9. Accessibility

- semantic landmarks and headings
- explicit form labels
- keyboard-operable controls
- visible focus states
- meaningful image alt text
- status labels in addition to color
- readable error and disabled explanations
- sufficient contrast

## 10. Required UI States

Future data-connected work must add consistent states for:

- loading
- empty catalog or cart
- sold out
- invalid mixed-box allocation
- no orders
- no eligible reviews
- no pickup dates
- authentication required
- unauthorized admin access
- payment processing, success, failure, and expiry
- network/server failure

Current backend-dependent actions should remain disabled or clearly identified as mock behavior.
