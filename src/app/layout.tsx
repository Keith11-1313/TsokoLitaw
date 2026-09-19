import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "@/bones/registry";
import { CartProvider } from "@/components/cart/cart-provider";
import { AppLoadingSkeleton } from "@/components/layout/app-loading-skeleton";
import { getSupabasePublicEnvironment } from "@/lib/supabase/env";

const brandFontsBaseUrl = new URL(
  "/storage/v1/object/public/brand-fonts/v1/",
  getSupabasePublicEnvironment().url,
).toString();

const brandFontFaces = `
@font-face {
  font-family: "Pally";
  src: url("${brandFontsBaseUrl}pally-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}
@font-face {
  font-family: "Neco";
  src: url("${brandFontsBaseUrl}neco-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
}
@font-face {
  font-family: "Neco";
  src: url("${brandFontsBaseUrl}neco-variable-italic.woff2") format("woff2");
  font-style: italic;
  font-weight: 400 900;
  font-display: swap;
}
`;

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tsokolitaw.com"),
  title: "TsokoLitaw",
  description:
    "Soft and chewy palitaw filled with warm, melted chocolate and served fresh with your choice of coating.",
  applicationName: "TsokoLitaw",
  icons: { icon: "/icon.png" },
  openGraph: {
    type: "website",
    siteName: "TsokoLitaw",
    title: "TsokoLitaw",
    description: "The Filipino chocolate Xiao Long Bao, prepared for campus pickup.",
    images: [{ url: "/images/home/hero-image.webp", alt: "TsokoLitaw chocolate-filled palitaw" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TsokoLitaw",
    description: "The Filipino chocolate Xiao Long Bao, prepared for campus pickup.",
    images: ["/images/home/hero-image.webp"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={getSupabasePublicEnvironment().url} crossOrigin="anonymous" />
        <style>{brandFontFaces}</style>
      </head>
      <body className="antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-brand px-5 py-3 text-sm font-bold text-surface shadow-xl transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <CartProvider>
          <Suspense fallback={<AppLoadingSkeleton />}>{children}</Suspense>
        </CartProvider>
      </body>
    </html>
  );
}
