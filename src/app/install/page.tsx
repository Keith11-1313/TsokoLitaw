import type { Metadata } from "next";
import Image from "next/image";
import { ChevronDown, ExternalLink, Smartphone } from "lucide-react";
import { CustomerPageHeading } from "@/components/customer/customer-page-heading";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "Install TsokoLitaw | Home Screen Guide",
  description: "Add TsokoLitaw to your phone’s home screen with easy steps for your browser.",
  alternates: { canonical: "/install" },
};

const guides = [
  {
    name: "Chrome",
    steps: [
      "Open www.tsokolitaw.com in Chrome.",
      "Tap the three-dot menu beside the address bar.",
      "Tap Add to home screen. Choose Create shortcut or Install if your browser offers a choice.",
      "Keep the name TsokoLitaw and confirm Add or Install. Follow your phone’s placement prompt.",
    ],
    source: "https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en",
  },
  {
    name: "Safari",
    steps: [
      "Open www.tsokolitaw.com in Safari.",
      "Open the Share menu (the square with an upward arrow). You may need to open the More menu first.",
      "Scroll through the actions and tap Add to Home Screen. If it is missing, use Edit Actions to add it.",
      "Keep the name TsokoLitaw. If Open as Web App is offered, leave it on, then tap Add.",
    ],
    source: "https://support.apple.com/guide/iphone/iphea86e5236/ios",
  },
  {
    name: "Opera",
    steps: [
      "Open www.tsokolitaw.com in Opera.",
      "Open the menu at the right of the address bar.",
      "Choose Add to or Add bookmark, then select Home screen rather than Speed Dial.",
      "Confirm the name TsokoLitaw and tap Add. If your Opera version does not offer Home screen, use Chrome instead.",
    ],
    source: "https://help.opera.com/en/mobile/android/",
  },
  {
    name: "Firefox",
    steps: [
      "Open www.tsokolitaw.com in Firefox.",
      "Open the browser menu beside the address bar.",
      "Choose Add to Home screen. Some versions show Add page to first, or offer Install for supported sites.",
      "Keep the name TsokoLitaw and confirm Add. If the option is unavailable, use Chrome instead.",
    ],
    source: "https://support.mozilla.org/en-US/kb/how-add-shortcut-website-android",
  },
  {
    name: "Brave",
    steps: [
      "Open www.tsokolitaw.com in Brave.",
      "Open the three-dot browser menu.",
      "Look for Add to Home screen or Install app and select it if available.",
      "Confirm the name and tap Add or Install. If neither option appears, open the website in Chrome and follow its guide.",
    ],
  },
  {
    name: "DuckDuckGo",
    source: "https://duckduckgo.com/duckduckgo-help-pages/",
    sourceLabel: "DuckDuckGo help center",
    steps: [
      "Open www.tsokolitaw.com in the DuckDuckGo browser.",
      "On Android, open the browser menu and look for Add to Home Screen. On iPhone or iPad, look in the Share menu.",
      "If available, select Add to Home Screen, keep the name TsokoLitaw and confirm Add.",
      "If the option is missing, open the website in Chrome on Android or Safari on iPhone and follow its guide above.",
    ],
  },
] as const;

export default function InstallPage() {
  return (
    <CustomerPageShell>
      <SiteContainer className="py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <CustomerPageHeading
            title="TsokoLitaw, one tap away"
            description="Add us to your home screen. Choose your browser below to get started."
          />
          <div className="mt-7 flex items-center gap-3 rounded-card border border-border bg-surface-muted p-5">
            <Smartphone aria-hidden="true" className="size-6 shrink-0 text-brand" />
            <p className="text-sm leading-6 text-muted-foreground">
              This adds a website shortcut or web app, depending on your phone and browser. You
              still need internet to browse and order. No APK download is needed.
            </p>
          </div>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {guides.map((guide) => (
              <details key={guide.name} name="browser-install-guide" className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-4">
                    <Image
                      src={`/images/browsers/${guide.name.toLowerCase()}.webp`}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0 object-contain"
                      unoptimized
                    />
                    <span className="font-display text-xl">{guide.name}</span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-brand transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <div className="px-5 pb-6">
                  <ol className="space-y-4">
                    {guide.steps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm leading-6">
                        <span
                          aria-hidden="true"
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand"
                        >
                          {index + 1}
                        </span>
                        <span>
                          <span className="sr-only">Step {index + 1}: </span>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {"source" in guide ? (
                    <a
                      href={guide.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {"sourceLabel" in guide ? guide.sourceLabel : "Official browser guide"}
                      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Menu names can vary. If the option is missing, use a regular browser tab instead of
            private browsing or an in-app browser. You can always keep ordering on the website.
          </p>
        </div>
      </SiteContainer>
    </CustomerPageShell>
  );
}
