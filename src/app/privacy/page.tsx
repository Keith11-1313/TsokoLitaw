import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = { title: "Privacy | TsokoLitaw" };

const sections: readonly LegalSection[] = [
  { heading: "Information we collect", paragraphs: ["The connected application may collect account identity, contact details, order information, pickup preferences, payment references, and feedback needed to provide the service."] },
  { heading: "How information is used", paragraphs: ["Information will be used to fulfill orders, confirm pickup, provide support, prevent fraud, improve products, and meet legal or accounting obligations."] },
  { heading: "Payments and service providers", paragraphs: ["Payment details will be processed by an approved payment provider. TsokoLitaw will store only the references and status information needed to reconcile an order."] },
  { heading: "Retention and security", paragraphs: ["Customer information will be retained only as long as operationally or legally required. Access to administrative data will be restricted and authorized on the server."] },
  { heading: "Your choices", paragraphs: ["Customers may request correction or deletion of eligible personal information by contacting tsokolitaw@gmail.com. Final procedures will be published before launch."] },
];

export default function PrivacyPage() {
  return <LegalDocumentPage title="Privacy" introduction="This preview explains how TsokoLitaw intends to handle customer information once account, ordering, and payment services are connected." sections={sections} />;
}
