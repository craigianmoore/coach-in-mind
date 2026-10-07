"use client";

// Lets a coach start their free founding introduction when THEY are ready to
// look for a role. The 60-day clock starts when they press Activate.
// Eligibility and the grant are enforced in the database; this only asks.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FoundingActivate({
  listingTable,
  listingId,
  onActivated,
}: {
  listingTable: "club2coach_coach_listings" | "coach2mentor_coach_listings";
  listingId: string;
  onActivated: () => void;
}) {
  const supabase = createClient();
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("claim_founding_introduction", { target_table: listingTable, target_listing_id: listingId, dry_run: true })
      .then(({ data }) => {
        if (!cancelled) setEligible(Boolean((data as { eligible?: boolean } | null)?.eligible));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, listingTable]);

  if (!eligible) return null;

  async function activate() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("claim_founding_introduction", { target_table: listingTable, target_listing_id: listingId });
    setBusy(false);
    if (err || !(data as { granted?: boolean } | null)?.granted) {
      setError("Sorry — that free introduction is no longer available.");
      setEligible(false);
      return;
    }
    onActivated();
  }

  return (
    <div className="mb-3 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-300 p-4 text-[#1a1530]">
      <p className="text-xs font-extrabold uppercase tracking-widest">⭐ Your founding introduction is ready</p>
      <p className="mt-1 text-sm font-semibold">
        Use it on this listing when you&apos;re ready to start looking — you choose Club 2 Coach or Coach 2 Mentor, one
        per coach. It&apos;s valid for 60 days from the day you activate — use it or lose it.
      </p>
      <button
        onClick={activate}
        disabled={busy}
        className="mt-3 rounded-lg bg-[#1a1530] px-5 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
      >
        {busy ? "Activating…" : "Activate my free introduction"}
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
