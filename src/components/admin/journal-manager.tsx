"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  FileText,
  Megaphone,
  Plus,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import {
  saveJournalPostAction,
  type JournalActionState,
} from "@/app/admin/journal/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  JOURNAL_CONTENT_TYPES,
  JOURNAL_ICON_KEYS,
  JOURNAL_STATUSES,
  journalContentTypeLabels,
  journalIconLabels,
  type JournalIconKey,
} from "@/lib/journal";
import type { JournalPostSummary } from "@/lib/server-journal";

const initialState: JournalActionState = { status: "idle", message: "" };
const iconMap = { megaphone: Megaphone, sparkles: Sparkles, file_text: FileText, video: Video } as const;

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function JournalEditor({
  post,
  onClose,
}: {
  post: JournalPostSummary | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveJournalPostAction, initialState);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4"
      onPointerDown={() => !pending && onClose()}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-editor-title"
        onPointerDown={(event) => event.stopPropagation()}
        className="my-auto w-full max-w-3xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Journal editor</p>
            <h2 id="journal-editor-title" className="mt-1 font-display text-3xl">
              {post ? "Edit post" : "Create post"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close Journal editor"
            disabled={pending}
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <form action={formAction} className="mt-7 grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="postId" value={post?.id ?? ""} />
          <input type="hidden" name="existingCoverImageUrl" value={post?.coverImageUrl ?? ""} />
          <FormField
            id="journal-title"
            label="Title"
            required
            className="sm:col-span-2"
            inputProps={{ name: "title", defaultValue: post?.title, minLength: 3, maxLength: 120, autoFocus: true }}
          />
          <FormField id="journal-type" label="Post type" as="select" required selectProps={{ name: "contentType", defaultValue: post?.contentType ?? "announcement" }}>
            {JOURNAL_CONTENT_TYPES.map((type) => <option key={type} value={type}>{journalContentTypeLabels[type]}</option>)}
          </FormField>
          <FormField id="journal-icon" label="Icon" as="select" required selectProps={{ name: "iconKey", defaultValue: post?.iconKey ?? "megaphone" }}>
            {JOURNAL_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{journalIconLabels[icon]}</option>)}
          </FormField>
          <FormField id="journal-date" label="Display date" required inputProps={{ name: "displayDate", type: "date", defaultValue: post?.displayDate ?? todayInManila() }} />
          <FormField id="journal-status" label="Publication" as="select" required selectProps={{ name: "status", defaultValue: post?.status ?? "draft" }}>
            {JOURNAL_STATUSES.map((status) => <option key={status} value={status}>{status === "published" ? "Published" : "Draft"}</option>)}
          </FormField>
          <FormField
            id="journal-excerpt"
            label="Short summary (optional)"
            className="sm:col-span-2"
            inputProps={{ name: "excerpt", defaultValue: post?.excerpt ?? "", maxLength: 240 }}
          />
          <FormField
            id="journal-content"
            label="Content"
            as="textarea"
            required
            className="sm:col-span-2"
            controlClassName="min-h-40"
            textareaProps={{ name: "content", defaultValue: post?.content, minLength: 10, maxLength: 5000 }}
          />
          <FormField
            id="journal-cover"
            label="Cover image (optional)"
            hint="JPG, PNG, or WebP up to 3 MB. A new image replaces the current one."
            inputProps={{ name: "coverImage", type: "file", accept: "image/jpeg,image/png,image/webp" }}
          />
          <FormField
            id="journal-video"
            label="Video link (optional)"
            hint="Use a secure hosted video URL when the post includes video."
            inputProps={{ name: "videoUrl", type: "url", defaultValue: post?.videoUrl ?? "", placeholder: "https://…" }}
          />
          {post?.coverImageUrl ? (
            <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
              <input type="checkbox" name="removeCover" className="size-4 accent-brand" />
              Remove the current cover image
            </label>
          ) : null}
          {state.status === "error" ? <p role="alert" className="rounded-control bg-danger-background p-4 text-sm text-danger-foreground sm:col-span-2">{state.message}</p> : null}
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <SecondaryButton type="button" disabled={pending} onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save post"}</PrimaryButton>
          </div>
        </form>
      </section>
    </div>
  );
}

export function JournalManager({ posts }: { posts: JournalPostSummary[] }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<JournalPostSummary | null>(null);

  function openEditor(post: JournalPostSummary | null) {
    setSelectedPost(post);
    setEditorOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="journal-posts-title" className="font-display text-[2.25rem] leading-tight text-foreground">Journal posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create drafts or publish announcements, stories, product features, and videos.</p>
        </div>
        <PrimaryButton type="button" onClick={() => openEditor(null)}><Plus aria-hidden="true" size={17} />New post</PrimaryButton>
      </div>
      {posts.length ? (
        <section className="mt-5 grid gap-5 lg:grid-cols-2" aria-label="Journal posts">
          {posts.map((post) => {
            const Icon = iconMap[post.iconKey as JournalIconKey];
            return (
              <article key={post.id} className="rounded-card border border-border bg-surface p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-brand"><Icon aria-hidden="true" size={20} /></span>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{journalContentTypeLabels[post.contentType]}</p>
                    <h3 className="mt-1 font-display text-2xl">{post.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(`${post.displayDate}T00:00:00+08:00`))}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${post.status === "published" ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{post.status === "published" ? "Published" : "Draft"}</span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt || post.content}</p>
                <SecondaryButton type="button" className="mt-6 w-full" onClick={() => openEditor(post)}>Edit post</SecondaryButton>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-5 rounded-card border border-dashed border-border bg-surface p-10 text-center">
          <h2 className="font-display text-2xl">No Journal posts yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create a draft, then publish it when it is ready for customers.</p>
        </section>
      )}
      {editorOpen ? <JournalEditor key={selectedPost?.id ?? "new"} post={selectedPost} onClose={() => setEditorOpen(false)} /> : null}
    </>
  );
}
