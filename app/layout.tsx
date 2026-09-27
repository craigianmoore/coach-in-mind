import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import ScrollToTop from "@/components/ScrollToTop";
import "./globals.css";

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
    <html lang="en">
      <body>
        <ScrollToTop />
        <TopNav />
        {children}
      </body>
    </html>
  );
}
