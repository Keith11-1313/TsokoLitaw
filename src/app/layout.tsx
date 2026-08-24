import type { Metadata } from "next";
import { DM_Serif_Display, Italianno, Lato } from "next/font/google";
import "./globals.css";

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
  title: "TsokoLitaw",
  description: "Filipino artisanal chocolate mochi made for sharing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} ${dmSerifDisplay.variable} ${italianno.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
