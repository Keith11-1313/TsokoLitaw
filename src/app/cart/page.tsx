import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/cart-page-content";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { getAuthProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Cart | TsokoLitaw",
  robots: { index: false, follow: false },
};
export default async function CartPage() {
  const profile = await getAuthProfile();
  if (profile?.role === "admin") redirect("/admin");
  return (
    <CustomerPageShell>
      <SiteContainer className="py-8 sm:py-12">
        <CartPageContent />
      </SiteContainer>
    </CustomerPageShell>
  );
}
