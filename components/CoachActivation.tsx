"use client";

// The coach's Activate panel. One credit = one listing in matching for a fixed
// window (60 days on either service). Credits sit in a
// shared bank and never expire until they are spent here. If the bank is empty
// and the founding offer is still open, the free founding credit can be used.
// All rules (ownership, balance, founding limits) are enforced in the database.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COACH_ACTIVE_DAYS, daysLeft, isActivated } from "@/lib/coachPool";

type Table = "club2coach_coach_listings" | "coach2mentor_coach_listings";
type Dry = { eligible?: boolean; bank?: number; founding_available?: boolean; days?: number };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function CoachActivation({
  listingTable,
  listing,
  onChanged,
  bank: bankProp,
}: {
  listingTable: Table;
  listing: { id: string; status: string; active_until?: string | null; deleted_at?: string | null; paid?: boolean };
  onChanged: () => void;
  bank?: number; // credits left in the shared bank (shown while active)
}) {
  const supabase = createClient();
  const product = listingTable === "club2coach_coach_listings" ? "club2coach" : "coach2mentor";
  const days = COACH_ACTIVE_DAYS[product];
  const active = isActivated(listing);
  const [dry, setDry] = useState<Dry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (active) return;
    let cancelled = false;
    supabase
      .rpc("activate_coach_listing", { target_table: listingTable, target_listing_id: listing.id, dry_run: true })
      .then(({ data }) => {
        if (!cancelled) setDry((data as Dry) ?? null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id, listing.status, listing.active_until, active]);

  async function activate(useFounding: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("activate_coach_listing", {
      target_table: listingTable,
      target_listing_id: listing.id,
      use_founding: useFounding,
    });
    setBusy(false);
    if (err || !(data as { activated?: boolean } | null)?.activated) {
      setError("Sorry — that couldn't be activated. Please refresh and try again.");
      return;
    }
    onChanged();
  }

  if (active && listing.active_until) {
    const left = daysLeft(listing.active_until);
    return (
      <div className="flex h-full flex-col justify-center rounded-xl border-2 border-green-300 bg-green-50 p-5 text-green-900">
        <p className="text-3xl font-extrabold uppercase tracking-widest text-green-700">✓ Active</p>
        <p className="mt-2 text-base font-semibold">
          In matching until {fmt(listing.active_until)} · {left} day{left === 1 ? "" : "s"} left
        </p>
        <p className="mt-2 text-sm">
          Coach In Mind is looking for your match. When this ends, that credit is used up; to open another introduction option,
          activate with another credit.
        </p>
        {typeof bankProp === "number" && (
          <p className="mt-2 text-sm font-semibold">
            Credits remaining: {bankProp}
          </p>
        )}
      </div>
    );
  }

  const bank = dry?.bank ?? 0;
  const expired = listing.status === "expired";

  return (
    <div className="h-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>
        <strong>{expired ? "Your listing has ended." : "Your listing isn't in matching yet."}</strong> One credit puts it in
        front of {product === "club2coach" ? "clubs" : "mentors"} for {days} days from the day you press Activate.
        {" "}You have <strong>{bank}</strong> credit{bank === 1 ? "" : "s"} in your credit balance.
      </p>
      {bank >= 1 && (
        <button
          onClick={() => activate(false)}
          disabled={busy}
          className="mt-3 rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white hover:bg-brand-navyLight disabled:opacity-50"
        >
          {busy ? "Activating…" : `Activate — use 1 credit (${days} days)`}
        </button>
      )}
      {dry?.founding_available && (
        <div className="mt-3 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-300 p-4 text-[#1a1530]">
          <p className="text-xs font-extrabold uppercase tracking-widest">⭐ Founding member credit available</p>
          <p className="mt-1 text-sm font-semibold">
            Your first credit is free — one per coach, for Club 2 Coach or Coach 2 Mentor (you choose). The clock starts when
            you activate.
          </p>
          <button
            onClick={() => activate(true)}
            disabled={busy}
            className="mt-3 rounded-lg bg-[#1a1530] px-5 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
          >
            {busy ? "Activating…" : "Activate with my free founding credit"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      {bank < 1 && !dry?.founding_available && dry && (
        <p className="mt-2">You&apos;re out of credits — get another below, then come back and press Activate.</p>
      )}
    </div>
  );
}
