import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Mail } from "lucide-react";
import { CustomerPageHeading } from "@/components/customer/customer-page-heading";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | TsokoLitaw",
  description:
    "Answers about TsokoLitaw products, online ordering, payments, campus pickup, loyalty rewards, reviews, and accounts.",
  alternates: { canonical: "/faq" },
};

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

interface FaqGroup {
  title: string;
  items: readonly FaqItem[];
}

const faqGroups: readonly FaqGroup[] = [
  {
    title: "TsokoLitaw and your order",
    items: [
      {
        question: "What is TsokoLitaw?",
        answer:
          "TsokoLitaw is our soft, chewy take on Filipino palitaw with a chocolate center and your choice of coating. Orders are prepared for pickup at the University of Caloocan City Congressional Campus.",
      },
      {
        question: "What box sizes can I order?",
        answer:
          "You can choose a 4-piece TsokoMini, 6-piece TsokoMore, or 8-piece TsokoMuch box. You can use one coating for the whole box or mix coatings as long as the selected pieces add up to the box size.",
      },
      {
        question: "What is the difference between a coating and an extra?",
        answer:
          "A coating is the finish selected for each TsokoLitaw piece. An extra is an optional addition for the box. The builder shows the current choices and any added cost before you place the item in your cart.",
      },
      {
        question: "Is sea salt cream included with my box?",
        answer:
          "Yes. One portion of sea salt cream is included with every box at no extra charge. You can choose an additional extra in the builder if one is available; its price is shown before you add the box to your cart.",
      },
      {
        question: "Can the price in my cart change?",
        answer:
          "Your cart is saved in your browser, but checkout reloads the current product prices, coatings, extras, rewards, and availability. Review the final total shown at checkout before placing your order.",
      },
      {
        question: "Do I need an account to order?",
        answer:
          "You can browse without signing in, but checkout requires a TsokoLitaw account using Google sign-in. Your account keeps your orders, payment status, pickup details, loyalty progress, and eligible reviews together.",
      },
    ],
  },
  {
    title: "Pickup and availability",
    items: [
      {
        question: "Do you offer delivery or shipping?",
        answer:
          "No. TsokoLitaw currently offers campus pickup only. The available dates, time windows, and locations shown at checkout are the schedules that have been published for ordering.",
      },
      {
        question: "Why is a pickup date or time unavailable?",
        answer:
          "A schedule may be unpublished, full, past its ordering cutoff, outside the preparation lead time, or short on ready stock. Choose another option shown at checkout or check again when new schedules are published.",
      },
      {
        question: "Where can I see my pickup details?",
        answer: (
          <>
            Open <Link href="/orders">My Orders</Link> and select the order. The saved order detail
            is the source for its pickup date, time, location, items, and current status.
          </>
        ),
      },
      {
        question: "What happens if I miss my pickup?",
        answer:
          "Contact TsokoLitaw as soon as possible. Prepared and missed-pickup orders are ordinarily non-refundable because ingredients and preparation have already been committed, subject to rights that cannot legally be waived.",
      },
      {
        question: "Can someone else collect my order?",
        answer:
          "If another person will collect it, contact TsokoLitaw before pickup. They may be asked for enough order information to make sure the box is released to the correct person.",
      },
    ],
  },
  {
    title: "Payments and changes",
    items: [
      {
        question: "Which payment methods are available?",
        answer:
          "The methods shown depend on the current checkout mode. You may see PayMongo QR Ph, Manual GCash, or Pay at the Counter. Use only the method saved with your order.",
      },
      {
        question: "How does Manual GCash verification work?",
        answer:
          "Send the exact order total to the recipient shown on your order, then submit the requested receipt and transaction details. An Admin verifies the actual incoming transaction. A screenshot, receipt image, or extracted text alone is not proof of payment.",
      },
      {
        question: "How does Pay at the Counter work?",
        answer:
          "Place the order through the website first, then pay at campus pickup. The order remains payment-pending until an Admin records the payment, and it must be confirmed before the order can be completed.",
      },
      {
        question: "What should I do if payment fails or expires?",
        answer: (
          <>
            Do not pay twice. Check the order in <Link href="/orders">My Orders</Link> for its saved
            status and any available payment action. If money was sent but the order was not
            updated, contact support with the order number and transaction reference.
          </>
        ),
      },
      {
        question: "Can I cancel or change an order?",
        answer:
          "The website can cancel only a pending, unpaid order. It does not edit an order after checkout. For a paid order or another correction, contact TsokoLitaw so the concern can be reviewed against the saved order and payment records.",
      },
    ],
  },
  {
    title: "Rewards, reviews, and product care",
    items: [
      {
        question: "How does the loyalty reward work?",
        answer:
          "Seven completed orders earn one eligible free 4-piece base box. Coating and extra charges still apply. The reward appears during checkout when your account is eligible and can be used only once.",
      },
      {
        question: "When can I leave a review?",
        answer:
          "After an order is completed, its owner can submit one review from the order detail page. A rating is required, while the comment, tasting highlights, and images are optional. Reviews are checked by an Admin before they appear publicly.",
      },
      {
        question: "Can I add photos to my review?",
        answer:
          "Yes. You can add up to five photos when submitting a review. The form prepares supported phone photos before upload and will tell you if a photo cannot be used.",
      },
      {
        question: "Can I edit or remove a review after submitting it?",
        answer: (
          <>
            There is no self-service edit or delete option. Email{" "}
            <a href="mailto:tsokolitaw@gmail.com">tsokolitaw@gmail.com</a> if your review needs
            correction or removal.
          </>
        ),
      },
      {
        question: "What allergens should I consider?",
        answer:
          "TsokoLitaw may contain or come into contact with milk, cocoa or chocolate ingredients, sesame, peanuts or other nuts, coconut, cookie ingredients, and other allergens used during preparation. Cross-contact cannot be ruled out, so ask before ordering if you have an allergy or dietary concern.",
      },
      {
        question: "How should I store or reheat TsokoLitaw?",
        answer:
          "TsokoLitaw is best enjoyed fresh. Pick it up on time, store it appropriately after release, and follow any care or reheating guidance provided with your order. Do not eat a product that appears unsafe.",
      },
    ],
  },
  {
    title: "Account and support",
    items: [
      {
        question: "Where can I update my account information?",
        answer: (
          <>
            Open your <Link href="/profile">Account</Link> page to review the profile options
            available to you. TsokoLitaw uses your account email for order and support communication
            and does not collect a mobile number.
          </>
        ),
      },
      {
        question: "What happens when I schedule account deletion?",
        answer:
          "Eligible accounts enter a 90-day grace period that can be cancelled before it ends. Active orders must be resolved first. When deletion becomes due, TsokoLitaw access is deactivated, but your external Google account is not deleted and required transaction or audit records may be retained.",
      },
      {
        question: "How do I report a problem with an order?",
        answer: (
          <>
            Email <a href="mailto:tsokolitaw@gmail.com">tsokolitaw@gmail.com</a> with your order
            number and a clear description of the problem. Include only the transaction details or
            photos needed to investigate, and never send a password or wallet login.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-10 sm:py-14 lg:py-16">
        <CustomerPageHeading
          title="Frequently asked questions"
          description="Everything you need to know before ordering, paying, and picking up your TsokoLitaw."
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-16">
          <div className="space-y-10">
            {faqGroups.map((group) => (
              <section key={group.title} aria-labelledby={`faq-${slugify(group.title)}`}>
                <h2
                  id={`faq-${slugify(group.title)}`}
                  className="font-display text-2xl text-foreground sm:text-3xl"
                >
                  {group.title}
                </h2>
                <div className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                  {group.items.map((item) => (
                    <details key={item.question} className="group">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:px-6 [&::-webkit-details-marker]:hidden">
                        <span>{item.question}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className="size-5 shrink-0 text-brand transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                        />
                      </summary>
                      <div className="px-5 pb-5 text-sm leading-7 text-muted-foreground sm:px-6 sm:text-base [&_a]:font-bold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4">
                        <p>{item.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="rounded-card border border-border bg-surface-muted p-6 lg:sticky lg:top-28">
            <Mail aria-hidden="true" className="size-7 text-brand" />
            <h2 className="mt-4 font-display text-2xl text-foreground">Still need help?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Send us your order number and a short description so we can look into it.
            </p>
            <a
              href="mailto:tsokolitaw@gmail.com"
              className="mt-5 inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              tsokolitaw@gmail.com
            </a>
          </aside>
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}
