"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Highlights a tab (bold) when something new has happened in it since the admin last looked at it.
// `latest` maps each tab to the time (ms) of its newest activity, or null if it has no activity signal.
// "Last looked" is remembered per tab in this browser: it is stamped when the admin opens the tab and again when they
// leave it, so activity that arrives while a tab is open never leaves it bold afterwards. The first time ever, every
// tab starts as seen, so nothing is bold for old history.
export function useTabActivity(tab: string, tabs: string[], latest: Record<string, number | null>, storageKey: string) {
  const [seen, setSeen] = useState<Record<string, number> | null>(null);
  const seenRef = useRef<Record<string, number>>({});
  const tabRef = useRef(tab);

  const persist = useCallback(
    (next: Record<string, number>) => {
      seenRef.current = next;
      setSeen(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable: highlights just reset on reload */
      }
    },
    [storageKey]
  );

  const stamp = useCallback(
    (t: string) => persist({ ...seenRef.current, [t]: Date.now() }),
    [persist]
  );

  // Load what was seen before; tabs never seen before start as seen "now".
  useEffect(() => {
    let stored: Record<string, number> = {};
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {};
    } catch {
      stored = {};
    }
    const now = Date.now();
    for (const t of tabs) if (stored[t] == null) stored[t] = now;
    persist(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Opening a tab marks it seen; leaving it marks it seen again (so nothing that arrived meanwhile stays bold).
  useEffect(() => {
    const prev = tabRef.current;
    if (prev !== tab) stamp(prev);
    tabRef.current = tab;
    stamp(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const onLeave = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...seenRef.current, [tabRef.current]: Date.now() }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [storageKey]);

  // A tab with no record yet has never been looked at on this browser: treat it as seen so old history isn't bold.
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
