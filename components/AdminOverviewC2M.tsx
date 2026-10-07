"use client";

import { useState } from "react";
import type { Coach2MentorCoachListing, Coach2MentorMentorListing, Coach2MentorRequest } from "@/types/database";

type P = { id: string; full_name: string; email: string; mobile: string };
type View = "applications" | "matches" | "mentoring";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// Same colour rule as Club 2 Coach: accepted/active mentoring = green,
// active listings and pending requests = orange, anything else = grey.
function tone(kind: "done" | "active" | "other") {
  return kind === "done"
    ? { badge: "bg-green-100 text-green-800", card: "border-green-300 bg-green-50", text: "text-green-700" }
    : kind === "active"
    ? { badge: "bg-orange-100 text-orange-800", card: "border-orange-300 bg-orange-50", text: "text-orange-700" }
    : { badge: "bg-gray-100 text-gray-600", card: "border-gray-200 bg-white", text: "text-gray-500" };
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Read-only Coach 2 Mentor overview: applications (coaches seeking a
// mentor + mentors), coach ↔ mentor matches, and active mentoring.
export default function AdminOverviewC2M({
  coachListings,
  mentorListings,
  requests,
  people,
}: {
  coachListings: Coach2MentorCoachListing[];
  mentorListings: Coach2MentorMentorListing[];
  requests: Coach2MentorRequest[];
  people: Record<string, P>;
}) {
  const [view, setView] = useState<View>("applications");
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const liveCoaches = coachListings.filter((l) => !l.deleted_at);
  const liveMentors = mentorListings.filter((l) => !l.deleted_at);
  const visibleRequests = requests.filter((r) => r.status !== "suggested");
  const accepted = visibleRequests.filter((r) => r.status === "accepted");
  const coachById = new Map(coachListings.map((l) => [l.id, l]));
  const mentorById = new Map(mentorListings.map((l) => [l.id, l]));
  const ql = q.trim().toLowerCase();
  const match = (...parts: (string | null | undefined)[]) => !ql || parts.join(" ").toLowerCase().includes(ql);
  const kindOf = (status: string) => (status === "active" ? "active" : "other");

  const stat = (label: string, n: number) => (
    <div className="rounded-lg border bg-white px-3 py-2 text-gray-900">
      <p className="text-lg font-bold">{n}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );

  const Detail = ({ rows }: { rows: [string, string | null | undefined][] }) => (
    <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="inline font-semibold text-gray-500">{k}: </dt>
            <dd className="inline text-gray-800">{v}</dd>
          </div>
        ))}
    </dl>
  );

  const requestRow = (r: Coach2MentorRequest) => {
    const cl = coachById.get(r.coach_listing_id);
    const ml = mentorById.get(r.mentor_listing_id);
    return { r, coach: cl ? people[cl.person_id] : undefined, mentor: ml ? people[ml.person_id] : undefined };
  };

  function exportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    if (view === "applications") {
      downloadCsv(`mentee-applications-${today}.csv`, [
        ["Coach", "Email", "Mobile", "Career stage", "Availability", "Status", "Paid", "Introductions", "Regions", "Created"],
        ...liveCoaches.map((l) => {
          const p = people[l.person_id];
          return [p?.full_name, p?.email, p?.mobile, l.current_career_stage, l.availability, l.status, l.paid ? "yes" : "no", l.included_introductions, l.preferred_regions?.join("; "), fmt(l.created_at)];
        }),
      ]);
      downloadCsv(`mentors-${today}.csv`, [
        ["Mentor", "Email", "Mobile", "Licence", "Career stage", "Availability", "Max mentees", "Status", "Paid", "Open", "Created"],
        ...liveMentors.map((l) => {
          const p = people[l.person_id];
          return [p?.full_name, p?.email, p?.mobile, l.licence, l.career_stage, l.availability, l.max_mentees, l.status, l.paid ? "yes" : "no", l.currently_open ? "yes" : "no", fmt(l.created_at)];
        }),
      ]);
    } else {
      const list = view === "mentoring" ? accepted : visibleRequests;
      downloadCsv(`${view === "mentoring" ? "active-mentoring" : "mentor-matches"}-${today}.csv`, [
        ["Coach", "Coach email", "Coach mobile", "Mentor", "Mentor email", "Mentor mobile", "Requested", "Responded", "Score", "Status"],
        ...list.map((r) => {
          const x = requestRow(r);
          return [x.coach?.full_name, x.coach?.email, x.coach?.mobile, x.mentor?.full_name, x.mentor?.email, x.mentor?.mobile, fmt(r.created_at), fmt(r.responded_at), r.score != null ? Math.round(Number(r.score)) : "", r.status];
        }),
      ]);
    }
  }

  const matchCard = (r: Coach2MentorRequest) => {
    const { coach, mentor } = requestRow(r);
    if (!match(coach?.full_name, mentor?.full_name, r.status)) return null;
    const t = tone(r.status === "accepted" ? "done" : r.status === "pending" ? "active" : "other");
    return (
      <div key={r.id} className={`rounded-lg border p-3 text-sm ${t.card}`}>
        <p className="font-medium text-gray-900">
          {coach?.full_name ?? "Unknown coach"} <span className="text-gray-400">↔</span> {mentor?.full_name ?? "Unknown mentor"}
        </p>
        <p className="text-xs text-gray-500">
          requested {fmt(r.created_at)}
          {r.responded_at ? ` · responded ${fmt(r.responded_at)}` : ""} · score {r.score != null ? Math.round(Number(r.score)) : "—"} ·{" "}
          <span className={`font-semibold ${t.text}`}>{r.status === "pending" ? "awaiting mentor" : r.status}</span>
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Coach: {coach?.email}, {coach?.mobile} · Mentor: {mentor?.email}, {mentor?.mobile}
        </p>
      </div>
    );
  };

  return (
    <div className="mt-6 text-gray-900">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {stat("Mentee listings", liveCoaches.length)}
        {stat("Active mentees", liveCoaches.filter((l) => l.paid && l.status === "active").length)}
        {stat("Mentors", liveMentors.length)}
        {stat("Active mentors", liveMentors.filter((l) => l.paid && l.status === "active").length)}
        {stat("Requests made", visibleRequests.length)}
        {stat("Mentoring accepted", accepted.length)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["applications", "Applications"],
            ["matches", "Matches (coach ↔ mentor)"],
            ["mentoring", "Active mentoring"],
          ] as [View, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              view === v ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, status…"
          className="ml-auto rounded-lg border px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          title={view === "applications" ? "Downloads two files: mentee applications and mentors" : "Download this view as CSV"}
        >
          ⬇ Download CSV
        </button>
      </div>

      {view === "applications" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-semibold">Coaches seeking a mentor ({liveCoaches.length})</h2>
            <div className="mt-2 flex flex-col gap-2">
              {liveCoaches
                .filter((l) => match(people[l.person_id]?.full_name, l.current_career_stage, l.status))
                .map((l) => {
                  const p = people[l.person_id];
                  const t = tone(kindOf(l.status));
                  return (
                    <div key={l.id} className={`rounded-lg border p-3 ${t.card}`}>
                      <button
                        className="w-full rounded text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                        onClick={() => toggle(l.id)}
                      >
                        <p className="text-sm font-medium">{p?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">
                          {l.current_career_stage ?? "—"} · <span className={`rounded-full px-2 py-0.5 font-semibold ${t.badge}`}>{l.status}</span> ·{" "}
                          {l.paid ? "paid" : "unpaid"} · {fmt(l.created_at)}
                        </p>
                      </button>
                      {openIds.has(l.id) && (
                        <Detail
                          rows={[
                            ["Email", p?.email],
                            ["Mobile", p?.mobile],
                            ["Availability", l.availability],
                            ["Support areas", l.support_areas?.join(", ")],
                            ["Regions", l.preferred_regions?.join(", ")],
                            ["States", l.state_preferences?.join(", ") || "Open to all"],
                            ["Meets per year", l.meet_min || l.meet_max ? `${l.meet_min ?? "?"}–${l.meet_max ?? "?"}` : null],
                            ["Budget", l.budget_min || l.budget_max ? `$${l.budget_min ?? "?"}–$${l.budget_max ?? "?"}` : null],
                            ["Introductions", l.included_introductions?.toString()],
                            ["Goals", l.goals],
                          ]}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          <div>
            <h2 className="font-semibold">Mentors ({liveMentors.length})</h2>
            <div className="mt-2 flex flex-col gap-2">
              {liveMentors
                .filter((l) => match(people[l.person_id]?.full_name, l.licence, l.status))
                .map((l) => {
                  const p = people[l.person_id];
                  const t = tone(kindOf(l.status));
                  return (
                    <div key={l.id} className={`rounded-lg border p-3 ${t.card}`}>
                      <button
                        className="w-full rounded text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                        onClick={() => toggle(l.id)}
                      >
                        <p className="text-sm font-medium">{p?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">
                          {l.licence ?? "—"} · <span className={`rounded-full px-2 py-0.5 font-semibold ${t.badge}`}>{l.status}</span> ·{" "}
                          {l.paid ? "paid" : "unpaid"} · {fmt(l.created_at)}
                        </p>
                      </button>
                      {openIds.has(l.id) && (
                        <Detail
                          rows={[
                            ["Email", p?.email],
                            ["Mobile", p?.mobile],
                            ["Career stage", l.career_stage],
                            ["Availability", l.availability],
                            ["Regions served", l.regions_served?.join(", ")],
                            ["Specialisms", l.specialisms?.join(", ")],
                            ["Max mentees", l.max_mentees?.toString()],
                            ["Currently open", l.currently_open ? "Yes" : "No"],
                            ["Rate", l.rate_type === "free" ? "Free" : `$${l.rate_amount ?? "?"}${l.rate_unit ? ` / ${l.rate_unit}` : ""}${l.rate_negotiable ? " (negotiable)" : ""}`],
                            ["Evidence", l.accreditation_evidence_filename],
                            ["Bio", l.bio],
                          ]}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {view === "matches" && (
        <div className="mt-4">
          <h2 className="font-semibold">Mentor requests ({visibleRequests.length})</h2>
          {visibleRequests.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No requests made yet.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {visibleRequests
                .slice()
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map(matchCard)}
            </div>
          )}
        </div>
      )}

      {view === "mentoring" && (
        <div className="mt-4">
          <h2 className="font-semibold">Active mentoring ({accepted.length})</h2>
          {accepted.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No mentoring relationships accepted yet.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">{accepted.map(matchCard)}</div>
          )}
        </div>
      )}
    </div>
  );
}
