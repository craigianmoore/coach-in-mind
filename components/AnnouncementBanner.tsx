"use client";

// In-app announcements from the admin "Announcements" tab: a dismissible notice under the top bar for
// signed-in people the announcement is aimed at. Who sees what, and when, is decided in the database
// (my_announcements). Silent for visitors who aren't signed in, and if the feature isn't set up yet.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type A = { id: string; title: string; body: string; link_url: string | null; link_label: string | null };

export default function AnnouncementBanner() {
  const supabase = createClient();
  const [items, setItems] = useState<A[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        if (!cancelled) setItems([]);
        return;
      }
      const { data, error } = await supabase.rpc("my_announcements");
      if (!cancelled) setItems(error ? [] : ((data as A[]) ?? []));
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function dismiss(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id));
    await supabase.rpc("dismiss_announcement", { aid: id });
  }

  if (items.length === 0) return null;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      {items.map((a) => (
        <div key={a.id} className="mb-3 flex items-start gap-4 rounded-2xl border-l-8 border-[#D4AF6A] bg-[#191B41] px-5 py-4 text-white shadow-lg ring-1 ring-[#D4AF6A]/40">
          <span aria-hidden className="mt-0.5 text-2xl">📣</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-snug text-[#F1D9A0]">{a.title}</p>
            {a.body && <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-white/95">{a.body}</p>}
            {a.link_url && (
              <a
                href={a.link_url}
                className="mt-3 inline-block rounded-lg bg-[#D4AF6A] px-4 py-2 text-sm font-bold text-[#191B41] hover:bg-[#e2c07f]"
                target={a.link_url.startsWith("/") ? undefined : "_blank"}
                rel="noopener noreferrer"
              >
                {a.link_label || "Read more"} →
              </a>
            )}
          </div>
          <button type="button" onClick={() => dismiss(a.id)} aria-label="Dismiss announcement" className="rounded-lg px-2.5 py-1 text-2xl leading-none text-white/80 hover:bg-white/10 hover:text-white">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
