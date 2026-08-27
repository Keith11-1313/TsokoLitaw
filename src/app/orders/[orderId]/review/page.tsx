import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Review Order | TsokoLitaw" };

export default async function ReviewOrderPage({ params }: PageProps<"/orders/[orderId]/review">) {
  const { orderId } = await params;
  await requireCustomer(`/orders/${orderId}/review`);
  notFound();
}
