import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
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
      <SiteContainer className="pt-8 pb-28 sm:py-12">
        <div className="mb-6 flex items-end justify-between sm:mb-9">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">My orders</h1>
          </div>
          <Link
            href="/our-creations"
            className="hidden min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:inline-flex"
          >
            Build a box
          </Link>
        </div>
        <OrdersList
          orders={ordersPage.orders}
          nextCursor={ordersPage.nextCursor}
          showingOlderPage={Boolean(cursorValue)}
        />
        <Link
          href="/our-creations"
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-surface shadow-[0_8px_24px_rgba(54,30,10,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
        >
          <Plus aria-hidden="true" size={20} />
          Build a box
        </Link>
      </SiteContainer>
    </CustomerPageShell>
  );
}
