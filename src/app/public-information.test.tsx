import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import FaqPage from "./faq/page";
import TermsPage from "./terms/page";
import PrivacyPage from "./privacy/page";

vi.mock("@/components/customer/customer-page-shell", () => ({
  CustomerPageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

describe("Public information copy", () => {
  it.each([FaqPage, TermsPage, PrivacyPage])("shows the owner-requested update date", (Page) => {
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain("Last updated:");
    expect(html).toContain("October 1, 2026");
    expect(html).not.toContain("Effective September 29, 2026");
    expect(html).not.toContain("October 14, 2025");
  });

  it("explains current order filters, review preparation, and home-screen access", () => {
    const html = renderToStaticMarkup(<FaqPage />);
    expect(html).toContain("All, Active, and Past");
    expect(html).toContain("HEIC, HEIF, JPG, JPEG, PNG, or WebP");
    expect(html).toContain('href="/install"');
    expect(html).toContain("not an APK download");
    expect(html).toContain("no self-service edit or delete option");
  });

  it("describes prepared-image storage and masked public review names", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("prepared images, not the original camera files");
    expect(html).toContain("masked display name");
    expect(html).toContain("owner and authorized Admins before publication");
  });

  it("preserves unpaid cancellation and does not promise offline ordering", () => {
    const html = renderToStaticMarkup(<TermsPage />);
    expect(html).toContain("only while an order is pending and unpaid");
    expect(html).toContain("does not provide an Android APK or offline ordering");
    expect(html).toContain("per-piece charges");
  });
});
