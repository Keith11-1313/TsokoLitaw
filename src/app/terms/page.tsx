import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = {
  title: "Terms & Conditions | TsokoLitaw",
  description: "Terms for TsokoLitaw online ordering, QR Ph payment, cancellation, and campus pickup.",
  alternates: { canonical: "/terms" },
};

const sections: readonly LegalSection[] = [
  {
    heading: "Educational project and scope",
    paragraphs: [
      "TsokoLitaw is operated as an academic and educational e-commerce project intended for demonstration, software testing, and technical evaluation within the University of Caloocan City Congressional Campus community.",
      "Although the platform has an educational context, any order explicitly accepted through a live checkout concerns real, edible TsokoLitaw products for campus pickup. The website does not offer shipping or digital products. Features clearly marked as previews, mock data, test transactions, or unavailable do not create a binding order.",
    ],
  },
  {
    heading: "Products, orders, and pricing",
    paragraphs: [
      "Product descriptions, coating images, prices, availability, and pickup schedules may change. The final payable amount and availability must be confirmed by the server during checkout before an order is created.",
      "Customers must provide accurate account, contact, order, and pickup information. TsokoLitaw may reject or cancel an order affected by unavailable stock, an invalid payment, an obvious pricing error, suspected misuse, or a campus closure, subject to the applicable refund rules.",
    ],
  },
  {
    heading: "Payments and transaction status",
    paragraphs: [
      "Website checkout accepts QR Ph through PayMongo. Sandbox testing may be used during development; a sandbox or test transaction has no cash value and does not create a real order. A live order is confirmed only after the payment provider and TsokoLitaw verify payment.",
      "A browser redirect, screenshot, email, or on-screen message alone is not proof of payment. Customers are responsible for reviewing the amount and pickup details before authorizing a live transaction.",
    ],
  },
  {
    heading: "Campus pickup and product consumption",
    paragraphs: [
      "Orders are prepared for pickup only at an available UCC Congressional Campus location and schedule selected during checkout. Customers must arrive within the communicated pickup window and follow campus access requirements.",
      "TsokoLitaw products are perishable physical food items. They are considered fulfilled when released to the customer or the customer's authorized recipient at pickup. No delivery or shipment is provided unless TsokoLitaw publishes a separate written arrangement.",
    ],
  },
  {
    heading: "Cancellations, refunds, and no-shows",
    paragraphs: [
      "A customer may cancel through the website only while an order is still awaiting payment. An unpaid cancellation releases the reservation. Once an order is paid through QR Ph, cancellation or settlement concerns must be coordinated directly with TsokoLitaw in person; the website does not initiate or process refunds.",
      "Prepared, ready-for-pickup, completed, and missed-pickup orders are non-refundable because ingredients and labor have already been committed, subject to customer rights that cannot legally be waived. Any settlement approved for a paid order is handled directly by TsokoLitaw outside the website.",
    ],
  },
  {
    heading: "User acknowledgment and acceptable use",
    paragraphs: [
      "By using the platform, customers acknowledge its academic context, understand which features are previews, and accept responsibility for transactions they intentionally initiate. Customers must not test live payment channels without authorization, interfere with the platform, impersonate another person, or submit fraudulent information.",
      "Educational or demonstration status does not remove customer rights that cannot legally be waived, and it does not turn an accepted live food order into a digital-content transaction.",
    ],
  },
  {
    heading: "Allergens and product expectations",
    paragraphs: [
      "Products may contain or come into contact with milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, and cookie ingredients. Customers are responsible for reviewing available ingredient and allergen information before ordering and for raising questions before payment.",
      "Because products are handmade, reasonable differences in appearance, coating distribution, size, and presentation may occur. Images are representative and are not a guarantee of exact appearance.",
    ],
  },
  {
    heading: "Disclaimer of warranties and limitation of liability",
    paragraphs: [
      "To the extent permitted by applicable law, preview and educational features are provided on an as-available basis without a guarantee that they will always be uninterrupted or error-free. TsokoLitaw does not guarantee results based solely on mock content, test data, or unavailable features.",
      "To the extent permitted by applicable law, TsokoLitaw and the project's developers, administrators, educators, and institution will not be liable for indirect, incidental, or consequential loss caused by unauthorized use, reliance on clearly identified mock content, or misuse of test or payment features. Nothing in these terms excludes a responsibility or customer right that cannot lawfully be excluded.",
    ],
  },
  {
    heading: "Indemnification",
    paragraphs: [
      "To the extent permitted by applicable law, a user agrees to be responsible for claims, losses, or costs arising from that user's fraud, unlawful conduct, unauthorized testing, infringement, or material violation of these terms. This provision does not apply to loss caused by TsokoLitaw's own unlawful conduct or obligations that cannot legally be transferred.",
    ],
  },
  {
    heading: "Intellectual property and educational fair use",
    paragraphs: [
      "The TsokoLitaw name, original content, product presentation, software, and project materials may not be copied or commercially reused without permission. Third-party names, logos, images, or references used for academic illustration remain the property of their respective owners and are not presented as sponsorship or ownership by TsokoLitaw.",
    ],
  },
  {
    heading: "Disputes, severability, and changes",
    paragraphs: [
      "Customers should first raise an order or payment concern through tsokolitaw@gmail.com so the parties can attempt an informal resolution. These terms are governed by applicable Philippine law.",
      "If any provision is found invalid or unenforceable, the remaining provisions continue to apply. TsokoLitaw may update these terms as the project, payment channels, or operating model changes; the version accepted during checkout governs that order unless applicable law requires otherwise.",
    ],
  },
  {
    heading: "Electronic acceptance",
    paragraphs: [
      "Selecting the Terms & Conditions checkbox and continuing through checkout records the customer's electronic acceptance of these terms, the Privacy Policy, allergen notice, pickup window, and no-show policy. Customers should review the displayed version before placing each order.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms & Conditions"
      introduction="These terms govern use of the TsokoLitaw academic e-commerce platform, including live food orders, payments, and campus pickup."
      sections={sections}
      documentNote="Educational project terms · Last updated September 1, 2026"
    />
  );
}
