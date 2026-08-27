import type { Metadata } from "next";
import Link from "next/link";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { OrdersList } from "@/components/orders/orders-list";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Orders | TsokoLitaw",
  description: "View current TsokoLitaw orders and pickup history.",
};

export default async function OrdersPage() {
  await requireCustomer("/orders");

  return (
    <CustomerPageShell activePath="/orders">
      <SiteContainer className="py-12 sm:py-16">
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">My orders</h1>
            <p className="mt-3 text-muted-foreground">Your online order history will appear here.</p>
          </div>
          <Link href="/our-creations" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-surface">Build a box</Link>
        </div>
        <OrdersList />
      </SiteContainer>
    </CustomerPageShell>
  );
}
