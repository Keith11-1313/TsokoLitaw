import type { Metadata } from "next";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { ReviewManagementTable } from "@/components/admin/review-management-table";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { requireAdmin } from "@/lib/auth";
import { getAdminReviews } from "@/lib/server-reviews";

export const metadata: Metadata = {
  title: "Review Management | TsokoLitaw Admin",
  description: "Moderate verified completed-order reviews.",
};

export default async function AdminReviewsPage() {
  await requireAdmin("/admin/reviews");
  const reviews = await getAdminReviews();
  const average = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <AdminPageLayout
      activePath="/admin/reviews"
      title="Review Management"
      description="Verified reviews submitted from completed customer orders."
      purpose="Moderate reviews and choose which customer comments may later be highlighted."
      customerImpact="Customers can review each completed order once. Hidden reviews are excluded from public reads."
      currentConnection="Connected to real completed-order reviews. Visibility and featured state are saved and audited."
      connected
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminStatCard compact label="Average Rating" value={average} />
        <AdminStatCard compact label="Visible" value={String(reviews.filter((review) => review.isVisible).length)} />
        <AdminStatCard compact label="Featured" value={String(reviews.filter((review) => review.isFeatured).length)} />
      </section>
      <ReviewManagementTable reviews={reviews} />
    </AdminPageLayout>
  );
}
