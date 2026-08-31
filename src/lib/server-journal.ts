import "server-only";

import type {
  JournalContentType,
  JournalIconKey,
  JournalStatus,
} from "@/lib/journal";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateUploadedImage } from "@/lib/server-image-validation";

export interface JournalPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  contentType: JournalContentType;
  iconKey: JournalIconKey;
  displayDate: string;
  coverImageUrl: string | null;
  videoUrl: string | null;
  status: JournalStatus;
  publishedAt: string | null;
}

interface JournalPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  content_type: JournalContentType;
  icon_key: JournalIconKey;
  display_date: string;
  cover_image_url: string | null;
  video_url: string | null;
  status: JournalStatus;
  published_at: string | null;
}

const journalPostColumns = `
  id,
  title,
  slug,
  excerpt,
  content,
  content_type,
  icon_key,
  display_date,
  cover_image_url,
  video_url,
  status,
  published_at
`;

function toJournalPost(row: JournalPostRow): JournalPostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    contentType: row.content_type,
    iconKey: row.icon_key,
    displayDate: row.display_date,
    coverImageUrl: row.cover_image_url,
    videoUrl: row.video_url,
    status: row.status,
    publishedAt: row.published_at,
  };
}

export async function getPublishedJournalPosts(): Promise<JournalPostSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select(journalPostColumns)
    .eq("status", "published")
    .order("display_date", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(30);

  if (error) throw new Error("Published Journal posts could not be loaded.", { cause: error });
  return ((data ?? []) as JournalPostRow[]).map(toJournalPost);
}

export async function getAdminJournalPosts(): Promise<JournalPostSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("journal_posts")
    .select(journalPostColumns)
    .order("display_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new Error("Admin Journal posts could not be loaded.", { cause: error });
  return ((data ?? []) as JournalPostRow[]).map(toJournalPost);
}

export async function saveAdminJournalPost(input: {
  adminId: string;
  postId: string | null;
  title: string;
  excerpt: string;
  content: string;
  contentType: JournalContentType;
  iconKey: JournalIconKey;
  displayDate: string;
  coverImageUrl: string;
  videoUrl: string;
  status: JournalStatus;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("upsert_journal_post", {
    target_admin_id: input.adminId,
    target_post_id: input.postId,
    title_value: input.title,
    excerpt_value: input.excerpt,
    content_value: input.content,
    content_type_value: input.contentType,
    icon_key_value: input.iconKey,
    display_date_value: input.displayDate,
    cover_image_url_value: input.coverImageUrl,
    video_url_value: input.videoUrl,
    status_value: input.status,
  });

  if (error) throw new Error("Journal post could not be saved.", { cause: error });
  return data as string;
}

export async function uploadJournalCover(input: {
  adminId: string;
  file: File;
}) {
  const validated = await validateUploadedImage(input.file, { label: "Journal cover" });
  const path = `${input.adminId}/${crypto.randomUUID()}.${validated.extension}`;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage
    .from("journal-media")
    .upload(path, validated.buffer, {
      contentType: validated.contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw new Error("Journal image could not be uploaded.", { cause: error });
  return { path, url: admin.storage.from("journal-media").getPublicUrl(path).data.publicUrl };
}

export async function removeJournalCover(path: string) {
  const { error } = await createAdminSupabaseClient().storage.from("journal-media").remove([path]);
  if (error) throw new Error("The newly uploaded Journal cover could not be cleaned up.", { cause: error });
}
