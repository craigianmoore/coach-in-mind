"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// "Founding member" offer: the first N coaches get a free introduction.
// Shows nothing if the offer is off or fully taken.
// variant "hero" = big, bold version for the home page; default = form pages.
export default function FoundingBanner({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "hero";
}) {
  const [s, setS] = useState<{ enabled: boolean; lim: number; used: number } | null>(null);
  useEffect(() => {
    createClient()
      .rpc("founding_status")
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setS(row);
      });
  }, []);
  if (!s || !s.enabled || s.used >= s.lim) return null;
  const left = s.lim - s.used;
  const pct = Math.max(4, Math.round((s.used / s.lim) * 100));

  const bar = (
    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/20">
      <div className="h-3 rounded-full bg-white/90" style={{ width: `${pct}%` }} />
    </div>
  );

  if (variant === "hero") {
    return (
      <div
        className={`w-full max-w-2xl rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-400 to-yellow-300 px-6 py-6 text-center text-[#1a1530] shadow-2xl ${className}`}
      >
        <p className="text-sm font-extrabold uppercase tracking-[0.2em]">⭐ Founding member offer</p>
        <p className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
          First 60 coaches get their first introduction FREE
        </p>
        <p className="mt-2 text-lg font-semibold">
          Only {left} spot{left === 1 ? "" : "s"} left — no payment, no catch.
        </p>
        {bar}
        <Link
          href="/signup"
          className="mt-4 inline-block rounded-xl bg-[#1a1530] px-8 py-3 text-lg font-bold text-white shadow-lg hover:bg-black"
        >
          Claim your free introduction →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-300 px-5 py-4 text-[#1a1530] shadow-md ${className}`}
    >
      <p className="text-xs font-extrabold uppercase tracking-widest">⭐ Founding member offer</p>
      <p className="mt-1 text-xl font-extrabold leading-snug sm:text-2xl">
        First {s.lim} coaches get their first introduction FREE
      </p>
      <p className="mt-1 text-sm font-semibold">
        Only {left} of {s.lim} left — complete your Club 2 Coach listing to claim yours.
      </p>
      {bar}
    </div>
  );
}
