import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = { title: "Terms & Conditions | TsokoLitaw" };

const sections: readonly LegalSection[] = [
  { heading: "Orders and pricing", paragraphs: ["Displayed products, prices, coatings, add-ons, promotions, and availability are previews until confirmed during checkout. Final pricing will be calculated by the server in the connected application."] },
  { heading: "Pickup and preparation", paragraphs: ["Litaws are prepared in small batches. Customers must select an available pickup schedule and arrive within the communicated window.", "Same-day availability is not guaranteed, and operating schedules may change for holidays or campus closures."] },
  { heading: "Payments", paragraphs: ["Orders are confirmed only after verified payment. A redirect or browser message alone will not be treated as proof of payment."] },
  { heading: "Cancellations, refunds, and no-shows", paragraphs: ["Customers may request cancellation through the Confirmed stage. An unpaid cancellation releases the reservation; an eligible paid cancellation starts a full refund to the original PayMongo payment method.", "Cancellation and standard refund eligibility end once an order enters Preparing. Prepared orders, ready-for-pickup orders, completed orders, and missed pickups are non-refundable because the product has already been made. Refund processing remains separate from order cancellation and is complete only after provider confirmation."] },
  { heading: "Allergens", paragraphs: ["Products may contain or come into contact with milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, and cookie ingredients."] },
];

export default function TermsPage() {
  return <LegalDocumentPage title="Terms & Conditions" introduction="These preview terms outline the ordering rules that will govern the TsokoLitaw customer experience." sections={sections} />;
}
