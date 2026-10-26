"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// A link to the other product's admin page that shows a dot when anything there is newer than this admin last looked
// (using the same per-tab "last looked" times as the bold tab names, stored in admin_tab_seen).
export default function OtherProductLink({ other }: { other: "c2c" | "c2m" }) {
  const supabase = createClient();
  const [unread, setUnread] = useState(false);
  const label = other === "c2m" ? "Coach 2 Mentor" : "Club 2 Coach";
  const href = other === "c2m" ? "/coach2mentor/admin" : "/club2coach/admin";

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: me } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
        if (!me) return;
        const [{ data: act }, { data: seen }] = await Promise.all([
          supabase.rpc("admin_product_activity", { prod: other }),
          supabase.from("admin_tab_seen").select("tab,seen_at").eq("person_id", me.id).eq("scope", other),
        ]);
        const seenBy = new Map((seen ?? []).map((r: { tab: string; seen_at: string }) => [r.tab, new Date(r.seen_at).getTime()]));
        const any = ((act ?? []) as { tab: string; latest: string | null }[]).some((a) => {
          if (!a.latest) return false;
          const s = seenBy.get(a.tab);
          return s == null || new Date(a.latest).getTime() > s; // never looked at = unread
        });
        if (!cancelled) setUnread(any);
      } catch {
        /* no indicator if anything fails */
      }
    }
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other]);

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        unread ? "border-red-300 bg-red-50 text-red-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {unread && <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />}
      {label} admin{unread ? " · unread activity" : ""}
    </Link>
  );
}
