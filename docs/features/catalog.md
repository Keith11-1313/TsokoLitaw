# Catalog and box configuration

`/our-creations` → `src/components/creations/product-configurator.tsx` → browser-local
`src/components/cart/cart-provider.tsx`. Public read model: `src/lib/server-commerce.ts`.
Admin writes: `/admin/products/actions.ts` → `server-catalog.ts` → catalog RPCs and Storage.

## Authoritative rules

Each `product_variants.base_price` is the authoritative fixed base box price. The controlled seed is
TsokoMini ₱40, TsokoMore ₱55, and TsokoMuch ₱75. Every allocated piece adds its coating's current `coatings.price_per_piece`; an optional paid add-on has a quantity
per box. Box sizes are 4, 6, 8. Mixed allocations must account for every piece. Exactly one active
coating is the storefront default. Exactly one active extra is complimentary; checkout snapshots
one free portion per box and charges only the customer's additional selected quantity. PHP seed
values are editable catalog data, not hardcoded checkout prices. The initial default coating is Plain
at ₱0 per piece; the default complimentary Sea salt cream is ₱0 once per box and ₱15 for each
additional portion.
The storefront builder shows the current complimentary extra between box size and coating style,
before optional paid add-ons, so customers can see that it is already included.
The optional add-on quantity appears only after a paid add-on is selected. The allergen notice
follows box quantity, above the item total.
Below the desktop breakpoint, Your coating contains compact thumbnail radio choices for Single
and thumbnail rows with bounded minus/count/plus controls for Mixed. The assigned-piece count and
incomplete-allocation message stay beside these controls. There is no separate mobile gallery or
gallery/return shortcut. Desktop retains its photo gallery and sticky builder, sharing the same state.
Compact choices and desktop gallery cards show the persisted coating price per piece in subdued
italic text, including zero-priced coatings.

Browser calculation in `commerce.ts` is an estimate. Checkout reloads the catalog and calls
`priceCheckoutCart` on the server; existing orders retain their old snapshot prices/names.
The old `additional_type_price` and per-coating allergen columns are no longer the current schema.
See the [database map](../architecture/database.md) for the latest coating writer.

## Common changes

- Normal product/coating/add-on information: authorized Admin Catalog, not source edits or reseeding.
- Catalog UI: `product-configurator.tsx`, Admin `catalog-manager.tsx` named editors, shared controls.
- Receipt presentation: checkout summary and shared `orders/order-line-items.tsx`.
- Pricing rule: `commerce.ts`, live server inputs, trusted SQL snapshot contract, and tests together.
- Coating media: Supabase `catalog-media` persisted `image_url`; Home photography remains local.

Images must decode as JPG/PNG/WebP, be at most 3 MiB, and coatings must be square.
`server-image-validation.ts` repeats checks independently of the browser. Uploads happen only after
authorization; failed persistence removes only the newly uploaded object. Publication invalidates
the public catalog cache. A local preview never implies a saved record.

Tests: `commerce.test.ts`, `server-image-validation.test.ts`, and local `007_catalog.test.sql`.
Check single/mixed boxes, coating and complimentary-extra defaults, paid extras, and current versus
historical prices.
