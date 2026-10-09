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
  metadataBase: new URL("https://www.coachinmind.com.au"),
  title: {
    default: "Coach In Mind",
    template: "%s | Coach In Mind",
  },
  description:
    "Coach In Mind matches football coaches with clubs, and coaches with mentors. Build a free profile and get matched.",
  openGraph: {
    type: "website",
    url: "https://www.coachinmind.com.au",
    siteName: "Coach In Mind",
    title: "Coach In Mind",
    description:
      "Stop relying on group chats to fill a coaching role. Coach In Mind matches football coaches with clubs, and coaches with mentors.",
    images: [{ url: "/coach-in-mind-logo.png" }],
  },
  twitter: {
    card: "summary",
    title: "Coach In Mind",
    description:
      "Matching football coaches with clubs, and coaches with mentors.",
    images: ["/coach-in-mind-logo.png"],
  },
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
