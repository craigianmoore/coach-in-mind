"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  created_at: string;
  to_email: string | null;
  subject: string | null;
  status: string;
  attempts: number;
};

// Red warning on the admin pages when Resend has refused emails that haven't been delivered yet.
// Temporary failures (usually the Free plan's 100-a-day limit) are retried automatically, first in
// line, every hour; this lists who is waiting and who couldn't be reached. Silent if there are none,
// or the table isn't there yet.
export default function EmailFailureBanner() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const since = new Date(Date.now() - 72 * 3600_000).toISOString();
    const { data, error } = await supabase
      .from("email_failures")
      .select("id, created_at, to_email, subject, status, attempts")
      .or(`status.in.(queued,retrying,permanent,gave_up),and(status.eq.legacy,created_at.gte.${since})`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setRows((data as Row[]) ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function dismiss(id: string) {
    const { error } = await supabase.from("email_failures").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
    if (!error) setRows((rs) => rs.filter((r) => r.id !== id));
  }

  if (rows.length === 0) return null;
  const waiting = rows.filter((r) => r.status === "queued" || r.status === "retrying");
  const missed = rows.filter((r) => r.status === "permanent" || r.status === "gave_up");
  const unknown = rows.filter((r) => r.status === "legacy");
  const label = (s: string) => (s === "queued" || s === "retrying" ? "will retry automatically" : s === "permanent" ? "couldn't be delivered" : s === "gave_up" ? "gave up after 3 days" : "details weren't recorded");

  return (
    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      {waiting.length > 0 && (
        <p>
          <strong>{waiting.length} email{waiting.length === 1 ? " is" : "s are"} waiting to be sent.</strong> Resend refused {waiting.length === 1 ? "it" : "them"}
          (most often the Free plan&apos;s 100-a-day limit, which resets at 11am Melbourne time). They are retried automatically every hour, ahead of anything new.
        </p>
      )}
      {missed.length > 0 && (
        <p className={waiting.length > 0 ? "mt-1" : ""}>
          <strong>{missed.length} email{missed.length === 1 ? "" : "s"} could not be delivered.</strong> Please contact {missed.length === 1 ? "that person" : "those people"} directly.
        </p>
      )}
      {unknown.length > 0 && (
        <p className="mt-1">
          {unknown.length} earlier failure{unknown.length === 1 ? "" : "s"} in the last 3 days (recorded before details were kept), so who missed out isn&apos;t known. Check the Logs at resend.com.
        </p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer font-medium">Who is affected</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2">
              <span>
                {new Date(r.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
                {r.to_email ? `${r.to_email} — ${r.subject}` : "(recipient not recorded)"} · <em>{label(r.status)}</em>
              </span>
              <button type="button" onClick={() => dismiss(r.id)} className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs hover:bg-red-100">
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
