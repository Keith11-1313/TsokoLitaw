import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = {
  title: "Terms & Conditions | TsokoLitaw",
  description: "Terms for TsokoLitaw accounts, orders, payments, cancellations, and campus pickup.",
  alternates: { canonical: "/terms" },
};

const sections: readonly LegalSection[] = [
  {
    heading: "Scope of the service",
    paragraphs: [
      "TsokoLitaw is a student-operated academic e-commerce project serving the University of Caloocan City Congressional Campus community. The website supports authenticated ordering of real, edible TsokoLitaw products for campus pickup only. It does not offer shipping, delivery, or digital products.",
      "A feature or record clearly identified as a preview, simulation, sandbox transaction, test record, or unavailable option does not create a real order or payment obligation. An order intentionally accepted through a live checkout is a real purchase even though the platform also has an educational purpose.",
    ],
  },
  {
    heading: "Accounts and customer responsibility",
    paragraphs: [
      "Checkout requires a TsokoLitaw account authenticated through Google. Customers must use their own account, keep it reasonably secure, provide accurate information, and promptly report suspected unauthorized activity. The external Google account remains governed by Google's terms and is not deleted by closing TsokoLitaw access.",
      "The person placing an order confirms that they have legal capacity to do so or have appropriate parent or guardian authorization. Customers are responsible for reviewing the product, quantity, price, allergen notice, payment method, pickup schedule, and policy version displayed before confirming an order.",
    ],
  },
  {
    heading: "Products, pricing, and availability",
    paragraphs: [
      "Products are handmade and may reasonably vary in appearance, size, coating distribution, and presentation. Images are representative rather than a guarantee of exact appearance. Current products, coatings, extras, prices, stock, and pickup schedules may change before an order is accepted.",
      "Cart information stored in the browser is not authoritative. During checkout, the server reloads current catalog prices and availability, applies any eligible loyalty reward, and shows the final amount. Once an order is created, its item, price, payment-method, and pickup snapshots govern that order unless a correction or non-waivable customer right requires otherwise.",
    ],
  },
  {
    heading: "How an order is accepted",
    paragraphs: [
      "Submitting checkout requests creation of an order for the selected campus-pickup schedule. Creation may be refused when the account is inactive, the schedule or stock is unavailable, the cutoff has passed, information is invalid, a loyalty reward is no longer eligible, or security controls reject the request.",
      "An order number and status shown in My Orders are the authoritative website record. TsokoLitaw may correct or cancel an order affected by an obvious pricing or configuration error, unavailable stock, campus closure, invalid payment, fraud, or circumstances that make fulfillment unsafe or impracticable. Any paid-order resolution remains subject to applicable customer rights.",
    ],
  },
  {
    heading: "Payments and verification",
    paragraphs: [
      "The methods available at checkout depend on the configured operating mode. An order may use PayMongo QR Ph, Manual GCash, or tracked Pay at the Counter. The method selected for the order cannot be replaced merely by sending money through a different channel.",
      "PayMongo payment is recognized only after verified provider confirmation matching the stored order, reference, environment, and exact amount. Manual GCash requires the exact order total, a submitted receipt, and Admin verification against the actual incoming transaction. Pay-at-counter orders must still be placed through the website and must be recorded as paid by an Admin before release or completion. Sandbox transactions have no monetary value.",
      "A redirect, screenshot, receipt image, email, or browser message by itself is not proof of payment. Do not pay twice. If a payment is late, duplicated, sent to the wrong recipient, or does not match the order, contact tsokolitaw@gmail.com with the order number and relevant transaction reference.",
    ],
  },
  {
    heading: "Payment timing and failed verification",
    paragraphs: [
      "Provider checkout and unpaid reservations may expire at the time displayed. For Manual GCash, the order remains reserved while a timely receipt is under review and cannot be cancelled through the website. If a receipt is rejected, the reason is shown and the customer currently receives 15 minutes to correct the submission before the unpaid order may expire.",
      "Payment and fulfillment are separate statuses. A paid order is not automatically ready for pickup, and a preparation update does not independently prove payment. Transactional emails are notices only; My Orders and verified administrative records control the current order state.",
    ],
  },
  {
    heading: "Campus pickup",
    paragraphs: [
      "Orders must be collected at the campus location, date, and window selected during checkout. Customers must follow campus access rules and arrive within the communicated pickup window. Pickup availability is published by TsokoLitaw and is not guaranteed merely because the campus is open.",
      "Products are fulfilled when released at pickup to the customer or a person the customer authorizes to receive the order. TsokoLitaw may request enough order information to prevent release to the wrong person. Customers should inspect the order promptly and report a missing, incorrect, damaged, or unsafe item as soon as reasonably possible.",
    ],
  },
  {
    heading: "Cancellations, missed pickup, and remedies",
    paragraphs: [
      "Customers may cancel through the website only while an order is pending and unpaid. That cancellation releases the reservation. Paid-order cancellation, correction, or settlement concerns must be coordinated directly with TsokoLitaw; the website does not initiate refunds or collect a refund destination.",
      "Prepared, ready-for-pickup, completed, and missed-pickup orders are ordinarily non-refundable because ingredients and labor have been committed. This rule does not remove remedies required for defective, unsafe, materially incorrect, or otherwise non-conforming products, and it does not waive rights that cannot legally be waived. An approved settlement for a paid order is handled directly by TsokoLitaw outside the website and should be documented against the order.",
    ],
  },
  {
    heading: "Food safety and allergens",
    paragraphs: [
      "Products may contain or come into contact with milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, cookie ingredients, and other allergens handled in the preparation environment. Cross-contact cannot be ruled out. Customers with allergies or dietary concerns should ask before ordering and should not rely only on product photography or a coating name.",
      "TsokoLitaw products are perishable. Customers are responsible for timely pickup, suitable handling after release, and following any provided storage or reheating guidance. Do not consume a product that appears unsafe; contact TsokoLitaw with the order details instead.",
    ],
  },
  {
    heading: "Loyalty, reviews, and customer content",
    paragraphs: [
      "The current loyalty program awards one free eligible 4-piece base box after seven completed orders. Coating and extra charges remain payable. Rewards have no cash value, cannot be transferred, and are subject to eligibility checks and the rules shown at redemption.",
      "Only the owner of a completed order may submit one review for that order. Reviews are moderated before public display. By submitting text or images, the customer confirms they have the right to provide them and permits TsokoLitaw to store, moderate, and display approved content for the Journal or customer-review features. Do not submit unlawful, misleading, abusive, infringing, confidential, or privacy-invasive content.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: [
      "Customers must not impersonate another person; submit fraudulent orders, receipts, reviews, or payment claims; probe or bypass access controls; interfere with inventory, payment, authentication, or rate-limit systems; use live payment channels for unauthorized tests; upload malicious material; or use the service in violation of law or another person's rights.",
      "TsokoLitaw may restrict or deactivate access, reject an order, preserve evidence, or report activity when reasonably necessary to protect customers, payment integrity, the service, or legal rights. These actions do not remove obligations relating to an already accepted or paid order.",
    ],
  },
  {
    heading: "Availability and responsibility",
    paragraphs: [
      "TsokoLitaw may pause ordering for maintenance, security, provider outages, campus closures, stock limits, or operational constraints. The service does not promise uninterrupted availability. If a failure affects an order or verified payment, TsokoLitaw will use available records to investigate and provide the remedy required by the circumstances and applicable law.",
      "To the extent permitted by law, TsokoLitaw is not responsible for indirect or consequential loss caused by unauthorized account use, misuse of clearly identified test features, external-provider outages, or circumstances beyond reasonable control. Nothing in these terms excludes liability or a consumer right that cannot lawfully be excluded.",
    ],
  },
  {
    heading: "Intellectual property",
    paragraphs: [
      "The TsokoLitaw name, original content, product presentation, software, and project materials may not be copied or commercially reused without permission. Third-party names, logos, services, and materials remain the property of their respective owners. Reference to a provider does not transfer ownership or imply endorsement beyond the service relationship described.",
    ],
  },
  {
    heading: "Questions, disputes, and policy changes",
    paragraphs: [
      "Order, payment, pickup, or policy concerns should first be sent to tsokolitaw@gmail.com with the order number and enough detail to investigate. These terms are governed by applicable Philippine law. Informal resolution does not prevent either party from using a remedy available under applicable law.",
      "If any provision is invalid or unenforceable, the remaining provisions continue to apply. TsokoLitaw may update these terms when the service, providers, or operating model changes. The version accepted during checkout is recorded with that order unless applicable law requires a different result.",
    ],
  },
  {
    heading: "Electronic acceptance",
    paragraphs: [
      "Selecting the Terms & Conditions checkbox and continuing through checkout records electronic acceptance of these Terms, the Privacy Policy, the allergen notice, the selected pickup details, and the missed-pickup policy. Customers should save or review the displayed version before placing the order.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms & Conditions"
      introduction="The operating rules for accounts, real orders, payments, and campus pickup through TsokoLitaw."
      sections={sections}
      documentNote="Effective September 29, 2026"
    />
  );
}
