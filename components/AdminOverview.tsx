"use client";

import { useState } from "react";
import type { Club2CoachClubVacancy, Club2CoachCoachListing, Club2CoachShare } from "@/types/database";

type P = { id: string; full_name: string; email: string; mobile: string };
type View = "applications" | "matches" | "filled";

// Status colouring: filled = green, active = orange, anything else = grey.
function tone(kind: "filled" | "active" | "other") {
  return kind === "filled"
    ? { badge: "bg-green-100 text-green-800", card: "border-green-300 bg-green-50", text: "text-green-700" }
    : kind === "active"
    ? { badge: "bg-orange-100 text-orange-800", card: "border-orange-300 bg-orange-50", text: "text-orange-700" }
    : { badge: "bg-gray-100 text-gray-600", card: "border-gray-200 bg-white", text: "text-gray-500" };
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// Read-only admin overview of everything on the platform: applications
// (coach listings + vacancies), who's been matched with whom, and filled
// roles. Admin-only page, and it only reads data the admin RLS already
// grants — nothing here can edit or impersonate anyone.
export default function AdminOverview({
  coachListings,
  vacancies,
  shares,
  people,
}: {
  coachListings: Club2CoachCoachListing[];
  vacancies: Club2CoachClubVacancy[];
  shares: Club2CoachShare[];
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
  const liveVacancies = vacancies.filter((v) => !v.deleted_at && v.status !== "superseded");
  const approved = shares.filter((s) => s.status === "approved");
  const filledShares = approved.filter((s) => s.outcome === "filled");
  const filledVacancies = liveVacancies.filter((v) => v.filled_at || v.status === "filled");

  const coachById = new Map(coachListings.map((l) => [l.id, l]));
  const vacById = new Map(vacancies.map((v) => [v.id, v]));
  const ql = q.trim().toLowerCase();
  const match = (...parts: (string | null | undefined)[]) => !ql || parts.join(" ").toLowerCase().includes(ql);

  function exportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    if (view === "applications") {
      downloadCsv(`coach-applications-${today}.csv`, [
        ["Coach", "Email", "Mobile", "Role sought", "Status", "Paid", "Introductions", "Regions", "Created"],
        ...liveCoaches.map((l) => {
          const p = people[l.person_id];
          return [p?.full_name, p?.email, p?.mobile, l.role_sought, l.status, l.paid ? "yes" : "no", l.included_introductions, l.preferred_regions?.join("; "), fmt(l.created_at)];
        }),
      ]);
      downloadCsv(`vacancies-${today}.csv`, [
        ["Club", "Role", "Competition", "Age group", "Region", "Advertised by", "Email", "Mobile", "Status", "Paid", "Gifted", "Filled", "Created"],
        ...liveVacancies.map((v) => {
          const p = people[v.person_id];
          return [v.club_name, v.role_being_recruited, v.competition_level, v.age_group_max ? `${v.age_group}-${v.age_group_max}` : v.age_group, v.region, p?.full_name, p?.email, p?.mobile, v.status, v.paid ? "yes" : "no", v.is_charity ? "yes" : "no", fmt(v.filled_at), fmt(v.created_at)];
        }),
      ]);
    } else if (view === "matches") {
      downloadCsv(`matches-${today}.csv`, [
        ["Club", "Role", "Coach", "Coach email", "Coach mobile", "Club contact", "Club email", "Club mobile", "Matched", "Score", "Outcome"],
        ...approved.map((s) => {
          const cl = coachById.get(s.coach_listing_id);
          const v = vacById.get(s.club_vacancy_id);
          const coach = cl ? people[cl.person_id] : undefined;
          const club = v ? people[v.person_id] : undefined;
          return [v?.club_name, v?.role_being_recruited, coach?.full_name, coach?.email, coach?.mobile, club?.full_name, club?.email, club?.mobile, fmt(s.shared_at), s.score != null ? Math.round(Number(s.score)) : "", s.outcome];
        }),
      ]);
    } else {
      downloadCsv(`filled-roles-${today}.csv`, [
        ["Club", "Role", "Competition", "Region", "Filled", "Coach"],
        ...filledVacancies.map((v) => {
          const hired = filledShares.find((s) => s.club_vacancy_id === v.id);
          const cl = hired ? coachById.get(hired.coach_listing_id) : undefined;
          return [v.club_name, v.role_being_recruited, v.competition_level, v.region, fmt(v.filled_at), cl ? people[cl.person_id]?.full_name : ""];
        }),
      ]);
    }
  }

  const kindOf = (status: string, filled: boolean) => (filled || status === "filled" ? "filled" : status === "active" ? "active" : "other");

  const stat = (label: string, n: number) => (
    <div className="rounded-lg border bg-white px-3 py-2">
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

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {stat("Coach listings", liveCoaches.length)}
        {stat("Active coaches", liveCoaches.filter((l) => l.paid && l.status === "active").length)}
        {stat("Vacancies", liveVacancies.length)}
        {stat("Active vacancies", liveVacancies.filter((v) => v.paid && v.status === "active").length)}
        {stat("Matches made", approved.length)}
        {stat("Roles filled", filledVacancies.length)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["applications", "Applications"],
            ["matches", "Matches (club ↔ coach)"],
            ["filled", "Filled roles"],
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
          placeholder="Search name, club, role…"
          className="ml-auto rounded-lg border px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          title={view === "applications" ? "Downloads two files: coach applications and vacancies" : "Download this view as CSV"}
        >
          ⬇ Download CSV
        </button>
      </div>

      {view === "applications" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-semibold">Coach applications ({liveCoaches.length})</h2>
            <div className="mt-2 flex flex-col gap-2">
              {liveCoaches
                .filter((l) => match(people[l.person_id]?.full_name, l.role_sought, l.status))
                .map((l) => {
                  const p = people[l.person_id];
                  const t = tone(kindOf(l.status, false));
                  return (
                    <div key={l.id} className={`rounded-lg border p-3 ${t.card}`}>
                      <button className="w-full rounded text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300" onClick={() => toggle(l.id)}>
                        <p className="text-sm font-medium">{p?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">
                          {l.role_sought} · <span className={`rounded-full px-2 py-0.5 font-semibold ${t.badge}`}>{l.status}</span> · {l.paid ? "paid" : "unpaid"} · {fmt(l.created_at)}
                        </p>
                      </button>
                      {openIds.has(l.id) && (
                        <Detail
                          rows={[
                            ["Email", p?.email],
                            ["Mobile", p?.mobile],
                            ["Ability levels", l.ability_levels?.join(", ")],
                            ["Competition levels", l.preferred_competition_levels?.join(", ")],
                            ["Age groups", l.preferred_age_groups?.join(", ")],
                            ["Regions", l.preferred_regions?.join(", ")],
                            ["States", l.state_preferences?.join(", ") || "Open to all"],
                            ["Relocating", l.open_to_relocating ? "Yes" : "No"],
                            [
                              "Salary",
                              l.salary_min || l.salary_max
                                ? `$${l.salary_min ?? "?"}–$${l.salary_max ?? "?"}${l.salary_negotiable ? " (negotiable)" : ""}`
                                : l.salary_negotiable
                                ? "Negotiable"
                                : null,
                            ],
                            ["Introductions", l.included_introductions?.toString()],
                            ["Overview", l.overview],
                          ]}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          <div>
            <h2 className="font-semibold">Vacancies ({liveVacancies.length})</h2>
            <div className="mt-2 flex flex-col gap-2">
              {liveVacancies
                .filter((v) => match(v.club_name, v.role_being_recruited, people[v.person_id]?.full_name, v.status))
                .map((v) => {
                  const p = people[v.person_id];
                  const t = tone(kindOf(v.status, !!v.filled_at));
                  return (
                    <div key={v.id} className={`rounded-lg border p-3 ${t.card}`}>
                      <button className="w-full rounded text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300" onClick={() => toggle(v.id)}>
                        <p className="text-sm font-medium">
                          {v.club_name} — {v.role_being_recruited}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${t.badge}`}>{v.filled_at ? "filled" : v.status}</span> · {v.is_charity ? "gifted" : v.paid ? "paid" : "unpaid"} · {fmt(v.created_at)}
                        </p>
                      </button>
                      {openIds.has(v.id) && (
                        <Detail
                          rows={[
                            ["Advertised by", p?.full_name],
                            ["Email", p?.email],
                            ["Mobile", p?.mobile],
                            ["Competition", v.competition_level],
                            ["Age group", v.age_group_max ? `${v.age_group}–${v.age_group_max}` : v.age_group],
                            ["Region", v.region],
                            ["Accreditation", v.required_accreditation],
                            [
                              "Salary",
                              v.salary_min || v.salary_max
                                ? `$${v.salary_min ?? "?"}–$${v.salary_max ?? "?"}${v.salary_negotiable ? " (negotiable)" : ""}`
                                : v.salary_negotiable
                                ? "Negotiable"
                                : null,
                            ],
                            ["Introductions", v.included_introductions?.toString()],
                            ["Overview", v.overview],
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
          <h2 className="font-semibold">Matches ({approved.length})</h2>
          {approved.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No matches made yet.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {approved
                .slice()
                .sort((a, b) => b.shared_at.localeCompare(a.shared_at))
                .map((s) => {
                  const cl = coachById.get(s.coach_listing_id);
                  const v = vacById.get(s.club_vacancy_id);
                  const coach = cl ? people[cl.person_id] : undefined;
                  const club = v ? people[v.person_id] : undefined;
                  if (!match(coach?.full_name, v?.club_name, v?.role_being_recruited)) return null;
                  const t = tone(s.outcome === "filled" ? "filled" : s.outcome === "pending" ? "active" : "other");
                  return (
                    <div key={s.id} className={`rounded-lg border p-3 text-sm ${t.card}`}>
                      <p className="font-medium">
                        {v?.club_name ?? "Unknown club"} <span className="text-gray-400">↔</span>{" "}
                        {coach?.full_name ?? "Unknown coach"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {v?.role_being_recruited} · matched {fmt(s.shared_at)} · score {s.score != null ? Math.round(Number(s.score)) : "—"} ·{" "}
                        <span className={`font-semibold ${t.text}`}>{s.outcome === "pending" ? "awaiting outcome" : s.outcome === "filled" ? "filled" : "not filled"}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Club contact: {club?.full_name} ({club?.email}, {club?.mobile}) · Coach: {coach?.email}, {coach?.mobile}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {view === "filled" && (
        <div className="mt-4">
          <h2 className="font-semibold">Filled roles ({filledVacancies.length})</h2>
          {filledVacancies.length === 0 && filledShares.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No roles marked as filled yet.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {filledVacancies
                .filter((v) => match(v.club_name, v.role_being_recruited))
                .map((v) => {
                  const hired = filledShares.find((s) => s.club_vacancy_id === v.id);
                  const cl = hired ? coachById.get(hired.coach_listing_id) : undefined;
                  const coach = cl ? people[cl.person_id] : undefined;
                  return (
                    <div key={v.id} className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">
                      <p className="font-medium text-green-800">
                        {v.club_name} — {v.role_being_recruited}
                      </p>
                      <p className="text-xs text-green-700">
                        Filled {fmt(v.filled_at)} · {v.competition_level} · {v.region}
                        {coach ? ` · by ${coach.full_name}` : ""}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
