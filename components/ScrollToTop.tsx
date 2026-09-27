"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Next.js App Router only auto-scrolls as far as the first DOM node that
// differs between the old and new page. TopNav (root layout) is
// identical on every route, so it doesn't count as "different" — the
// browser instead scrolls straight to whatever comes after it (e.g. the
// /club2coach or /coach2mentor page header), which can leave the shared
// TopNav scrolled out of view above the fold, or land partway/near the
// bottom of a shorter destination page if the visitor had scrolled a
// long way down the page they came from. Forcing a scroll-to-top on
// every route change (not just for /club2coach or /coach2mentor)
// guarantees every navigation opens at the very top of the page.
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
