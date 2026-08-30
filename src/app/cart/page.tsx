import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart/cart-page-content";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";

export const metadata: Metadata = {
  title: "Cart | TsokoLitaw",
  robots: { index: false, follow: false },
};
export default function CartPage() { return <CustomerPageShell><SiteContainer className="py-12 sm:py-16"><CartPageContent /></SiteContainer></CustomerPageShell>; }
