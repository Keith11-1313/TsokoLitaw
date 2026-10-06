import type { Metadata } from "next";
import policy from "@/content/policies.json";
import { LegalDocumentPage } from "@/components/customer/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy Policy | TsokoLitaw",
  description:
    "How TsokoLitaw collects, uses, shares, protects, retains, and manages customer information.",
  alternates: { canonical: "/privacy" },
};

const sections = policy.privacy;

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      introduction="An explanation of what TsokoLitaw collects, why it is needed, and the choices available to you."
      sections={sections}
      documentNote={`Last updated: ${policy.lastUpdated}`}
    />
  );
}
