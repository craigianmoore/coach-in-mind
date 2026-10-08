"use client";

// Shared across all four listing forms (Club2Coach coach/club,
// Coach2Mentor coach/mentor) rather than four near-identical copies.
// Calls the existing /api/stripe/checkout route, which looks up the
// real price server-side and creates a Stripe Checkout Session — this
// component only ever sends WHICH listing and WHICH package size,
// never an amount, matching the route's own security design.
import { useEffect, useState } from "react";

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
  // Coming back from Stripe (?paid=1) the webhook may take a few seconds to apply the payment.
  // Until it does, this button must not be clickable (a second click would charge twice).
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    if (params.get("paid") !== "1") return;
    setSettling(true);
    const isMentor = listingTable === "coach2mentor_mentor_listings";
    let tries = 0;
    try {
      tries = Number(sessionStorage.getItem("cim_paid_tries") ?? "0") || 0;
    } catch {}
    // Re-load the page a few times so the new credit/state appears; mentor top-up buttons stay on screen, so just wait.
    const timer = window.setTimeout(() => {
      if (!isMentor && tries < 7) {
        try {
          sessionStorage.setItem("cim_paid_tries", String(tries + 1));
        } catch {}
        window.location.reload();
      } else {
        setSettling(false);
      }
    }, 3000);
    const stop = window.setTimeout(() => setSettling(false), 25000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(stop);
    };
  }, [listingTable]);

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
        disabled={loading || settling}
        className="rounded-lg border border-brand-navy bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50"
      >
        {loading ? "Redirecting to Stripe…" : settling ? "Payment received — updating…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
