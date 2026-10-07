"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "Founding member" offer: the first N coaches get a free introduction.
// Shows nothing if the offer is off or fully taken.
export default function FoundingBanner({ className = "" }: { className?: string }) {
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
  return (
    <div className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}>
      <p className="font-semibold">⭐ Founding member offer</p>
      <p className="mt-1">
        The first {s.lim} coaches to complete a Club 2 Coach listing get their first introduction free. {left} of{" "}
        {s.lim} left.
      </p>
    </div>
  );
}
