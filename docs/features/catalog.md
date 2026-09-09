# Catalog and box configuration

`/our-creations` → `src/components/creations/product-configurator.tsx` → browser-local
`src/components/cart/cart-provider.tsx`. Public read model: `src/lib/server-commerce.ts`.
Admin writes: `/admin/products/actions.ts` → `server-catalog.ts` → catalog RPCs and Storage.

## Authoritative rules

`products.price_per_piece × product_variants.piece_count` is the base box price. Every allocated
piece adds its coating's current `coatings.price_per_piece`; an optional add-on has a quantity per
box. Box sizes are 4, 6, 8. Mixed allocations must account for every piece. Exactly one active
coating is the storefront default. PHP seed values are editable catalog data, not hardcoded prices.

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
Check single/mixed boxes, active/default selection, add-ons, and current versus historical prices.
