"use client";

import { useEffect, useState } from "react";
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

  if (variant === "hero") {
    return (
      <div
        className={`w-full max-w-2xl rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-400 to-yellow-300 px-6 py-6 text-center text-[#1a1530] shadow-2xl ${className}`}
      >
        <p className="text-sm font-extrabold uppercase tracking-[0.2em]">⭐ Founding member offer</p>
        <p className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
          Founding coaches get a FREE credit
        </p>
        <p className="mt-2 text-lg font-semibold">
          Sign up as a coach and your free credit is added to your account straight away.
        </p>
        <p className="mt-3 text-base font-semibold">
          Use it for <strong>Club 2 Coach</strong> (30 days in front of clubs) or <strong>Coach 2 Mentor</strong> (60 days of mentor matching). You choose, and your time only starts when you press Activate. Completing your profile doesn&apos;t spend it.
        </p>
        <p className="mt-3 text-lg font-extrabold">Hurry, only {left} spot{left === 1 ? "" : "s"} left!</p>
        <p className="mt-4 text-lg font-extrabold">Sign up free below ↓</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-300 px-5 py-4 text-[#1a1530] shadow-md ${className}`}
    >
      <p className="text-xs font-extrabold uppercase tracking-widest">⭐ Founding member offer</p>
      <p className="mt-1 text-xl font-extrabold leading-snug sm:text-2xl">
        Founding coaches get a FREE credit
      </p>
      <p className="mt-1 text-sm font-semibold">
        Open your coach page (Club 2 Coach or Coach 2 Mentor) to claim your free credit. It&apos;s added to your balance straight away.
      </p>
      <p className="mt-2 text-sm font-semibold">
        Use it for 30 days in front of clubs, or 60 days of mentor matching. Your time only starts when you press Activate, and completing your profile doesn&apos;t spend it.
      </p>
      <p className="mt-2 text-base font-extrabold">Hurry, only {left} spot{left === 1 ? "" : "s"} left!</p>
    </div>
  );
}
