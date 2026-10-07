"use client";

import { useState } from "react";
import type { Club2CoachClubVacancy, Club2CoachCoachListing, Club2CoachShare } from "@/types/database";

type P = { id: string; full_name: string; email: string; mobile: string };
type View = "applications" | "matches" | "filled";

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
  const [openId, setOpenId] = useState<string | null>(null);

  const liveCoaches = coachListings.filter((l) => !l.deleted_at);
  const liveVacancies = vacancies.filter((v) => !v.deleted_at && v.status !== "superseded");
  const approved = shares.filter((s) => s.status === "approved");
  const filledShares = approved.filter((s) => s.outcome === "filled");
  const filledVacancies = liveVacancies.filter((v) => v.filled_at || v.status === "filled");

  const coachById = new Map(coachListings.map((l) => [l.id, l]));
  const vacById = new Map(vacancies.map((v) => [v.id, v]));
  const ql = q.trim().toLowerCase();
  const match = (...parts: (string | null | undefined)[]) => !ql || parts.join(" ").toLowerCase().includes(ql);

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
                  return (
                    <div key={l.id} className="rounded-lg border bg-white p-3">
                      <button className="w-full text-left" onClick={() => setOpenId(openId === l.id ? null : l.id)}>
                        <p className="text-sm font-medium">{p?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">
                          {l.role_sought} · {l.status} · {l.paid ? "paid" : "unpaid"} · {fmt(l.created_at)}
                        </p>
                      </button>
                      {openId === l.id && (
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
                  return (
                    <div key={v.id} className="rounded-lg border bg-white p-3">
                      <button className="w-full text-left" onClick={() => setOpenId(openId === v.id ? null : v.id)}>
                        <p className="text-sm font-medium">
                          {v.club_name} — {v.role_being_recruited}
                        </p>
                        <p className="text-xs text-gray-500">
                          {v.status} · {v.is_charity ? "gifted" : v.paid ? "paid" : "unpaid"} · {fmt(v.created_at)}
                        </p>
                      </button>
                      {openId === v.id && (
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
                  return (
                    <div key={s.id} className="rounded-lg border bg-white p-3 text-sm">
                      <p className="font-medium">
                        {v?.club_name ?? "Unknown club"} <span className="text-gray-400">↔</span>{" "}
                        {coach?.full_name ?? "Unknown coach"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {v?.role_being_recruited} · matched {fmt(s.shared_at)} · score {s.score != null ? Math.round(Number(s.score)) : "—"} ·{" "}
                        {s.outcome === "pending" ? "awaiting outcome" : s.outcome === "filled" ? "filled" : "not filled"}
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
                    <div key={v.id} className="rounded-lg border bg-white p-3 text-sm">
                      <p className="font-medium">
                        {v.club_name} — {v.role_being_recruited}
                      </p>
                      <p className="text-xs text-gray-500">
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
