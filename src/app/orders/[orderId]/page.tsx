import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Order Detail | TsokoLitaw" };

export default async function OrderDetailPage({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  await requireCustomer(`/orders/${orderId}`);
  notFound();
}
