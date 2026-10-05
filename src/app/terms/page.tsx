import type { Metadata } from "next";
import policy from "@/content/policies.json";
import { LegalDocumentPage } from "@/components/customer/legal-document-page";

export const metadata: Metadata = {
  title: "Terms & Conditions | TsokoLitaw",
  description: "Terms for TsokoLitaw accounts, orders, payments, cancellations, and campus pickup.",
  alternates: { canonical: "/terms" },
};

const sections = policy.terms;

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms & Conditions"
      introduction="The operating rules for accounts, real orders, payments, and campus pickup through TsokoLitaw."
      sections={sections}
      documentNote={`Last updated: ${policy.lastUpdated}`}
    />
  );
}
