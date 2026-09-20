"use client";

// Shared across all four listing forms (Club2Coach coach/club,
// Coach2Mentor coach/mentor) rather than four near-identical copies.
// Calls the existing /api/stripe/checkout route, which looks up the
// real price server-side and creates a Stripe Checkout Session — this
// component only ever sends WHICH listing and WHICH package size,
// never an amount, matching the route's own security design.
import { useState } from "react";

interface PayWithCardButtonProps {
  listingTable:
    | "club2coach_coach_listings"
    | "club2coach_club_vacancies"
    | "coach2mentor_coach_listings"
    | "coach2mentor_mentor_listings";
  listingId: string;
  packageSize: number;
  mode?: "new" | "topup";
  label?: string;
}

export default function PayWithCardButton({
  listingTable,
  listingId,
  packageSize,
  mode = "new",
  label = "Pay with card",
}: PayWithCardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingTable, listingId, packageSize, mode }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong starting checkout. Please try again.");
        setLoading(false);
        return;
      }
      // Full-page redirect to Stripe's own hosted checkout page — not
      // a fetch/AJAX flow, since card entry has to happen on Stripe's
      // domain, not ours.
      window.location.href = data.url;
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-brand-navy bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50"
      >
        {loading ? "Redirecting to Stripe…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
