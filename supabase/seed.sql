-- Controlled operational seed data only. Do not add real users, orders,
-- administrator identities, payment records, or secrets to this file.

insert into public.products (
  id,
  name,
  slug,
  description,
  price_per_piece,
  is_active
)
values (
  '10000000-0000-4000-8000-000000000001',
  'Chocolate-Filled Litaw',
  'chocolate-filled-litaw',
  'Soft Litaw pieces with a chocolate center and a customer-selected coating.',
  10.00,
  true
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  price_per_piece = excluded.price_per_piece,
  is_active = excluded.is_active;

insert into public.product_variants (
  id,
  product_id,
  name,
  piece_count,
  is_active,
  sort_order
)
values
  ('11000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Box of 4', 4, true, 1),
  ('11000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Box of 6', 6, true, 2),
  ('11000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Box of 8', 8, true, 3)
on conflict (id) do update set
  name = excluded.name,
  piece_count = excluded.piece_count,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.coatings (
  id,
  name,
  slug,
  description,
  image_url,
  additional_type_price,
  is_active,
  is_allergen,
  allergen_note,
  sort_order
)
values
  ('12000000-0000-4000-8000-000000000001', 'Cocoa', 'cocoa', 'A rich cocoa coating over the chocolate-filled base.', null, 5.00, true, false, 'Contains chocolate ingredients.', 1),
  ('12000000-0000-4000-8000-000000000002', 'Milk', 'milk', 'A creamy milk coating with a soft, mellow finish.', null, 5.00, true, true, 'Contains dairy.', 2),
  ('12000000-0000-4000-8000-000000000003', 'Palitaw', 'palitaw', 'A combination of sugar, niyog, and sesame seeds.', null, 5.00, true, true, 'Contains coconut and sesame.', 3),
  ('12000000-0000-4000-8000-000000000004', 'Crushed Nuts', 'crushed-nuts', 'A crunchy crushed-nut coating for added texture.', null, 5.00, true, true, 'Contains peanuts or other nuts.', 4),
  ('12000000-0000-4000-8000-000000000005', 'Plain', 'plain', 'The soft Litaw exterior with no additional coating.', null, 5.00, true, false, null, 5),
  ('12000000-0000-4000-8000-000000000006', 'Sesame Seeds', 'sesame-seeds', 'A toasted sesame seed coating with a nutty aroma.', null, 5.00, true, true, 'Contains sesame.', 6),
  ('12000000-0000-4000-8000-000000000007', 'Cookies and Cream', 'cookies-and-cream', 'Crushed chocolate cookies blended with a creamy coating.', null, 5.00, true, true, 'Contains dairy and cookie ingredients.', 7)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  image_url = excluded.image_url,
  additional_type_price = excluded.additional_type_price,
  is_active = excluded.is_active,
  is_allergen = excluded.is_allergen,
  allergen_note = excluded.allergen_note,
  sort_order = excluded.sort_order;

insert into public.addons (id, name, slug, price, is_active)
values (
  '13000000-0000-4000-8000-000000000001',
  'Extra sea salt cream',
  'extra-sea-salt-cream',
  18.00,
  true
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  price = excluded.price,
  is_active = excluded.is_active;

insert into public.pickup_locations (id, name, description, is_active, sort_order)
values
  ('14000000-0000-4000-8000-000000000001', 'UCC Congress — 3rd Floor', 'Campus pickup at the third floor.', true, 1),
  ('14000000-0000-4000-8000-000000000002', 'UCC Congress — Covered Court', 'Campus pickup at the covered court.', true, 2)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.business_settings (key, value)
values
  ('payment_expiry_minutes', '15'::jsonb),
  ('pickup_grace_minutes', '15'::jsonb),
  ('minimum_lead_days', '1'::jsonb),
  ('daily_cutoff_time', '"17:00"'::jsonb),
  ('pickup_slot_interval_minutes', '60'::jsonb),
  ('pickup_operating_days', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]'::jsonb),
  ('pickup_operating_hours', '{"start":"07:00","end":"19:00"}'::jsonb),
  ('support_email', '"tsokolitaw@gmail.com"'::jsonb),
  ('loyalty_threshold', '7'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

update public.terms_versions
set is_current = false
where is_current;

insert into public.terms_versions (version, content, effective_at, is_current)
values (
  '2026-08-27',
  $terms$
TsokoLitaw Terms & Conditions — educational project terms

TsokoLitaw is an academic e-commerce project for demonstration, testing, and evaluation within the UCC Congressional Campus community. Features marked as previews, mock data, test transactions, or unavailable do not create a binding order. An explicitly accepted live checkout concerns real edible products for campus pickup only.

Product descriptions, coatings, prices, availability, pickup schedules, and promotions may change. The server confirms the final payable amount and availability during checkout. Customers must provide accurate account, contact, order, and pickup information.

A live order is confirmed only after the payment provider and TsokoLitaw verify payment. A redirect, screenshot, email, or browser message alone is not proof of payment. Sandbox transactions have no cash value.

Orders are prepared only for the selected available UCC Congressional Campus pickup location and window. Customers must follow campus access requirements and arrive during the communicated window. Products are perishable and fulfilled when released to the customer or authorized recipient.

Cancellation is available only before an eligible order enters Preparing. An eligible paid cancellation starts a full refund to the original payment method, or an approved manual fallback if an automatic refund is unavailable. Prepared, ready-for-pickup, completed, and missed-pickup orders are non-refundable.

Products may contain or contact milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, and cookie ingredients. Handmade products may reasonably differ in appearance, coating distribution, size, and presentation.

Users must not test live payments without authorization, interfere with the platform, impersonate another person, or submit fraudulent information. Applicable non-waivable customer rights remain in effect.

Preview and educational features are provided as available to the extent permitted by law. TsokoLitaw does not guarantee outcomes based on mock content or unavailable features, and does not exclude responsibilities that cannot lawfully be excluded.

The TsokoLitaw name, original content, product presentation, software, and project materials may not be commercially reused without permission. Third-party materials remain the property of their owners.

Order or payment concerns should first be sent to tsokolitaw@gmail.com. These terms are governed by applicable Philippine law. If one provision is invalid, the remainder continues to apply. The version accepted at checkout governs that order unless applicable law requires otherwise.

Selecting the Terms & Conditions checkbox and continuing records electronic acceptance of these terms, the Privacy Policy, allergen notice, pickup window, and no-show policy.
  $terms$,
  '2026-08-27 00:00:00+08'::timestamptz,
  true
)
on conflict (version) do update set
  content = excluded.content,
  effective_at = excluded.effective_at,
  is_current = excluded.is_current;

-- Pickup dates and windows are intentionally not seeded. Admin publishes only
-- the dates the team can serve, choosing MADE_TO_ORDER, READY_STOCK, or HYBRID.
