"use client";

// "Refer a club or coach" card for coaches: their personal code/link, and
// how many of their 3 rewards have been used. Rewards are created by the
// database when the person they referred makes their first payment —
// nothing here grants anything.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Reward {
  credits: number;
  status: string;
  created_at: string;
}

export default function ReferralCard() {
  const supabase = createClient();
  const [code, setCode] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.rpc("get_my_referral_code").then(({ data }) => setCode((data as string) ?? null));
    supabase
      .from("referral_rewards")
      .select("credits,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRewards((data as Reward[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!code) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${code}`;
  const counted = rewards.filter((r) => r.status === "granted" || r.status === "pending");
  const earned = counted.reduce((s, r) => s + r.credits, 0);
  const waiting = rewards.filter((r) => r.status === "pending").length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy your referral link:", link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4 rounded-xl border bg-white p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">Refer a club or coach</p>
      <p className="mt-1 text-sm text-gray-700">
        Earn <strong>1 free introduction</strong> when a coach you refer makes their first payment, or{" "}
        <strong>2</strong> when a club you refer does (up to 3 rewards).
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-gray-100 px-2 py-1 text-sm">{code}</code>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          {copied ? "Copied!" : "Copy referral link"}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {counted.length} of 3 rewards used · {earned} credit{earned === 1 ? "" : "s"} earned
        {waiting > 0 && ` · ${waiting} will be added once you have a paid coach listing`}
      </p>
    </div>
  );
}
