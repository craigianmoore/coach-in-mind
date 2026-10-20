"use client";

import { useEffect, useState } from "react";
import { REGIONS_BY_STATE } from "@/lib/constants";
import type { Counts } from "@/components/InvitationsPanel";

type ClubRow = { club: string; region: string; email: string; status: string };

// Admin tool for inviting Victorian clubs. Switched OFF until you turn it on. Invitations only go to clubs whose region
// is ticked here, so clubs are invited where coaches already are. Needs a master-admin session; sending happens on the
// server alongside the coach invitations (see the Invites tab above).
export default function ClubInvitationsPanel() {
  const regionsAll = REGIONS_BY_STATE.VIC as readonly string[];
  const [counts, setCounts] = useState<Counts | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [share, setShare] = useState(25);
  const [regions, setRegions] = useState<string[]>([]);
  const [rows, setRows] = useState<ClubRow[] | null>(null);
  const [optout, setOptout] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(body?: object) {
    const res = await fetch("/api/admin/invitations", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    return res.json().catch(() => ({ ok: false, error: "Unexpected response" }));
  }

  function apply(j: Counts) {
    setCounts(j);
    setEnabled(j.clubEnabled);
    setShare(j.clubShare);
    setRegions(j.clubRegions ?? []);
  }

  useEffect(() => {
    call().then((j) => {
      if (j.ok) apply(j);
    });
  }, []);

  async function run(body: object, done: (j: any) => string) {
    setBusy(true);
    setMsg("");
    const j = await call(body);
    setMsg(j.ok ? done(j) : j.error ?? "Failed");
    if (j.ok && j.clubShare !== undefined) apply(j);
    setBusy(false);
  }

  async function loadClubs() {
    setBusy(true);
    const j = await call({ action: "club_list" });
    if (j.ok) setRows(j.rows);
    else setMsg(j.error ?? "Failed");
    setBusy(false);
  }

  function downloadCsv() {
    if (!rows) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["club,region,email,status", ...rows.map((r) => [r.club, r.region, r.email, r.status].map(esc).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "victorian-clubs.csv";
    a.click();
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const csv = await f.text();
    await run({ action: "club_regions_import", csv }, (j) =>
      `Regions set for ${j.updated} clubs. Skipped: ${j.blank} with no region, ${j.unknownRegion} with a region not on the list, ${j.unknownClub} club names not found.`
    );
    loadClubs();
  }

  const perRegion = (r: string) => (rows ? rows.filter((x) => x.region === r && x.status === "not yet").length : null);
  const toggle = (r: string) => setRegions((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  return (
    <div className="mt-10 flex max-w-xl flex-col gap-4 border-t border-gray-200 pt-6 text-sm">
      <h2 className="text-base font-bold text-gray-800">Club invitations (Victoria)</h2>
      <p className="text-gray-600">
        Invites Victorian clubs, only in the regions you tick, so clubs hear from us where coaches already are. It stays off until you switch it on, and it
        shares the daily limit above: clubs get the percentage you choose and coaches get the rest. Each club contact is emailed once.
      </p>

      {counts && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div>Ready to invite (ticked regions): <strong>{counts.clubsEligible}</strong></div>
          <div>Already invited: <strong>{counts.clubsSent}</strong></div>
          <div>Not yet given a region: <strong>{counts.clubsNoRegion}</strong>. These are never invited until a region is set.</div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">1. Give each club a region</span>
        <span className="text-xs text-gray-500">
          Download the list, fill in the region column using these exact names ({regionsAll.join(", ")}), then upload it. Clubs left blank are not invited.
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={loadClubs} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {rows ? "Refresh clubs" : "Load clubs"}
          </button>
          <button onClick={downloadCsv} disabled={!rows} className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Download CSV
          </button>
          <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-semibold text-gray-700">2. Choose where and how much</span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>Send club invitations automatically</span>
        </label>
        <label className="flex items-center gap-2">
          <span>Share of each day for clubs</span>
          <input type="number" min={0} max={100} value={share} onChange={(e) => setShare(Number(e.target.value))} className="w-20 rounded border border-gray-300 px-2 py-1" />
          <span>% (coaches get the rest)</span>
        </label>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {regionsAll.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input type="checkbox" checked={regions.includes(r)} onChange={() => toggle(r)} />
              <span>
                {r}
                {perRegion(r) !== null && <span className="text-gray-500"> ({perRegion(r)} clubs to invite)</span>}
              </span>
            </label>
          ))}
        </div>
        <button
          disabled={busy}
          onClick={() => run({ action: "club_settings", enabled, share, regions }, () => "Saved.")}
          className="w-fit rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">3. Send a test to yourself</span>
        <button
          disabled={busy}
          onClick={() => run({ action: "club_test" }, (j) => `Test sent to ${j.to}.`)}
          className="w-fit rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Send club test to me
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold text-gray-700">A club replied &quot;no thanks&quot;</span>
        <div className="flex items-center gap-2">
          <input type="email" value={optout} onChange={(e) => setOptout(e.target.value)} placeholder="their@email.com" className="w-64 rounded border border-gray-300 px-2 py-1" />
          <button
            disabled={busy || !optout.includes("@")}
            onClick={() => run({ action: "club_optout", email: optout }, () => `${optout} will not be emailed.`).then(() => setOptout(""))}
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
