import type { Metadata } from "next";
import Link from "next/link";
import { CustomerPageShell } from "@/components/customer/customer-page-shell";
import { SiteContainer } from "@/components/layout/site-container";
import { OrdersList } from "@/components/orders/orders-list";
import { requireCustomer } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/server-orders";

export const metadata: Metadata = {
  title: "Orders | TsokoLitaw",
  description: "View current TsokoLitaw orders and pickup history.",
};

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const profile = await requireCustomer("/orders");
  const { cursor } = await searchParams;
  const cursorValue = typeof cursor === "string" ? cursor : undefined;
  const ordersPage = await getCustomerOrders(profile.id, cursorValue);

  return (
    <CustomerPageShell activePath="/orders">
      <SiteContainer className="py-8 sm:py-12">
        <div className="mb-6 flex flex-col gap-5 rounded-card border border-border bg-surface p-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">My orders</h1>
            <p className="mt-3 text-muted-foreground">Track payment, preparation, pickup, and completed orders.</p>
          </div>
          <Link href="/our-creations" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-surface">Build a box</Link>
        </div>
        <OrdersList
          orders={ordersPage.orders}
          nextCursor={ordersPage.nextCursor}
          showingOlderPage={Boolean(cursorValue)}
        />
      </SiteContainer>
    </CustomerPageShell>
  );
}
