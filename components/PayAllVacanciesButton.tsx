"use client";

// One card payment for several unpaid club adverts. Sends only the advert ids; the server works out
// the price (one pack per advert) and checks every advert belongs to the signed-in club.
import { useState } from "react";

export default function PayAllVacanciesButton({ listingIds, pricePer }: { listingIds: string[]; pricePer: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong starting checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
      setLoading(false);
    }
  }

  const n = listingIds.length;
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>
        You have <strong>{n} adverts</strong> waiting for payment. Pay for them all in one go: ${pricePer * n} AUD
        (${pricePer} each, 3 coach introductions per advert).
      </p>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="mt-2 rounded-lg border border-brand-navy bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50"
      >
        {loading ? "Redirecting to Stripe…" : `Pay for all ${n} adverts ($${pricePer * n})`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
