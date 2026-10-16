"use client";

// Role-taken flow for a Club 2 Coach listing. A coach can hold several listings (one per role).
// - Live listing: "I've taken a role" marks this listing placed and puts their other live listings
//   into hibernation (details kept, matching stopped) until they choose.
// - Hibernating listing, window still open: the coach must choose. Keep advertising (needs the tick
//   box, and the clock keeps counting as it always did) or stop (the credit's remaining time is lost).
// - Hibernating listing, window over: details are kept; activating again uses a new credit.
// All state changes go through database functions that check the listing belongs to the signed-in coach.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { daysLeft, isActivated } from "@/lib/coachPool";

type L = { id: string; role_sought: string; status: string; active_until?: string | null };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function CoachRolePanel({ listing, onChanged }: { listing: L; onChanged: () => void }) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTaken, setConfirmTaken] = useState(false);
  const [understand, setUnderstand] = useState(false);
  const [clubSaidFilled, setClubSaidFilled] = useState(false);

  const live = isActivated(listing);
  const hibernating = listing.status === "hibernating";
  const pending = hibernating && !!listing.active_until && new Date(listing.active_until).getTime() > Date.now();

  useEffect(() => {
    setConfirmTaken(false);
    setUnderstand(false);
    setError(null);
    if (!live) {
      setClubSaidFilled(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("club2coach_shares")
      .select("id")
      .eq("coach_listing_id", listing.id)
      .eq("status", "approved")
      .eq("outcome", "filled")
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setClubSaidFilled((data ?? []).length > 0);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id, listing.status, live]);

  async function run(fn: () => Promise<{ data: unknown; error: unknown }>) {
    setBusy(true);
    setError(null);
    const { data, error: err } = await fn();
    setBusy(false);
    if (err || !(data as { ok?: boolean } | null)?.ok) {
      setError("Sorry, that didn't go through. Please refresh and try again.");
      return;
    }
    onChanged();
  }

  if (listing.status === "placed") {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <p className="font-semibold">✓ You&apos;ve taken this role ({listing.role_sought}). This listing is closed.</p>
        <p className="mt-1">Your other listings, if any, are kept safe and are not being shown to clubs unless you chose to keep them going.</p>
      </div>
    );
  }

  if (pending && listing.active_until) {
    const left = daysLeft(listing.active_until);
    return (
      <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="text-base font-bold">⏸ This listing ({listing.role_sought}) is on hold: you told us you&apos;ve taken another role</p>
        <p className="mt-2">
          You shouldn&apos;t normally hold two coaching roles at once, and doing so may breach the competition rules of your club or league.
          Your details are saved, but clubs can&apos;t see this listing right now.
        </p>
        <p className="mt-2">
          Your credit runs until <strong>{fmt(listing.active_until)}</strong> ({left} day{left === 1 ? "" : "s"} left). If you stop now, the
          time left on that credit is lost. If you choose to keep advertising, the clock keeps counting.
        </p>
        <label className="mt-3 flex items-start gap-2">
          <input type="checkbox" className="mt-0.5" checked={understand} onChange={(e) => setUnderstand(e.target.checked)} />
          <span>
            I understand, and I&apos;m responsible for making sure a second role is allowed. Please keep advertising me for this role.
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={!understand || busy}
            onClick={() => run(async () => await supabase.rpc("coach_resolve_hibernation", { target_listing_id: listing.id, keep: true }))}
            className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Keep advertising this role
          </button>
          <button
            disabled={busy}
            onClick={() => run(async () => await supabase.rpc("coach_resolve_hibernation", { target_listing_id: listing.id, keep: false }))}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 disabled:opacity-40"
          >
            Stop advertising (keep my details)
          </button>
        </div>
        {error && <p className="mt-2 font-semibold text-red-700">{error}</p>}
      </div>
    );
  }

  if (hibernating) {
    return (
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-semibold">💤 Hibernating: this listing ({listing.role_sought}) isn&apos;t being shown to clubs.</p>
        <p className="mt-1">Your details are saved. If you&apos;d like to advertise for this role again, press Activate with another credit.</p>
      </div>
    );
  }

  if (!live) return null;

  return (
    <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
      {clubSaidFilled && (
        <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">
          A club you were introduced to has marked its vacancy as filled. If that was you, tell us below so we can stop advertising you.
        </p>
      )}
      {!confirmTaken ? (
        <button onClick={() => setConfirmTaken(true)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          I&apos;ve taken a role
        </button>
      ) : (
        <div>
          <p className="font-semibold">Have you taken the {listing.role_sought} role?</p>
          <p className="mt-1 text-gray-600">
            This listing will close. Any other listing you have will go on hold, and you&apos;ll be asked whether to keep advertising it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => run(async () => await supabase.rpc("coach_declare_role_taken", { target_listing_id: listing.id }))}
              className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Yes, I&apos;ve taken this role
            </button>
            <button onClick={() => setConfirmTaken(false)} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 font-semibold text-red-700">{error}</p>}
    </div>
  );
}
