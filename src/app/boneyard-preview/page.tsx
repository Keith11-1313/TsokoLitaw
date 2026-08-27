import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppLoadingSkeleton } from "@/components/layout/app-loading-skeleton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BoneyardCapturePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <AppLoadingSkeleton />;
}
