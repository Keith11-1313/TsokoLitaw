import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { JournalManager } from "@/components/admin/journal-manager";
import { ReviewManagementTable } from "@/components/admin/review-management-table";
import { AdminContent } from "@/components/layout/admin-content";
import { requireAdmin } from "@/lib/auth";
import { getAdminJournalPosts } from "@/lib/server-journal";
import { getAdminReviews } from "@/lib/server-reviews";

export const metadata: Metadata = {
  title: "Journal & Reviews | TsokoLitaw Admin",
  description: "Publish Journal updates and moderate completed-order reviews.",
};

export default async function AdminJournalPage() {
  await requireAdmin("/admin/journal");
  const [posts, reviews] = await Promise.all([
    getAdminJournalPosts(),
    getAdminReviews(),
  ]);
  const average = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <AdminShell activePath="/admin/journal">
      <AdminContent>
        <header>
          <h1 className="font-display text-[2.25rem] leading-tight text-foreground">Journal & Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publish customer updates and choose verified order reviews for Community highlights.</p>
        </header>

        <section className="mt-8" aria-labelledby="journal-posts-title">
          <div>
            <h2 id="journal-posts-title" className="font-display text-3xl">Journal posts</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create drafts or publish announcements, stories, product features, and videos.</p>
          </div>
          <JournalManager posts={posts} />
        </section>

        <section id="reviews" className="mt-14 scroll-mt-6" aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="font-display text-3xl">Completed-order reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shown reviews are public. Featured reviews also appear in the customer Journal.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <AdminStatCard compact label="Average rating" value={average} />
            <AdminStatCard compact label="Visible" value={String(reviews.filter((review) => review.isVisible).length)} />
            <AdminStatCard compact label="Featured" value={String(reviews.filter((review) => review.isFeatured).length)} />
          </div>
          <div className="mt-6"><ReviewManagementTable reviews={reviews} /></div>
        </section>
      </AdminContent>
    </AdminShell>
  );
}
