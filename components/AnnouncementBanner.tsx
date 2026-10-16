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
    <div className="mx-auto max-w-5xl px-4 pt-3">
      {items.map((a) => (
        <div key={a.id} className="mb-2 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 shadow-sm">
          <span aria-hidden className="mt-0.5 text-base">📣</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{a.title}</p>
            {a.body && <p className="mt-0.5 whitespace-pre-line">{a.body}</p>}
            {a.link_url && (
              <a href={a.link_url} className="mt-1 inline-block font-semibold text-blue-800 underline" target={a.link_url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
                {a.link_label || "Read more"}
              </a>
            )}
          </div>
          <button type="button" onClick={() => dismiss(a.id)} aria-label="Dismiss announcement" className="rounded px-2 text-lg leading-none text-blue-700 hover:bg-blue-100">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
