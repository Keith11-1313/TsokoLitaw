import type { Metadata } from "next";
import { DM_Serif_Display, Italianno, Lato } from "next/font/google";
import "./globals.css";
import "@/bones/registry";
import { CartProvider } from "@/components/cart/cart-provider";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const italianno = Italianno({
  variable: "--font-italianno",
  subsets: ["latin"],
  weight: "400",
});

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
    images: [{ url: "/images/home/hero-image.png", alt: "TsokoLitaw chocolate-filled palitaw" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TsokoLitaw",
    description: "The Filipino chocolate Xiao Long Bao, prepared for campus pickup.",
    images: ["/images/home/hero-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lato.variable} ${dmSerifDisplay.variable} ${italianno.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-brand px-5 py-3 text-sm font-bold text-surface shadow-xl transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
