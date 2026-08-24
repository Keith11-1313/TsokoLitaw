import type { Metadata } from "next";
import { Eye, FileText, Megaphone, Video } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/admin-page-layout";
import { MockAdminAction } from "@/components/admin/mock-admin-action";
import { SecondaryButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Journal | TsokoLitaw Admin" };

const posts = [
  { title: "Campus pickup schedule this week", type: "Announcement", status: "Published", date: "Aug 25, 2026", icon: Megaphone },
  { title: "A morning batch at UCC", type: "Story", status: "Published", date: "Aug 20, 2026", icon: Video },
  { title: "Building a mixed box", type: "Product feature", status: "Draft", date: "Aug 23, 2026", icon: FileText },
] as const;

export default function AdminJournalPage() {
  return (
    <AdminPageLayout
      activePath="/admin/journal"
      title="Journal Management"
      description="Manage mock announcements, stories, product features, and community highlights."
      purpose="Create and organize public updates beyond product ordering."
      customerImpact="Published posts will appear on the customer Journal page."
      actions={<MockAdminAction label="New Post" title="Create mock Journal post" fieldLabel="Post title" />}
    >
      <section className="grid gap-5 lg:grid-cols-2">
        {posts.map((post) => {
          const Icon = post.icon;
          return (
            <article key={post.title} className="rounded-card border border-border bg-surface p-6">
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-brand"><Icon aria-hidden="true" /></span>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{post.type}</p>
                  <h2 className="mt-1 font-display text-2xl">{post.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{post.date}</p>
                </div>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${post.status === "Published" ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{post.status}</span>
              </div>
              <div className="mt-6 flex gap-3">
                <SecondaryButton type="button" disabled className="flex-1">Edit</SecondaryButton>
                <SecondaryButton type="button" disabled className="flex-1"><Eye size={16} />Preview</SecondaryButton>
              </div>
            </article>
          );
        })}
      </section>
      <section className="mt-6 rounded-card border border-border bg-surface p-6">
        <h2 className="font-display text-2xl">Community highlights</h2>
        <p className="mt-2 text-sm text-muted-foreground">Choose reviews from completed orders to feature in the public Journal. Selection persistence will be connected later.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex gap-3 rounded-control bg-surface-control p-4 text-sm"><input type="checkbox" defaultChecked className="mt-1 accent-brand" /><span><strong>Maria S. · 5 stars</strong><span className="mt-1 block text-muted-foreground">Soft, warm, and perfect for sharing.</span></span></label>
          <label className="flex gap-3 rounded-control bg-surface-control p-4 text-sm"><input type="checkbox" defaultChecked className="mt-1 accent-brand" /><span><strong>Arnel P. · 5 stars</strong><span className="mt-1 block text-muted-foreground">Clear pickup and a gooey center.</span></span></label>
        </div>
      </section>
    </AdminPageLayout>
  );
}
