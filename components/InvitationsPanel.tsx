"use client";

import { useEffect, useState } from "react";

type Counts = { autoSend?: boolean; pending: number; sent: number; failed: number; optout: number; sending: number; sentLast24h: number; dailyCap: number };

// Admin tool for the one-off coach invitation mail-out. Needs a master-admin session; all sending happens
// on the server (/api/admin/invitations), which keeps the daily ceiling and never emails anyone twice.
export default function InvitationsPanel() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState(25);
  const [optout, setOptout] = useState("");

  async function call(body?: object) {
    const res = await fetch("/api/admin/invitations", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    return res.json().catch(() => ({ ok: false, error: "Unexpected response" }));
  }

  async function refresh() {
    const j = await call();
    if (j.ok) setCounts(j);
    else setMsg(j.error ?? "Couldn't load. A master admin session is needed.");
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

  async function onFile(f: File | undefined) {
    if (!f) return;
    const csv = await f.text();
    await run({ action: "import", csv }, (j) =>
      `Added ${j.added}. Skipped: ${j.footballVictoria} Football Victoria staff, ${j.alreadySignedUp} already signed up, ${j.alreadyListed} already on the list, ${j.invalid} invalid.`
    );
  }

  return (
    <div className="mt-6 flex max-w-xl flex-col gap-4 text-sm">
      <p className="text-gray-600">
        One-off coach invitation. Load the list once, send yourself a test, then send in batches. Nobody is emailed twice, and
        anyone marked &quot;no thanks&quot; is never emailed.
      </p>

      {counts && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div>Waiting to send: <strong>{counts.pending}</strong></div>
          <div>Sent: <strong>{counts.sent}</strong> ({counts.sentLast24h} in the last 24 hours, daily ceiling {counts.dailyCap})</div>
          <div>No thanks: <strong>{counts.optout}</strong> · Failed: <strong>{counts.failed}</strong></div>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">1. Load the list (CSV with ticket_name and email_address)</span>
        <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
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
                run({ action: "send", count: batch }, (j) => `Sent ${j.sentNow}${j.failedNow ? `, ${j.failedNow} failed` : ""}${j.cappedByDailyCeiling ? " (stopped at the daily ceiling)" : ""}.`);
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
            onChange={(e) => run({ action: "auto", on: e.target.checked }, () => (e.target.checked ? "Automatic sending is on." : "Automatic sending is off."))}
          />
          <span>Send automatically, about 80 a day between 9am and 5pm Melbourne time, until the list is finished</span>
        </label>
        <span className="text-xs text-gray-500">You get a summary email each day at 5pm, an alert if anything fails, and it switches itself off when done.</span>
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

      {msg && <div className="rounded-lg bg-gray-50 p-3 text-gray-800">{msg}</div>}
    </div>
  );
}
