import type { Metadata } from "next";
import { LegalDocumentPage, type LegalSection } from "@/components/customer/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy Policy | TsokoLitaw",
  description:
    "How TsokoLitaw collects, uses, shares, protects, retains, and manages customer information.",
  alternates: { canonical: "/privacy" },
};

const sections: readonly LegalSection[] = [
  {
    heading: "Scope and contact",
    paragraphs: [
      "This policy explains how TsokoLitaw handles personal information through its website, customer accounts, campus-pickup ordering, payments, reviews, support, and related administrative operations. TsokoLitaw is responsible for deciding why and how this information is used for the service.",
      "Privacy questions, requests, or concerns may be sent to tsokolitaw@gmail.com. Please do not email passwords, wallet credentials, or unnecessary financial information.",
    ],
  },
  {
    heading: "Information we collect",
    paragraphs: [
      "Account information includes the identifiers, name, email address, and basic profile details supplied through Google and Supabase authentication. TsokoLitaw does not collect a mobile number and does not receive your Google password.",
      "Order information includes cart selections, quantities, prices, discounts, pickup details, customer notes, accepted policy version, status history, loyalty activity, and support records. Cart contents may be kept in your browser until checkout; the server recalculates the authoritative price and availability when an order is placed.",
      "Payment information includes the chosen method, order total, provider references, payment and verification status, and related audit records. For Manual GCash, we privately store the submitted receipt plus the customer-reported reference, amount, payment time, and recipient. Optional receipt extraction runs in your browser and is not sent to an external OCR service. TsokoLitaw does not store your wallet or online-banking login credentials.",
      "Content you choose to provide may include a review, rating, tasting highlights, review images, and messages sent for support. Operational records may include authentication sessions, security and rate-limit events, transactional-email delivery data, webhook events, administrative actions, and account-deletion requests.",
    ],
  },
  {
    heading: "How information is obtained",
    paragraphs: [
      "Information comes from you when you sign in, place or manage an order, submit payment details, write a review, request account deletion, or contact TsokoLitaw. We also receive limited status and reference information from service providers when they authenticate an account, confirm a payment, or report delivery of a transactional email.",
      "Required fields are identified in the interface. If required account, order, payment, or pickup information is not provided, TsokoLitaw may be unable to create, verify, prepare, or release the order.",
    ],
  },
  {
    heading: "Why we use information",
    paragraphs: [
      "We use information to authenticate and protect accounts; calculate prices; create and fulfill orders; reserve inventory; verify payments; manage pickup, cancellations, and loyalty rewards; send transactional updates; moderate reviews; provide support; investigate misuse; maintain audit and security records; and meet applicable legal, accounting, or dispute-resolution duties.",
      "Processing is limited to what is necessary for the requested service, compliance obligations, security and legitimate operational needs, or consent where consent is the appropriate basis. Transactional email is not treated as permission for unrelated marketing. TsokoLitaw does not sell personal information or use it for third-party behavioral advertising.",
    ],
  },
  {
    heading: "Providers and disclosures",
    paragraphs: [
      "TsokoLitaw uses Google for sign-in, Supabase for authentication, database and file storage, Vercel for application hosting, PayMongo for supported online payment processing, and Resend for transactional email delivery. These providers receive the information needed to perform their roles and may process it in locations outside the Philippines under their own terms, safeguards, and privacy commitments.",
      "Authorized TsokoLitaw administrators may access information only for fulfillment, payment review, customer support, moderation, security, and operational administration. Information may also be disclosed when reasonably necessary to comply with law, respond to a lawful request, investigate fraud or security incidents, enforce these policies, or protect customers and legal rights.",
    ],
  },
  {
    heading: "Reviews and public information",
    paragraphs: [
      "New reviews are not public until an Admin approves them. A published review may display the submitted rating, comment, selected highlights, approved images, review date, ordered items, and a customer display name. It does not intentionally publish the customer email address or private Storage path.",
      "Do not include another person's private information, payment details, or confidential material in a review or image. Contact TsokoLitaw if published content needs correction or removal; requests remain subject to applicable rights, recordkeeping needs, and dispute evidence.",
    ],
  },
  {
    heading: "Retention and account deletion",
    paragraphs: [
      "Information is retained only as long as reasonably needed for fulfillment, payment verification, support, security, audit, dispute handling, legal or accounting duties, and the purposes explained here. Different records may require different retention periods. Data that is no longer required should be deleted, anonymized, or access-restricted where appropriate.",
      "Eligible customers may schedule account deletion from Profile and cancel during the 90-day grace period. Active orders must be resolved first. When the request becomes due, the service deactivates the TsokoLitaw profile and blocks account access; it does not delete the external Google account. Order, payment, audit, and other relational records may remain when necessary for legitimate recordkeeping, legal claims, security, or obligations that survive deactivation.",
    ],
  },
  {
    heading: "Security and incidents",
    paragraphs: [
      "TsokoLitaw uses server-side authorization, restricted Admin access, database access policies, private receipt and review-image storage, signed provider webhooks, rate limits, audit records, and other reasonable technical and organizational safeguards. Access is limited according to operational need.",
      "No online service can guarantee absolute security. Suspected incidents are assessed, contained, documented, and reported to affected people or authorities when required. Customers should protect their Google account and promptly report suspicious TsokoLitaw account activity.",
    ],
  },
  {
    heading: "Your rights and choices",
    paragraphs: [
      "Subject to the Data Privacy Act of 2012 and applicable limitations, you may ask to be informed about processing; access or correct personal information; object to certain processing; request erasure or blocking; obtain portable data where applicable; withdraw consent where processing depends on consent; seek damages; or file a complaint. Some requests may be limited when information remains necessary for an order, legal obligation, legitimate business purpose, security, or a legal claim.",
      "Supported profile information can be edited in your account. Other requests may be sent to tsokolitaw@gmail.com. We may verify your identity and ask for enough detail to locate the relevant records. If a privacy concern is not resolved, you may contact the Philippine National Privacy Commission.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "This policy may be updated when the service, providers, operating model, or legal requirements change. The revised date will appear on this page. Material changes will receive additional notice when appropriate or legally required, and a new checkout policy version may require acceptance before another order is placed.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      introduction="A plain-language explanation of what TsokoLitaw collects, why it is needed, and the choices available to you."
      sections={sections}
      documentNote="Effective September 29, 2026"
    />
  );
}
