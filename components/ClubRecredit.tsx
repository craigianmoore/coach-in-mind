"use client";

// Shown on a saved, unpaid vacancy when the club has a credit returned from an
// earlier advert that ran 90 days with no introduction. The credit keeps its
// original number of introductions. Enforced in the database (use_club_recredit).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ClubRecredit({ vacancyId, personId, onUsed }: { vacancyId: string; personId: string; onUsed: () => void }) {
  const supabase = createClient();
  const [available, setAvailable] = useState<number | null>(null); // introductions on the oldest unused credit
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("club_recredits")
      .select("introductions")
      .eq("person_id", personId)
      .is("used_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setAvailable(data && data.length > 0 ? (data[0].introductions as number) : null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancyId]);

  if (available == null) return null;

  async function use() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("use_club_recredit", { target_vacancy_id: vacancyId });
    setBusy(false);
    if (err || !(data as { used?: boolean } | null)?.used) {
      setError("Sorry — that credit couldn't be applied. Please refresh and try again.");
      return;
    }
    // Put the vacancy straight into matching instead of waiting for the daily job (best effort).
    fetch("/api/sweep-vacancy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vacancyId }) }).catch(() => {});
    onUsed();
  }

  return (
    <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
      <p className="text-sm font-semibold text-green-900">
        You have a returned credit ({available} introduction{available === 1 ? "" : "s"})
      </p>
      <p className="mt-0.5 text-xs text-green-800">
        Your earlier advert ran 90 days with no coach introduced, so the credit came back to you. Use it to run this
        vacancy for 90 days — no payment needed.
      </p>
      <button
        onClick={use}
        disabled={busy}
        className="mt-2 rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-navyLight disabled:opacity-50"
      >
        {busy ? "Applying…" : "Use my returned credit"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
