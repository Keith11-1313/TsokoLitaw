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
| Admin Catalog explains each derived box price | Box size multiplies the current admin-managed price per piece; it is not a permanent fixed amount |
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

Account/Profile and Cart are actions. My Orders belongs inside the account experience and must not appear as a main navigation item. When the server confirms the Admin role, the account menu and Profile shortcuts also expose the Admin dashboard.

Our Creations and legal-page heading blocks use the full available content width. The Home featured-media carousel relies on its previous/next controls and does not repeat slide-selector pills or visible explanatory copy beneath the media.

Footer social links use recognizable Facebook and Instagram marks inside the established pill controls. The global Not Found state keeps its centered message and actions without an enclosing card, border, or shadow.

Profile places the brand logo and `Personal details` heading inside the form card. Its right column contains Loyalty progress, Account shortcuts, and a visually separated Danger zone action without decorative leading icons. The action opens a modal where scheduling account deletion requires typing `DELETE`, clearly states the 90-day deadline and active-order restriction, and changes to a cancellation state while the request is pending. Modal actions share the available width evenly. Destructive and recovery actions remain keyboard accessible, use explicit status messaging, and never imply that the external Google account will be deleted.

After the 90-day deadline, a login attempt for the retained inactive profile is immediately signed out and redirected to a dedicated Account deleted screen. The screen explains that TsokoLitaw access is permanently disabled, confirms the external Google account was not changed, and offers Return home and Contact support actions. The existing Profile deletion scheduling UI remains unchanged.

Every customer and Admin Log out control opens the same accessible confirmation modal. Cancel is the initial focus, Escape and backdrop interaction dismiss it, focus returns to the trigger, and confirmed logout returns to Home. A customer denied an Admin route sees the existing global Not Found design at the requested URL without administrator-specific wording.

Route loading uses Boneyard-generated responsive bones captured from a non-customer fixture. The skeleton mirrors the customer shell without displaying loading prose or capturing authenticated data. Its reveal is delayed by 500 milliseconds so normal fast navigation does not flash a loading state; it appears only when a route wait becomes noticeable.

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

Admin coating entry should:

- request name, description, additional-type price, and image together
- require and preview a square 1:1 image
- explain that the first coating remains included
- present ₱5 as an editable seed for the additional-type charge, not permanent pricing
- distinguish a browser-session preview from a customer-visible published record

Placeholders remain acceptable only when an actual asset is unavailable.

Approved Home feature media uses a single stable portrait carousel frame so switching slides does not shift surrounding content. The video autoplays muted, uses `playsInline`, includes native controls plus a clear sound toggle, and advances to the promotional image when complete. The image remains uncropped and links to the relevant customer route. Carousel controls must remain touch-friendly and keyboard accessible. The Journal button is centered below this media block.

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

After a valid Add to cart action, an accessible modal confirms the addition with a static cart icon, Continue shopping dismissal, and a prominent Check cart action. Invalid configurations remain in the builder and do not open the modal.

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
- cancellation available through Confirmed, with a clear warning that eligibility ends at Preparing
- separate refund-requested, refund-processing, refunded, and refund-failed feedback
- a visible no-refund notice for Preparing, Ready for Pickup, completed, and no-show orders
- network/server failure

Current backend-dependent actions should remain disabled or clearly identified as mock behavior.

Pickup UI must distinguish made-to-order availability from ready stock. The Monday–Saturday, 7:00 AM–7:00 PM operating window is guidance only; checkout shows only dates and slots published by Admin, and same-day pickup appears only for available ready stock.

Cancellation confirmation must explain whether the action only releases an unpaid reservation or starts a full refund to the original payment method. Do not ask for a GCash, Maya, or bank destination during the normal PayMongo refund flow; show a restricted fallback form only after the automatic refund is unavailable or has failed.
