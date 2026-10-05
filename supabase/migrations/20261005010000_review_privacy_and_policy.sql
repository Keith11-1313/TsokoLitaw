-- Public review reads use only the masked SECURITY DEFINER projection.
-- Owners and Admins retain direct access to authorized raw rows.
drop policy reviews_read_visible_owner_or_admin on public.reviews;
create policy reviews_read_owner_or_admin on public.reviews
for select to authenticated
using ((user_id = (select auth.uid()) and public.is_active_user()) or public.is_admin());
revoke select (id, display_name_snapshot, rating, comment, is_featured, created_at)
on public.reviews from anon;
revoke select on public.reviews from anon;

-- Preserve historical versions and order acceptance snapshots.
do $guard$
begin
  if exists (select 1 from public.terms_versions where version = '2026-10-05' and md5(content) <> '0a202a04465e027d8163fb4468b0d5b4') then
    raise exception 'Policy version 2026-10-05 has different text; create a new version';
  end if;
end;
$guard$;
update public.terms_versions set is_current = false where is_current and version <> '2026-10-05';
insert into public.terms_versions (version, content, effective_at, is_current)
values ('2026-10-05', $policy$TsokoLitaw checkout policies — version 2026-10-05

Last updated: October 1, 2026

Terms & Conditions

Scope of the service

TsokoLitaw is a student-operated academic e-commerce project serving the University of Caloocan City Congressional Campus community. The website supports authenticated ordering of real, edible TsokoLitaw products for campus pickup only. It does not offer shipping, delivery, or digital products.

A feature or record clearly identified as a preview, simulation, sandbox transaction, test record, or unavailable option does not create a real order or payment obligation. An order intentionally accepted through a live checkout is a real purchase even though the platform also has an educational purpose.

Accounts and customer responsibility

Checkout requires a TsokoLitaw account authenticated through Google. Customers must use their own account, keep it reasonably secure, provide accurate information, and promptly report suspected unauthorized activity. The external Google account remains governed by Google's terms and is not deleted by closing TsokoLitaw access.

The person placing an order confirms that they have legal capacity to do so or have appropriate parent or guardian authorization. Customers are responsible for reviewing the product, quantity, price, allergen notice, payment method, pickup schedule, and policy version displayed before confirming an order.

Products, pricing, and availability

Products are handmade and may reasonably vary in appearance, size, coating distribution, and presentation. Images are representative rather than a guarantee of exact appearance. Current products, coatings, extras, prices, stock, and pickup schedules may change before an order is accepted.

The box price includes its current base price, the per-piece charges for the selected coatings, and any paid extras. Boxes contain 4, 6, or 8 pieces, and mixed coating allocations must fill the selected box. One portion of the complimentary extra shown in the builder is included per box at no extra charge.

Cart information stored in the browser is not authoritative. During checkout, the server reloads current catalog prices and availability, applies any eligible loyalty reward, and shows the final amount. Once an order is created, its item, price, payment-method, and pickup snapshots govern that order unless a correction or non-waivable customer right requires otherwise.

How an order is accepted

Submitting checkout requests creation of an order for the selected campus-pickup schedule. Creation may be refused when the account is inactive, the schedule or stock is unavailable, the cutoff has passed, information is invalid, a loyalty reward is no longer eligible, or security controls reject the request.

An order number and status shown in My Orders are the authoritative website record. TsokoLitaw may correct or cancel an order affected by an obvious pricing or configuration error, unavailable stock, campus closure, invalid payment, fraud, or circumstances that make fulfillment unsafe or impracticable. Any paid-order resolution remains subject to applicable customer rights.

Payments and verification

The methods available at checkout depend on the configured operating mode. An order may use PayMongo QR Ph, Manual GCash, or tracked Pay at the Counter. The method selected for the order cannot be replaced merely by sending money through a different channel.

PayMongo payment is recognized only after verified provider confirmation matching the stored order, reference, environment, and exact amount. Manual GCash requires the exact order total, a submitted receipt, and Admin verification against the actual incoming transaction. Pay-at-counter orders must still be placed through the website and must be recorded as paid by an Admin before release or completion. Sandbox transactions have no monetary value.

A redirect, screenshot, receipt image, email, or browser message by itself is not proof of payment. Do not pay twice. If a payment is late, duplicated, sent to the wrong recipient, or does not match the order, contact tsokolitaw@gmail.com with the order number and relevant transaction reference.

Payment timing and failed verification

Provider checkout and unpaid reservations may expire at the time displayed. For Manual GCash, the order remains reserved while a timely receipt is under review and cannot be cancelled through the website. If a receipt is rejected, the reason is shown and the customer currently receives 15 minutes to correct the submission before the unpaid order may expire.

Payment and fulfillment are separate statuses. A paid order is not automatically ready for pickup, and a preparation update does not independently prove payment. Transactional emails are notices only; My Orders and verified administrative records control the current order state.

Campus pickup

Orders must be collected at the campus location, date, and window selected during checkout. Customers must follow campus access rules and arrive within the communicated pickup window. Pickup availability is published by TsokoLitaw and is not guaranteed merely because the campus is open.

Products are fulfilled when released at pickup to the customer or a person the customer authorizes to receive the order. TsokoLitaw may request enough order information to prevent release to the wrong person. Customers should inspect the order promptly and report a missing, incorrect, damaged, or unsafe item as soon as reasonably possible.

Cancellations, missed pickup, and remedies

Customers may cancel through the website only while an order is pending and unpaid. That cancellation releases the reservation. Paid-order cancellation, correction, or settlement concerns must be coordinated directly with TsokoLitaw; the website does not initiate refunds or collect a refund destination.

Prepared, ready-for-pickup, completed, and missed-pickup orders are ordinarily non-refundable because ingredients and labor have been committed. This rule does not remove remedies required for defective, unsafe, materially incorrect, or otherwise non-conforming products, and it does not waive rights that cannot legally be waived. An approved settlement for a paid order is handled directly by TsokoLitaw outside the website and should be documented against the order.

Food safety and allergens

Products may contain or come into contact with milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, cookie ingredients, and other allergens handled in the preparation environment. Cross-contact cannot be ruled out. Customers with allergies or dietary concerns should ask before ordering and should not rely only on product photography or a coating name.

TsokoLitaw products are perishable. Customers are responsible for timely pickup, suitable handling after release, and following any provided storage or reheating guidance. Do not consume a product that appears unsafe; contact TsokoLitaw with the order details instead.

Loyalty, reviews, and customer content

The current loyalty program awards one free eligible 4-piece base box after seven completed orders. Coating and extra charges remain payable. Rewards have no cash value, cannot be transferred, and are subject to eligibility checks and the rules shown at redemption.

Only the owner of a completed order may submit one review for that order. Reviews are moderated before public display. By submitting text or images, the customer confirms they have the right to provide them and permits TsokoLitaw to store, moderate, and display approved content for the Journal or customer-review features. Do not submit unlawful, misleading, abusive, infringing, confidential, or privacy-invasive content.

The review form can prepare up to five supported photos on your device before upload. There is no self-service review edit or delete option; contact tsokolitaw@gmail.com to request a correction or removal.

Acceptable use

Customers must not impersonate another person; submit fraudulent orders, receipts, reviews, or payment claims; probe or bypass access controls; interfere with inventory, payment, authentication, or rate-limit systems; use live payment channels for unauthorized tests; upload malicious material; or use the service in violation of law or another person's rights.

TsokoLitaw may restrict or deactivate access, reject an order, preserve evidence, or report activity when reasonably necessary to protect customers, payment integrity, the service, or legal rights. These actions do not remove obligations relating to an already accepted or paid order.

Availability and responsibility

TsokoLitaw may pause ordering for maintenance, security, provider outages, campus closures, stock limits, or operational constraints. The service does not promise uninterrupted availability. If a failure affects an order or verified payment, TsokoLitaw will use available records to investigate and provide the remedy required by the circumstances and applicable law.

The Install app guide explains browser home-screen shortcuts or web apps, depending on the device and browser. It does not provide an Android APK or offline ordering. Internet access is still required to browse, order, and manage payments.

To the extent permitted by law, TsokoLitaw is not responsible for indirect or consequential loss caused by unauthorized account use, misuse of clearly identified test features, external-provider outages, or circumstances beyond reasonable control. Nothing in these terms excludes liability or a consumer right that cannot lawfully be excluded.

Intellectual property

The TsokoLitaw name, original content, product presentation, software, and project materials may not be copied or commercially reused without permission. Third-party names, logos, services, and materials remain the property of their respective owners. Reference to a provider does not transfer ownership or imply endorsement beyond the service relationship described.

Questions, disputes, and policy changes

Order, payment, pickup, or policy concerns should first be sent to tsokolitaw@gmail.com with the order number and enough detail to investigate. These terms are governed by applicable Philippine law. Informal resolution does not prevent either party from using a remedy available under applicable law.

If any provision is invalid or unenforceable, the remaining provisions continue to apply. TsokoLitaw may update these terms when the service, providers, or operating model changes. The version accepted during checkout is recorded with that order unless applicable law requires a different result.

Electronic acceptance

Before placing an order, you must acknowledge the Terms & Conditions, Privacy Policy, allergen notice, selected pickup details, and missed-pickup policy. The order records the applicable policy version, acceptance time, and selected pickup details.

Privacy Policy

Scope and contact

This policy explains how TsokoLitaw handles personal information through its website, customer accounts, campus-pickup ordering, payments, reviews, support, and related administrative operations. TsokoLitaw is responsible for deciding why and how this information is used for the service.

Privacy questions, requests, or concerns may be sent to tsokolitaw@gmail.com. Please do not email passwords, wallet credentials, or unnecessary financial information.

Information we collect

Account information includes the identifiers, name, email address, and basic profile details supplied through Google and Supabase authentication. TsokoLitaw does not collect a mobile number and does not receive your Google password.

Order information includes cart selections, quantities, prices, discounts, pickup details, customer notes, accepted policy version, status history, loyalty activity, and support records. Cart contents may be kept in your browser until checkout; the server recalculates the authoritative price and availability when an order is placed.

Payment information includes the chosen method, order total, provider references, payment and verification status, and related audit records. For Manual GCash, we privately store the submitted receipt plus the customer-reported reference, amount, payment time, and recipient. Optional receipt extraction runs in your browser and is not sent to an external OCR service. TsokoLitaw does not store your wallet or online-banking login credentials.

Content you choose to provide may include a review, rating, tasting highlights, review images, and messages sent for support. Operational records may include authentication sessions, security and rate-limit events, transactional-email delivery data, webhook events, administrative actions, and account-deletion requests.

Review photos are resized or compressed on your device before submission, with HEIC or HEIF converted when needed. The website uploads the prepared images, not the original camera files, to private review storage. This preparation applies to the review form and is not an external image-processing service.

How information is obtained

Information comes from you when you sign in, place or manage an order, submit payment details, write a review, request account deletion, or contact TsokoLitaw. We also receive limited status and reference information from service providers when they authenticate an account, confirm a payment, or report delivery of a transactional email.

Required fields are identified in the interface. If required account, order, payment, or pickup information is not provided, TsokoLitaw may be unable to create, verify, prepare, or release the order.

Why we use information

We use information to authenticate and protect accounts; calculate prices; create and fulfill orders; reserve inventory; verify payments; manage pickup, cancellations, and loyalty rewards; send transactional updates; moderate reviews; provide support; investigate misuse; maintain audit and security records; and meet applicable legal, accounting, or dispute-resolution duties.

Processing is limited to what is necessary for the requested service, compliance obligations, security and legitimate operational needs, or consent where consent is the appropriate basis. Transactional email is not treated as permission for unrelated marketing. TsokoLitaw does not sell personal information or use it for third-party behavioral advertising.

Providers and disclosures

TsokoLitaw uses Google for sign-in, Supabase for authentication, database and file storage, Vercel for application hosting, PayMongo for supported online payment processing, and Resend for transactional email delivery. These providers receive the information needed to perform their roles and may process it in locations outside the Philippines under their own terms, safeguards, and privacy commitments.

Authorized TsokoLitaw administrators may access information only for fulfillment, payment review, customer support, moderation, security, and operational administration. Information may also be disclosed when reasonably necessary to comply with law, respond to a lawful request, investigate fraud or security incidents, enforce these policies, or protect customers and legal rights.

Reviews and public information

New reviews are not public until an Admin approves them. Published reviews show your rating, comment, selected highlights, approved photos, review date, ordered items, and a masked display name. Your account identifiers, email address, original display name, and internal image-storage paths are not exposed through public review access. Review images are accessible to the owner and authorized Admins before publication.

Do not include another person's private information, payment details, or confidential material in a review or image. Contact TsokoLitaw if published content needs correction or removal; requests remain subject to applicable rights, recordkeeping needs, and dispute evidence.

Retention and account deletion

Information is retained only as long as reasonably needed for fulfillment, payment verification, support, security, audit, dispute handling, legal or accounting duties, and the purposes explained here. Different records may require different retention periods. Data that is no longer required should be deleted, anonymized, or access-restricted where appropriate.

Eligible customers may schedule account deletion from Profile and cancel during the 90-day grace period. Active orders must be resolved first. When the request becomes due, the service deactivates the TsokoLitaw profile and blocks account access; it does not delete the external Google account. Order, payment, audit, and other relational records may remain when necessary for legitimate recordkeeping, legal claims, security, or obligations that survive deactivation.

Security and incidents

TsokoLitaw uses server-side authorization, restricted Admin access, database access policies, private receipt and review-image storage, signed provider webhooks, rate limits, audit records, and other reasonable technical and organizational safeguards. Access is limited according to operational need.

No online service can guarantee absolute security. Report suspected security incidents to tsokolitaw@gmail.com. TsokoLitaw is responsible for investigating reports and providing any notifications required by applicable law. Customers should protect their Google account and promptly report suspicious TsokoLitaw account activity.

Your rights and choices

Subject to the Data Privacy Act of 2012 and applicable limitations, you may ask to be informed about processing; access or correct personal information; object to certain processing; request erasure or blocking; obtain portable data where applicable; withdraw consent where processing depends on consent; seek damages; or file a complaint. Some requests may be limited when information remains necessary for an order, legal obligation, legitimate business purpose, security, or a legal claim.

Supported profile information can be edited in your account. Other requests may be sent to tsokolitaw@gmail.com. We may verify your identity and ask for enough detail to locate the relevant records. If a privacy concern is not resolved, you may contact the Philippine National Privacy Commission.

Changes to this policy

This policy may be updated when the service, providers, operating model, or legal requirements change. The revised date will appear on this page. Material changes will receive additional notice when appropriate or legally required, and a new checkout policy version may require acceptance before another order is placed.$policy$, '2026-10-05 00:00:00+08'::timestamptz, true)
on conflict (version) do update set is_current = true;
