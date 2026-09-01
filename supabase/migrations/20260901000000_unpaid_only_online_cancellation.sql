-- Online checkout accepts QR Ph only. Customers may cancel only while an
-- order is unpaid; concerns involving a paid order are settled in person.
-- Historical refund tables and provider-event functions remain intact so
-- existing records and delayed signed events can still be reconciled.

create or replace function public.prepare_order_cancellation(
  target_order_id uuid,
  target_user_id uuid
)
returns table (
  cancellation_kind text,
  cancellation_payment_id uuid,
  cancellation_checkout_id text,
  cancellation_provider_payment_id text,
  cancellation_amount numeric,
  existing_refund_id uuid,
  existing_refund_status public.refund_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  target_payment public.payments%rowtype;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
    and user_id = target_user_id
  for update;

  if target_order.id is null then
    raise exception 'Order is unavailable';
  end if;

  select * into target_payment
  from public.payments
  where order_id = target_order.id
  for update;

  if target_order.status = 'PENDING_PAYMENT'
    and target_order.payment_status = 'PENDING'
    and (target_payment.id is null or target_payment.status = 'PENDING')
  then
    return query select
      'UNPAID'::text,
      target_payment.id,
      target_payment.provider_checkout_id,
      target_payment.provider_payment_id,
      coalesce(target_payment.amount, target_order.total),
      null::uuid,
      null::public.refund_status;
    return;
  end if;

  if target_order.payment_status = 'PAID' then
    raise exception 'Paid-order concerns must be settled directly with TsokoLitaw in person';
  end if;

  raise exception 'Order is no longer eligible for cancellation';
end;
$$;

comment on function public.prepare_order_cancellation(uuid, uuid) is
  'Service-only preparation for unpaid customer cancellation. Paid orders cannot be cancelled or refunded through the website.';

update public.terms_versions
set is_current = false
where is_current;

insert into public.terms_versions (version, content, effective_at, is_current)
values (
  '2026-09-01',
  $terms$
TsokoLitaw Terms & Conditions — educational project terms

TsokoLitaw is an academic e-commerce project for demonstration, testing, and evaluation within the UCC Congressional Campus community. Features marked as previews, mock data, test transactions, or unavailable do not create a binding order. An explicitly accepted live checkout concerns real edible products for campus pickup only.

Product descriptions, coatings, prices, availability, and pickup schedules may change. The server confirms the final payable amount and availability during checkout. Customers must provide accurate account, contact, order, and pickup information.

Website checkout accepts QR Ph through PayMongo. A live order is confirmed only after PayMongo and TsokoLitaw verify payment. A redirect, screenshot, email, or browser message alone is not proof of payment. Sandbox transactions have no cash value.

Orders are prepared only for the selected available UCC Congressional Campus pickup location and window. Customers must follow campus access requirements and arrive during the communicated window. Products are perishable and fulfilled when released to the customer or authorized recipient.

A customer may cancel through the website only while an order is still awaiting payment. An unpaid cancellation releases the reservation. Once an order is paid through QR Ph, cancellation or settlement concerns must be coordinated directly with TsokoLitaw in person; the website does not initiate or process refunds. Prepared, ready-for-pickup, completed, and missed-pickup orders are non-refundable, subject to customer rights that cannot legally be waived. Any approved paid-order settlement is handled directly by TsokoLitaw outside the website.

Products may contain or contact milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, and cookie ingredients. Handmade products may reasonably differ in appearance, coating distribution, size, and presentation.

Users must not test live payments without authorization, interfere with the platform, impersonate another person, or submit fraudulent information. Applicable non-waivable customer rights remain in effect.

Preview and educational features are provided as available to the extent permitted by law. TsokoLitaw does not guarantee outcomes based on mock content or unavailable features, and does not exclude responsibilities that cannot lawfully be excluded.

The TsokoLitaw name, original content, product presentation, software, and project materials may not be commercially reused without permission. Third-party materials remain the property of their owners.

Order or payment concerns should first be sent to tsokolitaw@gmail.com. These terms are governed by applicable Philippine law. If one provision is invalid, the remainder continues to apply. The version accepted at checkout governs that order unless applicable law requires otherwise.

Selecting the Terms & Conditions checkbox and continuing records electronic acceptance of these terms, the Privacy Policy, allergen notice, pickup window, and no-show policy.
  $terms$,
  '2026-09-01 00:00:00+08'::timestamptz,
  true
)
on conflict (version) do update set
  content = excluded.content,
  effective_at = excluded.effective_at,
  is_current = excluded.is_current;
