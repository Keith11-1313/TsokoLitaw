import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy | TsokoLitaw",
  description: "How TsokoLitaw collects, uses, protects, and manages customer information.",
  alternates: { canonical: "/privacy" },
};

const sections: readonly LegalSection[] = [
  {
    heading: "Who is responsible for your information",
    paragraphs: [
      "TsokoLitaw operates this academic online-ordering service for campus pickup. Questions or privacy requests may be sent to tsokolitaw@gmail.com.",
    ],
  },
  {
    heading: "Information we collect",
    paragraphs: [
      "When you sign in, we receive the account identifiers and basic profile details supplied through Google and Supabase authentication, including your name and email address. You may also provide a mobile number.",
      "When you shop or contact us, we process cart selections, order and pickup details, customer notes, Terms acceptance, payment and refund references and statuses, loyalty activity, reviews, account-deletion requests, and technical security or delivery records needed to operate the service. TsokoLitaw does not store your full card, e-wallet, or online-banking credentials.",
    ],
  },
  {
    heading: "Why we use information",
    paragraphs: [
      "We use personal information to authenticate accounts; price, accept, prepare, and release orders; reserve inventory; process and reconcile payments, cancellations, refunds, and loyalty rewards; send transactional updates; provide support; prevent misuse; maintain security and audit records; and comply with applicable legal or accounting duties.",
      "We do not use transactional email enrollment as consent for unrelated marketing. If TsokoLitaw later offers marketing messages, that use will require a separate, clear choice where applicable.",
    ],
  },
  {
    heading: "Service providers and disclosures",
    paragraphs: [
      "TsokoLitaw uses Google for sign-in, Supabase for authentication and application data, Vercel for application hosting, PayMongo for payment and refund processing, and Resend for transactional email delivery. These providers receive only the information needed for their service and process it under their own terms and privacy commitments.",
      "Authorized TsokoLitaw administrators may access customer and order information only for fulfillment, support, refund, moderation, security, and operational purposes. We may also disclose information when required by law or necessary to protect customers, the service, or legal rights.",
    ],
  },
  {
    heading: "Retention, account deletion, and security",
    paragraphs: [
      "We retain information only while it is needed for the stated purposes, legitimate operational or legal requirements, dispute resolution, security, and recordkeeping. An eligible customer may schedule account deletion from Profile; the current service provides a 90-day cancellation period before deactivation. Active orders or refunds may delay the request, and historical transaction records may be retained where necessary even after account access is deactivated.",
      "We use access controls, server-side authorization, database row-level security, encryption for manual refund destination details, signed provider webhooks, rate limits, and restricted administrative access. No internet service can promise absolute security, but suspected incidents are assessed and handled under applicable requirements.",
    ],
  },
  {
    heading: "Your privacy rights and choices",
    paragraphs: [
      "Subject to applicable law and valid limitations, you may ask to be informed about processing, access or correct your information, object to certain processing, request erasure or blocking, obtain portable data where applicable, and raise a complaint. You can edit supported profile details or schedule and cancel eligible account deletion from Profile, or contact tsokolitaw@gmail.com for assistance.",
      "If a concern is not resolved, you may consult or file a complaint with the Philippine National Privacy Commission. We may need to verify your identity before fulfilling a request so another person cannot obtain or alter your information.",
    ],
  },
  {
    heading: "Changes to this notice",
    paragraphs: [
      "We may update this notice when the service, providers, or legal requirements change. Material changes will be posted here with a revised update date, and additional notice will be given when required.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy"
      introduction="This notice explains how TsokoLitaw handles personal information when you use the website, place an order, pay, request a refund, or contact us."
      sections={sections}
      documentNote="Privacy notice · Last updated August 30, 2026"
    />
  );
}
