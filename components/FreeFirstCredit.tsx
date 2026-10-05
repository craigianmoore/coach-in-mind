"use client";

// Offers a club or coach their one free first introduction. Eligibility
// and the claim itself are enforced in the database (claim_free_first_credit),
// so this component only asks and displays — it can't grant anything by
// itself. Renders nothing unless the listing is actually eligible.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  listingTable: "club2coach_club_vacancies" | "club2coach_coach_listings" | "coach2mentor_coach_listings";
  listingId: string;
  onClaimed: () => void;
}

export default function FreeFirstCredit({ listingTable, listingId, onClaimed }: Props) {
  const supabase = createClient();
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("claim_free_first_credit", { target_table: listingTable, target_listing_id: listingId, dry_run: true })
      .then(({ data }) => {
        if (!cancelled) setEligible(Boolean((data as { eligible?: boolean } | null)?.eligible));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingTable, listingId]);

  async function claim() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("claim_free_first_credit", {
      target_table: listingTable,
      target_listing_id: listingId,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if ((data as { granted?: boolean } | null)?.granted) {
      onClaimed();
    } else {
      setEligible(false);
    }
  }

  if (!eligible) return null;
  return (
    <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
      <p className="text-sm font-semibold text-green-900">Your first introduction is free</p>
      <p className="mt-0.5 text-xs text-green-800">
        Activate this listing with 1 free introduction — no payment needed. Anything after that is charged as normal.
      </p>
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="mt-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
      >
        {busy ? "Activating…" : "Claim free introduction"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
