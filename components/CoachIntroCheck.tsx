"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { share_id: string; club_name: string; role: string };

// Asks a coach, a week after each introduction, whether they took the role. Their answer lets us spot a club
// that reports "not filled" when the coach was actually appointed.
export default function CoachIntroCheck() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.rpc("coach_pending_intro_checks");
    setRows((data as Row[] | null) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function answer(id: string, hired: boolean) {
    setBusy(true);
    await supabase.rpc("coach_report_intro", { target_share_id: id, hired });
    setBusy(false);
    await load();
  }

  if (rows.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <p className="font-semibold">Quick question about your introductions</p>
      {rows.map((r) => (
        <div key={r.share_id} className="mt-3 rounded-lg bg-white p-3">
          <p>Did you take the <strong>{r.role}</strong> role at <strong>{r.club_name}</strong>?</p>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={() => answer(r.share_id, true)} className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Yes, I took it</button>
            <button disabled={busy} onClick={() => answer(r.share_id, false)} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-40">No</button>
          </div>
        </div>
      ))}
    </div>
  );
}
