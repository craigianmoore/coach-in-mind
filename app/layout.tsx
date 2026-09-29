import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import TopNav from "@/components/TopNav";
import ScrollToTop from "@/components/ScrollToTop";
import "./globals.css";

// A single distinctive heading typeface, loaded once here and applied
// sitewide via the --font-display CSS variable (see globals.css's
// h1/h2/h3 rule) — every page's headings pick it up automatically,
// no per-page font-display class needed.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coach In Mind",
  description: "Shaping coaches minds on & off the pitch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>
        <ScrollToTop />
        <TopNav />
        {children}
      </body>
    </html>
  );
}
