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
  base_price,
  is_active,
  sort_order
)
values
  ('11000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'TsokoMini (4 pcs)', 4, 40.00, true, 1),
  ('11000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'TsokoMore (6 pcs)', 6, 55.00, true, 2),
  ('11000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'TsokoMuch (8 pcs)', 8, 75.00, true, 3)
on conflict (id) do update set
  name = excluded.name,
  piece_count = excluded.piece_count,
  base_price = excluded.base_price,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.coatings (
  id,
  name,
  slug,
  description,
  image_url,
  price_per_piece,
  is_active,
  is_default,
  sort_order
)
values
  ('12000000-0000-4000-8000-000000000001', 'Cocoa', 'cocoa', 'A rich cocoa coating over the chocolate-filled base.', null, 5.00, true, false, 1),
  ('12000000-0000-4000-8000-000000000002', 'Milk', 'milk', 'A creamy milk coating with a soft, mellow finish.', null, 5.00, true, false, 2),
  ('12000000-0000-4000-8000-000000000003', 'Palitaw', 'palitaw', 'A combination of sugar, niyog, and sesame seeds.', null, 5.00, true, false, 3),
  ('12000000-0000-4000-8000-000000000004', 'Crushed Nuts', 'crushed-nuts', 'A crunchy crushed-nut coating for added texture.', null, 5.00, true, false, 4),
  ('12000000-0000-4000-8000-000000000005', 'Plain', 'plain', 'The soft Litaw exterior with no additional coating.', null, 0.00, true, true, 5),
  ('12000000-0000-4000-8000-000000000006', 'Sesame Seeds', 'sesame-seeds', 'A toasted sesame seed coating with a nutty aroma.', null, 5.00, true, false, 6),
  ('12000000-0000-4000-8000-000000000007', 'Cookies and Cream', 'cookies-and-cream', 'Crushed chocolate cookies blended with a creamy coating.', null, 5.00, true, false, 7),
  ('12000000-0000-4000-8000-000000000008', 'Chocolate Sprinkles', 'chocolate-sprinkles', 'Chocolate sprinkles with a crisp finish.', null, 5.00, true, false, 8)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  image_url = excluded.image_url,
  price_per_piece = excluded.price_per_piece,
  is_active = excluded.is_active,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order;

insert into public.addons (id, name, slug, price, is_active, is_default)
values (
  '13000000-0000-4000-8000-000000000001',
  'Sea salt cream',
  'extra-sea-salt-cream',
  15.00,
  true,
  true
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  price = excluded.price,
  is_active = excluded.is_active,
  is_default = excluded.is_default;

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
  ('manual_payment_expiry_minutes', '30'::jsonb),
  ('minimum_lead_days', '1'::jsonb),
  ('daily_cutoff_time', '"17:00"'::jsonb),
  ('pickup_slot_interval_minutes', '60'::jsonb),
  ('pickup_operating_days', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]'::jsonb),
  ('pickup_operating_hours', '{"start":"07:00","end":"19:00"}'::jsonb),
  ('loyalty_threshold', '7'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

update public.terms_versions
set is_current = false
where is_current;

insert into public.terms_versions (version, content, effective_at, is_current)
values (
  '2026-09-29',
  $terms$
TsokoLitaw Terms & Conditions - campus-pickup ordering

TsokoLitaw is a student-operated academic e-commerce project serving the UCC Congressional Campus community. The website accepts authenticated orders for real edible products and campus pickup only. A preview, simulation, sandbox transaction, test record, or unavailable feature does not create a real order or payment obligation.

Customers must use their own account, provide accurate information, and review the product, quantity, price, allergen notice, payment method, pickup schedule, and policy version before checkout. The server reloads the current catalog, price, reward eligibility, stock, and schedule before creating an order. The order's saved item, price, payment-method, and pickup snapshots then govern that order unless a correction or non-waivable right requires otherwise.

The available payment method may be PayMongo QR Ph, Manual GCash, or tracked Pay at the Counter. PayMongo requires verified provider confirmation matching the stored order and exact amount. Manual GCash requires the exact total, a submitted receipt, and Admin verification against the actual incoming transaction. Pay-at-counter orders must still be created through the website and recorded as paid by an Admin before release or completion. A redirect, screenshot, receipt image, extracted text, email, or browser message alone is not proof of payment. Do not pay twice.

Provider checkouts and unpaid reservations may expire at the displayed time. A timely Manual GCash receipt retains the reservation while under review and prevents website cancellation. A rejected receipt includes a reason and currently allows 15 minutes for correction before the unpaid order may expire. Late, duplicate, incorrect-recipient, or mismatched payments must be reported to tsokolitaw@gmail.com with the order number and transaction reference.

Orders must be collected at the selected campus location, date, and window. Customers must follow campus access rules and arrive within the communicated window and grace period. Products are fulfilled when released to the customer or an authorized recipient. Customers should promptly report a missing, incorrect, damaged, or unsafe item.

Website cancellation is available only while an order is pending and unpaid. Paid-order cancellation, correction, or settlement concerns must be coordinated directly with TsokoLitaw; the website does not initiate refunds or collect a refund destination. Prepared, ready-for-pickup, completed, and missed-pickup orders are ordinarily non-refundable because ingredients and labor are committed. This does not remove remedies for defective, unsafe, materially incorrect, or otherwise non-conforming products, or rights that cannot legally be waived.

Products may contain or contact milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, cookie ingredients, and other allergens handled during preparation. Cross-contact cannot be ruled out. Products are handmade, perishable, and may reasonably differ in appearance, size, coating distribution, and presentation.

The loyalty reward applies only to the eligible free 4-piece base box after seven completed orders; coating and extra charges remain payable. Only the owner of a completed order may submit one moderated review. Submitted review text and images may be stored, moderated, and publicly displayed when approved.

Users must not impersonate another person, submit fraudulent orders or payment evidence, interfere with authentication, inventory or payment systems, upload malicious or unlawful content, or test live payments without authorization. TsokoLitaw may restrict access or preserve evidence when reasonably necessary for security, payment integrity, or legal compliance.

The service may pause for maintenance, security, provider outages, campus closures, stock limits, or operational constraints. TsokoLitaw does not exclude responsibilities or customer rights that cannot lawfully be excluded. The TsokoLitaw name, original content, product presentation, software, and project materials may not be commercially reused without permission; third-party materials remain their owners' property.

Questions and order, payment, or pickup concerns should be sent to tsokolitaw@gmail.com with enough information to investigate. These terms are governed by applicable Philippine law. If one provision is invalid, the remainder continues to apply. The version accepted at checkout is recorded with the order unless applicable law requires a different result.

Selecting the Terms & Conditions checkbox and continuing records electronic acceptance of these Terms, the Privacy Policy, allergen notice, selected pickup details, and missed-pickup policy.
  $terms$,
  '2026-09-29 00:00:00+08'::timestamptz,
  true
)
on conflict (version) do update set
  content = excluded.content,
  effective_at = excluded.effective_at,
  is_current = excluded.is_current;

-- Pickup dates and windows are intentionally not seeded. Admin publishes only
-- the dates the team can serve, choosing MADE_TO_ORDER, READY_STOCK, or HYBRID.
