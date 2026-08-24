import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = { title: "Terms & Conditions | TsokoLitaw" };

const sections: readonly LegalSection[] = [
  { heading: "Orders and pricing", paragraphs: ["Displayed products, prices, toppings, add-ons, promotions, and availability are previews until confirmed during checkout. Final pricing will be calculated by the server in the connected application."] },
  { heading: "Pickup and preparation", paragraphs: ["Litaws are prepared in small batches. Customers must select an available pickup schedule and arrive within the communicated window.", "Same-day availability is not guaranteed, and operating schedules may change for holidays or campus closures."] },
  { heading: "Payments", paragraphs: ["Orders are confirmed only after verified payment. A redirect or browser message alone will not be treated as proof of payment."] },
  { heading: "Cancellations and no-shows", paragraphs: ["Cancellation eligibility depends on the current preparation status. Orders already being prepared may no longer be cancellable. No-show and refund terms will be finalized before launch."] },
  { heading: "Allergens", paragraphs: ["Products may contain or come into contact with milk, cocoa, sesame, peanuts, and other allergens. Customers should disclose relevant allergies before ordering."] },
];

export default function TermsPage() {
  return <LegalDocumentPage title="Terms & Conditions" introduction="These preview terms outline the ordering rules that will govern the TsokoLitaw customer experience." sections={sections} />;
}
