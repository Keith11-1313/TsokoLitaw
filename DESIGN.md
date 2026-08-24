# TsokoLitaw — Design Specification

## 1. Source of Truth

The approved Figma designs are exported as PNG references.

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

These images define the visual language for the whole application.

---

## 2. Customer Design Language

Derived from:

- Home
- Our Creations
- Orders
- Feedback

The customer site should feel:

- warm
- appetizing
- clean
- modern
- student-friendly
- Filipino-inspired

Preserve the visual characteristics established in Figma:

- cream/light backgrounds
- brown/chocolate accents
- restrained decorative styling
- clean content width
- soft card treatment
- clear CTAs
- consistent footer/header language

---

## 3. Admin Design Language

Derived from:

- Admin Dashboard
- Admin Order Management

Other admin pages should reuse:

- same sidebar
- same top area
- same table treatment
- same cards
- same buttons
- same status badge language
- same form controls
- same spacing

---

## 4. Missing Pages

Pages without direct Figma references should extend the established system.

Examples:

### Checkout
Reuse:
- customer header
- customer colors
- customer cards
- same form treatment
- same button style

### Login
Reuse:
- customer typography
- colors
- content width
- card/form language

### Admin Products
Reuse:
- admin sidebar
- admin cards
- admin table/form language

### Terms / Privacy
Reuse:
- customer header/footer
- typography
- content width
- spacing

Do not introduce a separate visual identity.

---

## 5. Implementation Rules

Do not:

- embed full-page PNGs as pages
- use full-page SVGs as pages
- use rasterized text
- recreate the entire layout through absolute positioning
- invent a new visual style for missing screens

Do:

- use semantic HTML
- use Next.js components
- use Tailwind CSS
- build reusable components
- preserve visual hierarchy
- preserve spacing and proportions
- preserve visual language
- implement responsive behavior

---

## 6. Assets

The project currently has no finalized asset folder.

Use this strategy:

### Icons
Use one open-source icon library consistently.

Recommended:

- Lucide React

### Product Images
Use temporary placeholders during UI development.

Replace them with real product photography later.

### Brand Assets
If logo/vector assets become available, place them under:

```text
public/brand/
```

### Product Photos

```text
public/images/products/
```

### Simple Decorative Shapes
Prefer:

- CSS
- small inline SVG
- icon library

Avoid paid asset dependencies.

---

## 7. Responsive Design

Support:

- desktop
- tablet
- mobile

If only desktop Figma frames exist, infer smaller layouts using the same visual language.

Mobile priorities:

- usable navigation
- touch-friendly buttons
- readable cards
- stacked layout when needed
- simple forms
- clear order status
- no horizontal scrolling

---

## 8. Suggested Reusable Components

Possible shared components:

- `CustomerHeader`
- `CustomerFooter`
- `AdminSidebar`
- `PrimaryButton`
- `SecondaryButton`
- `ProductCard`
- `OrderCard`
- `ReviewCard`
- `StatusBadge`
- `FormField`
- `DataTable`
- `EmptyState`
- `LoadingState`

Do not over-componentize tiny one-off elements.

---

## 9. Design Tokens

Extract recurring values from Figma.

Possible tokens:

- background
- foreground
- chocolate
- cream
- muted text
- border
- success
- warning
- error
- radius
- spacing
- typography

Avoid arbitrary slightly different values across components.

---

## 10. Customer Pages

### Home
Match `customer-home.png`.

### Our Creations
Match `customer-our-creations.png`.

### Orders
Match `customer-orders.png`.

### Feedback
Match `customer-feedback.png`.

---

## 11. Admin Pages

### Dashboard
Match `admin-dashboard.png`.

### Order Management
Match `admin-order-management.png`.

---

## 12. Checkout

Create using the customer design system.

Recommended content:

```text
Order summary
Customer information
Pickup
Terms acceptance
Payment
```

Show:

- items
- toppings
- add-ons
- discounts
- total
- pickup details
- allergen notice
- cancellation/no-show notice

---

## 13. Accessibility

- semantic HTML
- labels
- keyboard support
- visible focus states
- accessible contrast
- meaningful alt text
- no color-only status meaning
- readable error messages

---

## 14. Loading / Empty / Error States

Create visually consistent states for:

- loading products
- sold out
- no orders
- no reviews
- no pickup dates
- payment processing
- payment failed
- unauthorized
