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
| Cart lines are selectable | Customers can pay for a subset without losing unchecked configurations after payment |
| My Orders is inside Account | It is private customer activity, not public navigation |
| Mobile builder appears before coatings | Customers need configuration context before scanning all choices |
| Mixed-box counters are on coating cards | Allocation happens piece by piece against visible coating options |
| Admin Catalog explains each derived box price | Box size multiplies the current admin-managed price per piece; it is not a permanent fixed amount |
| Product builder starts with actionable choices | Our Creations opens directly on coating selection and box configuration without redundant promotional copy |
| Quantities are numeric inputs | Builder and Cart use the same bounded direct-entry pattern; final date-specific stock is confirmed at Checkout |
| Terms and Privacy are in Footer and Checkout | They remain accessible and appear where acceptance matters |
| Reviews begin on completed order details | Review eligibility is tied to a specific fulfilled order |
| New reviews await moderation | Customer submission does not imply immediate public publication; Admin visibility and featured actions are explicit |
| Journal replaces Vlog | Announcements and stories are not always videos |
| Journal and Reviews share one Admin area | Moderation directly controls the Community highlights shown with published Journal content |
| Admin pages show purpose and connection | Mock controls must not imply a live customer change |
| Admin fulfillment uses explicit confirmations | Real status changes are irreversible in the UI, customer-visible, and recorded for audit |

When visual polish conflicts with workflow clarity, preserve the workflow and adjust the presentation around it.

## 2. Customer Design Language

The storefront should feel warm, appetizing, calm, and recognizably Filipino.

Use:

- the supplied low-contrast cream photo background on customer page canvases
- white-cream elevated surfaces
- chocolate-brown text and actions
- serif display headings
- soft borders and rounded cards
- clear product photography
- generous but consistent whitespace
- mobile-first stacking

The main customer navigation is:

- Home
- Our Creations
- Journal

Account/Profile and Cart are actions. My Orders belongs inside the account experience and must not appear as a main navigation item. When the server confirms the Admin role, the account menu and Profile shortcuts also expose the Admin dashboard.

Our Creations and legal-page heading blocks use the full available content width. The Home featured-media carousel relies on its previous/next controls and does not repeat slide-selector pills or visible explanatory copy beneath the media. On mobile, the Home hero places its image before the Order now action so the primary action remains easy to reach after scanning the product.

Customer pages use `public/images/photo-bg.png` on their main canvas while keeping cards and navigation on opaque cream surfaces for readability. Admin pages retain their denser flat operational background. Customer page top spacing is compact on mobile and increases at larger breakpoints rather than leaving a large empty band below the header.

Our Creations keeps one authoritative box configurator. After a mobile customer scrolls past it, a compact bottom shortcut shows the current total and returns to the existing builder; it does not duplicate the form or its state. Checkout places the existing order summary before the form on mobile and keeps it as a sticky right column on desktop.

Footer social links use recognizable Facebook and Instagram marks inside the established pill controls. The global Not Found state keeps its centered message and actions without an enclosing card, border, or shadow.

Profile places the brand logo and `Personal details` heading inside the form card. Its right column contains Loyalty progress, Account shortcuts, and a visually separated Danger zone action without decorative leading icons. The action opens a modal where scheduling account deletion requires typing `DELETE`, clearly states the 90-day deadline and active-order restriction, and changes to a cancellation state while the request is pending. Modal actions share the available width evenly. Destructive and recovery actions remain keyboard accessible, use explicit status messaging, and never imply that the external Google account will be deleted.

After the 90-day deadline, a login attempt for the retained inactive profile is immediately signed out and redirected to a dedicated Account deleted screen. The screen explains that TsokoLitaw access is permanently disabled, confirms the external Google account was not changed, and offers Return home and Contact support actions. The existing Profile deletion scheduling UI remains unchanged.

Every customer and Admin Log out control opens the same accessible confirmation modal. Cancel is the initial focus, Escape and backdrop interaction dismiss it, focus returns to the trigger, and confirmed logout returns to Home. A customer denied an Admin route sees the existing global Not Found design at the requested URL without administrator-specific wording.

Route loading uses Boneyard-generated responsive bones captured from a non-customer fixture. The skeleton mirrors the customer shell without displaying loading prose or capturing authenticated data. Its reveal is delayed by 500 milliseconds so normal fast navigation does not flash a loading state; it appears only when a route wait becomes noticeable.

Journal includes announcements, kitchen stories, product features, customer stories, selected reviews, and optional video—not video alone. Published post cards use the Admin-selected type, icon, display date, copy, optional cover image, and video link. Community highlights contain only reviews that are both visible and featured.

Completed order details open review entry in a focused modal instead of navigating to a separate form page. The modal shows the ordered items, centers five rating controls, displays a live `0/1000` counter, prevents typing beyond 1,000 characters, and disables submission until a rating and at least 10 non-whitespace characters are present.

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

The Admin Dashboard is the one cross-feature overview. It uses directly labelled seven-day paid-revenue and fulfillment-status charts, a responsive linked card for every Admin area, recent orders, and genuine quick actions. Other Admin pages stay focused on their own workflow instead of repeating dashboard charts.

Customer Profile shows completed-order progress toward the next configured reward plus the number of available free boxes. Admin Customers presents a compact account directory with the same persisted progress, available rewards, and successfully redeemed reward count. Customer and Admin accounts are both visible and labelled by role, including accounts with no orders. Checkout exposes reward redemption only when an available reward and a selected 4-piece box both exist, then shows the discount as a separate summary line before the final total.

Do not create a separate visual identity for each admin page. Connected operational pages may remove the earlier purpose/customer-impact/connection explainer once their controls and effects are self-evident; mock pages must retain honest connection guidance.

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

The interface intentionally uses only these two type families. Headings that previously used decorative script now use DM Serif Display. Body copy, controls, tables, and long-form legal content remain in Lato for readability.

### Radius

- Controls: `0.75rem`
- Images: `1rem`
- Cards: `1.25rem`
- Primary compact actions may use full pill rounding

### Content Widths

- Customer container: `80rem`
- Reading container: `48rem`
- Admin content: fluid within the available shell, capped at `90rem`, with shared responsive gutters

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

Reuse these before adding page-local alternatives. Do not abstract tiny one-use fragments without a concrete reuse case.

Keep Admin page headings concise and consistent with their navigation labels. Put operational guidance beside the control or section where it is needed instead of repeating page-level descriptions. Do not use “active,” “open,” or similar live-system language for behavior that is only a mock preview.

Admin Inventory should lead with the selected pickup date and its operational controls. Avoid repeating instructional cards, helper captions, or arithmetic already communicated by clear labels. Inventory may record unusable pieces, but it must not expose a walk-in cash-sale workflow because every customer purchase uses website checkout and online payment. Do not add a separate online-availability checkbox; pickup publication and remaining stock determine checkout availability.

The selected date must be visibly associated with its mode and independent balance. The prepared-piece field represents the upper limit for that date across every box size. When commitments or waste create a non-zero lower bound, explain that those pieces are already accounted for and direct Admin to another pickup date for a new independent limit. If multiple eligible dates exist, expose a simple date selector. Creation of dates belongs in Admin Pickup, not Inventory.

## 6. Product Presentation

Real coating photography lives in the Supabase `catalog-media` bucket and is selected through the persisted catalog.

Product cards should:

- use `next/image`
- provide meaningful alt text
- keep a consistent aspect ratio
- show selection clearly
- preserve the food as the focal point
- avoid layout shifts

Admin coating entry should:

- request name, description, per-piece coating price, availability, default selection, and image together
- require and preview a square 1:1 image
- explain that the saved price applies to every piece using the coating
- present ₱5 as an editable seed for the per-piece coating charge, not permanent pricing
- distinguish a local image preview from a successfully persisted customer-visible record

Placeholders remain acceptable only when an actual asset is unavailable.

Approved Home feature media uses a single stable portrait carousel frame so switching slides does not shift surrounding content. The video autoplays muted, uses `playsInline`, includes native controls plus a clear sound toggle, and advances to the promotional image when complete. The image remains uncropped and links to the relevant customer route. Carousel controls must remain touch-friendly and keyboard accessible. The Journal button is centered below this media block.

The Home hero fills at least the first viewport below the fixed-height customer header. Its content stays vertically centered, and the following Featured section must not peek into the initial desktop screen.

## 7. Forms and Dropdowns

Controls use cream surfaces, chocolate text, visible borders, rounded corners, and visible focus rings.

Every real persisted form validates in the browser and again on the server. Field errors appear after blur and update while corrected. Edit actions remain disabled until the form is both valid and changed; creation, Checkout, review, and confirmation actions enable as soon as their required valid state is complete. Pending actions remain disabled and explain what is incomplete nearby.

Quantities, stock, lead days, grace periods, and PHP prices use the shared minus/input/plus stepper. Direct keyboard entry and Arrow Up/Down remain available; invalid, out-of-range, or wrong-step values are never silently clamped into acceptance.

The custom dropdown must support:

- Arrow Up and Arrow Down navigation
- Enter and Space selection
- Escape closing
- outside-click closing
- selected and disabled states
- labels and validation text
- touch-friendly targets

Do not introduce another UI library solely for dropdowns.

Coating images must decode as JPG, PNG, or WebP, remain at or below 3 MiB, and be exactly square. The UI reports the actual size or dimensions and blocks Save while validation is pending or failed. Journal covers use the same type, size, and decode checks without the square requirement.

## 8. Responsive Rules

Design mobile first, then enhance for tablet and desktop.

- minimum practical touch target: 44px
- stack forms and cards on narrow screens
- use the admin drawer below desktop width
- use stacked cards for content-heavy Admin lists on mobile; reserve horizontal table scrolling for data that must be compared by column
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

Connected customer and Admin views must provide consistent states for:

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
- a clear unpaid-cancellation action only while payment is pending
- a visible in-person-settlement notice for paid orders and a no-refund notice for Preparing, Ready for Pickup, completed, and no-show orders
- network/server failure

Any deliberately unconnected action must remain disabled or be clearly identified as unavailable; it must not imitate a successful persisted change.

Checkout now opens PayMongo Hosted Checkout after the server creates or reloads the idempotent pending order. The return screen must say that payment is being verified unless the owned database order already records `payment_status = PAID`; the redirect itself never displays an unverified success claim. A confirmed paid return clears the matching browser cart.

Order references use the short shared kiosk format `TL-0001`. Customer and Admin views must display the same stored order number so it can be spoken and matched quickly at pickup.

Pickup UI must distinguish Made to order, Ready stock, and Hybrid. The configured operating window is guidance only; checkout shows only dates and slots explicitly published by Admin, and no mode appears automatically every day. All three modes use website checkout and online payment. Admin Pickup creates and publishes the schedule; Ready Stock and Hybrid dates then become selectable in Admin Inventory. Schedule cards show mode, publication state, windows, locations, and a lock when orders or inventory make structural edits unsafe. Long date lists use a selector and one focused schedule card instead of an indefinitely growing stack.

Cancellation confirmation explains that the action releases an unpaid reservation and that no payment was collected. Paid orders never show an online cancellation or refund form. They show concise guidance to coordinate a concern directly with TsokoLitaw in person.

The connected order detail displays the immutable item and pickup snapshots and payment state. Only a pending unpaid order exposes the confirmation-based cancellation action. Paid orders show no refund status or destination controls in the active UI; historical database records remain outside the current customer workflow.

Transactional order-confirmation email uses the same plain-language hierarchy as order detail: stored order number, item summary, paid total, and immutable pickup date, time, and location. It includes a direct authenticated order-detail link and the approved allergen notice. Both HTML and plain-text versions must remain readable; delivery failure never changes the customer's order or payment state.

Ready-for-pickup email leads with the ready state, repeats the immutable campus pickup date, time, and location, asks the customer to bring the short order number, and links to authenticated order details. It must not imply that the order is already completed or introduce a separate reminder schedule.

The active cancellation email states that payment was never collected. Historical refund email templates remain only for delivery records created under the earlier workflow and must not be presented as a current customer capability.

## Android APK Presentation

The Phase 15 Android package has two intentionally different visual assets:

- the launcher icon uses the recognizable TsokoLitaw mark and remains legible under Android icon masking
- the Trusted Web Activity splash uses a dedicated square Palitaw-themed illustration, not merely an enlarged launcher logo

The splash places the illustration at the center of the warm cream brand background with generous safe space for different Android densities and crops. Any TsokoLitaw wordmark included inside the artwork must remain readable at small sizes. The splash contains no fake percentage, spinner, interaction, or forced minimum duration and fades as soon as the web surface is ready.

Android 12 and newer may briefly show the system-controlled launcher-icon splash first. The design must make its background color visually compatible with the following custom illustration so the transition feels intentional rather than like two unrelated screens.

The public website exposes a direct, touch-friendly **Download Android APK** action with the current version and a short notice that Android will ask the customer to approve installation from their browser. It must not claim Google Play availability or imply that installation can bypass Android's confirmation.
