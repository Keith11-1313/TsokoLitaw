import { redirect } from "next/navigation";

export default async function LegacyReviewOrderPage({ params }: PageProps<"/orders/[orderId]/review">) {
  const { orderId } = await params;
  redirect(`/orders/${orderId}`);
}
