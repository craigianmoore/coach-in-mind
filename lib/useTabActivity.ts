"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Highlights a tab (bold) when something new has happened in it since the admin last looked at it.
// `latest` maps each tab to the time (ms) of its newest activity, or null if it has no activity signal.
// "Last looked" is stored on the server per admin (table admin_tab_seen) so it follows them across phone and laptop,
// with a copy in this browser as a fallback. It is stamped when the admin opens a tab and again when they leave it,
// and re-read whenever the page comes back into view. The first time ever, every tab starts as seen, so nothing is
// bold for old history.
export function useTabActivity(tab: string, tabs: string[], latest: Record<string, number | null>, scope: string) {
  const supabase = useRef(createClient()).current;
  const storageKey = `cim_admin_tab_seen_${scope}`;
  const [seen, setSeen] = useState<Record<string, number> | null>(null);
  const seenRef = useRef<Record<string, number>>({});
  const tabRef = useRef(tab);
  const personRef = useRef<string | null>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const apply = useCallback((next: Record<string, number>) => {
    seenRef.current = next;
    setSeen(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const pushToServer = useCallback(
    async (rows: Record<string, number>) => {
      const pid = personRef.current;
      if (!pid) return;
      const payload = Object.entries(rows).map(([t, ms]) => ({ person_id: pid, scope, tab: t, seen_at: new Date(ms).toISOString() }));
      if (payload.length === 0) return;
      await supabase.from("admin_tab_seen").upsert(payload, { onConflict: "person_id,scope,tab" });
    },
    [supabase, scope]
  );

  // Read what the server (and this browser) remember. Anything never seen anywhere starts as seen "now".
  const load = useCallback(async () => {
    let local: Record<string, number> = {};
    try {
      local = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {};
    } catch {
      local = {};
    }
    const merged: Record<string, number> = { ...local };
    try {
      if (!personRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: me } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
          personRef.current = me?.id ?? null;
        }
      }
      if (personRef.current) {
        const { data } = await supabase.from("admin_tab_seen").select("tab,seen_at").eq("person_id", personRef.current).eq("scope", scope);
        // The server is the source of truth, so a tab opened on another device clears here too.
        for (const r of data ?? []) merged[r.tab] = new Date(r.seen_at).getTime();
      }
    } catch {
      /* fall back to this browser's copy */
    }
    const now = Date.now();
    const fresh: Record<string, number> = {};
    for (const t of tabsRef.current) {
      if (merged[t] == null) {
        merged[t] = now;
        fresh[t] = now;
      }
    }
    // Keep the tab being viewed up to date.
    merged[tabRef.current] = Math.max(merged[tabRef.current] ?? 0, seenRef.current[tabRef.current] ?? 0);
    apply(merged);
    fresh[tabRef.current] = merged[tabRef.current];
    pushToServer(fresh);
  }, [supabase, scope, storageKey, apply, pushToServer]);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const stamp = useCallback(
    (t: string) => {
      const ms = Date.now();
      apply({ ...seenRef.current, [t]: ms });
      pushToServer({ [t]: ms });
    },
    [apply, pushToServer]
  );

  // Opening a tab marks it seen; leaving it marks it seen again (so nothing that arrived meanwhile stays bold).
  useEffect(() => {
    const prev = tabRef.current;
    if (prev !== tab) stamp(prev);
    tabRef.current = tab;
    stamp(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const hasNew = (t: string) => {
    if (seen == null || t === tab) return false;
    const l = latest[t];
    if (l == null) return false;
    const s = seen[t];
    return s != null && l > s;
  };
  return { hasNew };
}

export function maxTime(...lists: (string | null | undefined)[][]): number | null {
  let best: number | null = null;
  for (const list of lists) {
    for (const v of list) {
      if (!v) continue;
      const t = new Date(v).getTime();
      if (Number.isFinite(t) && (best == null || t > best)) best = t;
    }
  }
  return best;
}
