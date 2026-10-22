"use client";

import { useEffect, useRef, useState } from "react";

export type Counts = {
  autoSend?: boolean;
  pending: number;
  sent: number;
  failed: number;
  optout: number;
  sending: number;
  sentLast24h: number;
  dailyCap: number;
  perRun: number;
  remindersEnabled: boolean;
  remindersDue: number;
  remindersWaiting: number;
  remindersSent: number;
  reminderAfterDays: number;
  clubEnabled: boolean;
  clubShare: number;
  clubRegions: string[];
  clubsEligible: number;
  clubsSent: number;
  clubsNoRegion: number;
};

// Admin tool for the one-off coach invitation mail-out. Needs a master-admin session; all sending happens
// on the server (/api/admin/invitations), which keeps the daily ceiling and never emails anyone twice.
export default function InvitationsPanel() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState(25);
  const [optout, setOptout] = useState("");
  const [rows, setRows] = useState<{ email: string; first_name: string | null; status: string; sent_at: string | null }[] | null>(null);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(150);
  const msgRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msg) msgRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msg]);

  async function call(body?: object) {
    const res = await fetch("/api/admin/invitations", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    return res.json().catch(() => ({ ok: false, error: "Unexpected response" }));
  }

  async function refresh() {
    const j = await call();
    if (j.ok) {
      setCounts(j);
      setLimit(j.dailyCap);
    } else setMsg(j.error ?? "Couldn't load. A master admin session is needed.");
  }

  useEffect(() => {
    refresh();
  }, []);

  async function run(body: object, done: (j: any) => string) {
    setBusy(true);
    setMsg("");
    const j = await call(body);
    setMsg(j.ok ? done(j) : j.error ?? "Failed");
    if (j.pending !== undefined) setCounts(j);
    setBusy(false);
  }

  async function loadRows() {
    const j = await call({ action: "list" });
    if (j.ok) setRows(j.rows);
  }

  async function mark(email: string, action: "optout" | "restore") {
    setBusy(true);
    const j = await call({ action, email });
    if (j.ok) {
      if (j.pending !== undefined) setCounts(j);
      setRows((rs) => rs && rs.map((r) => (r.email === email ? { ...r, status: action === "optout" ? "optout" : r.sent_at ? "sent" : "pending" } : r)));
    } else setMsg(j.error ?? "Failed");
    setBusy(false);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const csv = await f.text();
    await run({ action: "import", csv }, (j) =>
      `Added ${j.added}. Skipped: ${j.footballVictoria} Football Victoria staff, ${j.alreadySignedUp} already signed up, ${j.alreadyListed} already on the list, ${j.invalid} invalid.`
    );
  }

  return (
    <div className="mt-6 flex max-w-xl flex-col gap-4 text-sm">
      {msg && <div ref={msgRef} className="sticky top-2 z-10 rounded-lg border border-gray-300 bg-white p-3 text-gray-800 shadow">{msg}</div>}

      <p className="text-gray-600">
        One-off coach invitation. Load the list once, send yourself a test, then send in batches. Nobody is emailed twice, and
        anyone marked &quot;no thanks&quot; is never emailed.
      </p>

      {counts && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div>Waiting to send: <strong>{counts.pending}</strong></div>
          <div>Sent: <strong>{counts.sent}</strong> ({counts.sentLast24h} in the last 24 hours, daily ceiling {counts.dailyCap})</div>
          <div>No thanks: <strong>{counts.optout}</strong> · Failed: <strong>{counts.failed}</strong></div>
          <div className="mt-2 border-t border-gray-100 pt-2">
            Reminders: <strong>{counts.remindersSent}</strong> sent · <strong>{counts.remindersDue}</strong> due now (invited {counts.reminderAfterDays}+ days ago, not signed up) · <strong>{counts.remindersWaiting}</strong> not due yet
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">1. Load the list (CSV with ticket_name and email_address, plus an optional state column such as VIC, TAS or NSW; a blank state reads &ldquo;a football coach&rdquo;)</span>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
          <button
            type="button"
            disabled={busy || !counts || counts.pending === 0}
            onClick={async () => {
              const autoNote = counts?.autoSend ? " Automatic sending is on, so it will be switched off first (turn it back on when your new list is loaded)." : "";
              if (!window.confirm(`Remove the ${counts?.pending ?? 0} people who haven't been emailed yet? Anyone already emailed, and anyone marked "no thanks", stays on the list so they can't be invited twice. This can't be undone.${autoNote}`)) return;
              if (counts?.autoSend) {
                setBusy(true);
                const off = await call({ action: "auto", on: false });
                setBusy(false);
                if (!off.ok) { setMsg(off.error ?? "Couldn't switch automatic sending off."); return; }
              }
              await run({ action: "clear_pending" }, (j) => `Removed ${j.removed} people who hadn't been emailed. You can now load a new list. Automatic sending is off; turn it back on once the new list is loaded.`);
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
            title="Removes only people who have not been emailed yet"
          >
            Delete unsent list{counts ? ` (${counts.pending})` : ""}
          </button>
        </div>
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">2. Send a test to yourself</span>
        <button
          disabled={busy}
          onClick={() => run({ action: "test" }, (j) => `Test sent to ${j.to}.`)}
          className="w-fit rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Send test to me
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">3. Send the next batch</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={50}
            value={batch}
            onChange={(e) => setBatch(Number(e.target.value))}
            className="w-20 rounded border border-gray-300 px-2 py-1"
          />
          <button
            disabled={busy || !counts?.pending}
            onClick={() => {
              if (window.confirm(`Send the invitation to the next ${batch} people on the list?`))
                run({ action: "send", count: batch }, (j) => `Sent ${j.sentNow}${j.failedNow ? `, ${j.failedNow} failed` : ""}${j.cappedByDailyCeiling ? " (stopped at the daily ceiling)" : ""}${j.paused ? " Paused: Resend temporarily refused, so the rest are still waiting. Try again later" : ""}.`);
            }}
            className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Send batch
          </button>
        </div>
        <span className="text-xs text-gray-500">Up to 50 at a time.</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">4. Or send automatically</span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={busy || !counts}
            checked={counts?.autoSend === true}
            onChange={(e) => run({ action: "auto", on: e.target.checked }, (j) => (j.autoSend ? "Automatic sending is on." : "Automatic sending is off."))}
          />
          <span>
            Send automatically in small batches each hour between 9am and 5pm Melbourne time (about {counts?.perRun ?? "…"} an hour), never more than the daily
            limit below, until everything is finished
          </span>
        </label>
        <span className="text-xs text-gray-500">You get a summary email each day at 5pm, an alert if anything fails, and it switches itself off when done. Nothing goes out all at once.</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">Emails per day (invitations, reminders and club invitations together)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={9}
            max={1000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-24 rounded border border-gray-300 px-2 py-1"
          />
          <button
            disabled={busy || !counts || limit === counts.dailyCap}
            onClick={() => run({ action: "daily_limit", limit }, (j) => `Daily limit is now ${j.dailyCap} (about ${j.perRun} an hour).`)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <span className="text-xs text-gray-500">Counted over any rolling 24 hours. Raise it gradually.</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">5. Reminder to people who haven&apos;t responded</span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={busy || !counts}
            checked={counts?.remindersEnabled === true}
            onChange={(e) => run({ action: "reminders", on: e.target.checked }, (j) => (j.remindersEnabled ? "Reminders are on." : "Reminders are off."))}
          />
          <span>
            Send one reminder, {counts?.reminderAfterDays ?? 4} or more days after the invitation, to anyone who hasn&apos;t signed up or said no thanks (longest-waiting first, after
            new invitations in each batch)
          </span>
        </label>
        <button
          disabled={busy}
          onClick={() => run({ action: "reminder_test" }, (j) => `Reminder test sent to ${j.to}.`)}
          className="w-fit rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Send reminder test to me
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">Someone replied &quot;no thanks&quot;</span>
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={optout}
            onChange={(e) => setOptout(e.target.value)}
            placeholder="their@email.com"
            className="w-64 rounded border border-gray-300 px-2 py-1"
          />
          <button
            disabled={busy || !optout.includes("@")}
            onClick={() => run({ action: "optout", email: optout }, () => `${optout} will not be emailed.`).then(() => setOptout(""))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Never email
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Invited people</span>
          <button onClick={loadRows} className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            {rows ? "Refresh" : "Show list"}
          </button>
        </div>
        {rows && (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="w-64 rounded border border-gray-300 px-2 py-1"
            />
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {rows
                .filter((r) => !q || r.email.includes(q.toLowerCase()) || (r.first_name ?? "").toLowerCase().includes(q.toLowerCase()))
                .map((r) => (
                  <div key={r.email} className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-1.5 last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate">{r.email}</div>
                      <div className="text-xs text-gray-500">
                        {r.first_name || "no first name"} · {r.status === "optout" ? "no thanks" : r.status === "sent" ? "invited" : r.status}
                      </div>
                    </div>
                    {r.status === "optout" ? (
                      <button disabled={busy} onClick={() => mark(r.email, "restore")} className="shrink-0 text-xs font-semibold text-gray-500 underline disabled:opacity-50">
                        Undo
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => mark(r.email, "optout")}
                        className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        No thanks
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
