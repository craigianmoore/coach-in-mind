"use client";

import { useEffect, useState } from "react";
import PinGate from "@/components/PinGate";
import { createClient } from "@/lib/supabase/client";
import { scoreCoach2MentorMatch } from "@/lib/scoring";
import { CLUB2COACH_COACH_PACKAGES, COACH2MENTOR_MENTOR_CAPACITY_PACKAGES } from "@/lib/constants";
import type {
  Coach2MentorCoachListing,
  Coach2MentorMentorListing,
  Coach2MentorRequest,
  Coach2MentorWeights,
  Person,
  AdminSettings,
} from "@/types/database";

type Tab = "unpaid" | "matches" | "requests" | "weighting" | "listings";
type RequestStatus = "pending" | "accepted" | "declined";

function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value === opt.value ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Coach2MentorAdmin() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("unpaid");

  const [coachListings, setCoachListings] = useState<Coach2MentorCoachListing[]>([]);
  const [mentorListings, setMentorListings] = useState<Coach2MentorMentorListing[]>([]);
  const [requests, setRequests] = useState<Coach2MentorRequest[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [requestsFilter, setRequestsFilter] = useState<RequestStatus | "all">("all");
  const [listingsPaidFilter, setListingsPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [listingsDeletedFilter, setListingsDeletedFilter] = useState<"active" | "all">("active");
  const [matchesFilter, setMatchesFilter] = useState<"all" | "unfilled" | "full">("all");
  const [autoMatching, setAutoMatching] = useState(false);

  const [coachPackage, setCoachPackage] = useState<Record<string, number>>({});
  const [coachAmount, setCoachAmount] = useState<Record<string, string>>({});
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [mentorCapacity, setMentorCapacity] = useState<Record<string, number>>({});
  const [mentorAmount, setMentorAmount] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: cl }, { data: ml }, { data: rq }, { data: ppl }, { data: st }] = await Promise.all([
      supabase.from("coach2mentor_coach_listings").select("*"),
      supabase.from("coach2mentor_mentor_listings").select("*"),
      supabase.from("coach2mentor_requests").select("*"),
      supabase.from("people").select("*"),
      supabase.from("admin_settings").select("*").eq("product", "coach2mentor").maybeSingle(),
    ]);

    setCoachListings((cl as Coach2MentorCoachListing[]) ?? []);
    setMentorListings((ml as Coach2MentorMentorListing[]) ?? []);
    setRequests((rq as Coach2MentorRequest[]) ?? []);
    const peopleMap: Record<string, Person> = {};
    ((ppl as Person[]) ?? []).forEach((p) => (peopleMap[p.id] = p));
    setPeople(peopleMap);
    setSettings(st as AdminSettings | null);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === "matches" && settings) runAutoMatchSweep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function markCoachPaid(id: string) {
    supabase.rpc("refresh_admin_session");
    setStatus(null);
    const introductions = coachPackage[id] ?? 1;
    const amount = Number(coachAmount[id] ?? CLUB2COACH_COACH_PACKAGES[introductions]);
    const { error } = await supabase.rpc("mark_coach2mentor_coach_paid", {
      target_listing_id: id,
      amount,
      introductions,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(`Marked as paid — ${introductions} mentor introduction${introductions === 1 ? "" : "s"} included.`);
    await loadAll();
  }

  async function confirmTopup(id: string, requested: number) {
    supabase.rpc("refresh_admin_session");
    setStatus(null);
    const amount = Number(topupAmount[id] ?? CLUB2COACH_COACH_PACKAGES[requested]);
    const { error } = await supabase.rpc("confirm_coach2mentor_coach_topup", {
      target_listing_id: id,
      amount,
      additional_introductions: requested,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(`Top-up confirmed — ${requested} more introduction${requested === 1 ? "" : "s"} added.`);
    await loadAll();
  }

  async function markMentorPaid(id: string) {
    supabase.rpc("refresh_admin_session");
    setStatus(null);
    const capacity = mentorCapacity[id] ?? 1;
    const amount = Number(mentorAmount[id] ?? COACH2MENTOR_MENTOR_CAPACITY_PACKAGES[capacity]);
    const { error } = await supabase.rpc("mark_coach2mentor_mentor_paid", {
      target_listing_id: id,
      amount,
      capacity,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(`Marked as paid — capacity for ${capacity} mentee${capacity === 1 ? "" : "s"}.`);
    await loadAll();
  }

  async function updateWeight(key: keyof Coach2MentorWeights, value: number) {
    if (!settings) return;
    supabase.rpc("refresh_admin_session");
    const newWeights = { ...(settings.weights as Coach2MentorWeights), [key]: value };
    setSettings({ ...settings, weights: newWeights });
    await supabase.from("admin_settings").update({ weights: newWeights }).eq("id", settings.id);
  }

  async function toggleAutoApprove(value: boolean) {
    if (!settings) return;
    supabase.rpc("refresh_admin_session");
    setSettings({ ...settings, auto_approve_matches: value });
    await supabase.from("admin_settings").update({ auto_approve_matches: value }).eq("id", settings.id);
  }

  async function deleteListing(table: "coach2mentor_coach_listings" | "coach2mentor_mentor_listings", id: string) {
    if (!window.confirm("Delete this listing? It will be hidden from the owner and from matching — this can be undone from this tab.")) {
      return;
    }
    supabase.rpc("refresh_admin_session");
    await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await loadAll();
  }

  async function restoreListing(table: "coach2mentor_coach_listings" | "coach2mentor_mentor_listings", id: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from(table).update({ deleted_at: null }).eq("id", id);
    await loadAll();
  }

  // How many of a coach's paid intro slots are already spoken for —
  // declined ones don't count against their quota, everything else does.
  function coachUsedSlots(coachId: string) {
    return requests.filter((r) => r.coach_listing_id === coachId && r.status !== "declined").length;
  }

  // How many mentees a mentor has actually accepted — used to take
  // them out of the candidate pool once they're at capacity.
  function mentorAcceptedCount(mentorId: string) {
    return requests.filter((r) => r.mentor_listing_id === mentorId && r.status === "accepted").length;
  }

  const activeCoaches = coachListings.filter((l) => l.paid && l.status !== "placed" && !l.deleted_at);
  const activeMentors = mentorListings.filter((m) => {
    if (!m.paid || m.deleted_at || m.status !== "active" || !m.currently_open) return false;
    if (m.max_mentees != null && mentorAcceptedCount(m.id) >= m.max_mentees) return false;
    return true;
  });

  const weights = settings?.weights as Coach2MentorWeights | undefined;

  const coachGroups = activeCoaches
    .map((coach) => {
      const rows = requests.filter((r) => r.coach_listing_id === coach.id);
      const suggestedCount = rows.filter((r) => r.status === "suggested").length;
      const pendingCount = rows.filter((r) => r.status === "pending").length;
      const acceptedCount = rows.filter((r) => r.status === "accepted").length;
      const usedSlots = suggestedCount + pendingCount + acceptedCount;
      const entitled = coach.included_introductions;
      const remaining = entitled != null ? Math.max(0, entitled - usedSlots) : null;
      const coachWeights = coach.personal_weights ?? weights;
      const requestedMentorIds = new Set(rows.map((r) => r.mentor_listing_id));
      const candidates = coachWeights
        ? activeMentors
            .filter((m) => !requestedMentorIds.has(m.id))
            .map((mentor) => {
              const coachPerson = people[coach.person_id];
              const breakdown = scoreCoach2MentorMatch(coach, coachPerson?.region ?? null, mentor, coachWeights);
              return { mentor, breakdown };
            })
            .sort((a, b) => b.breakdown.total - a.breakdown.total)
        : [];
      // Existing (already-requested) candidates, with their row, for display
      const existingCandidates = rows
        .map((r) => {
          const mentor = mentorListings.find((m) => m.id === r.mentor_listing_id);
          if (!mentor) return null;
          const coachPerson = people[coach.person_id];
          const breakdown = coachWeights
            ? scoreCoach2MentorMatch(coach, coachPerson?.region ?? null, mentor, coachWeights)
            : { total: r.score ?? 0 };
          return { mentor, breakdown, requestRow: r };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      return { coach, suggestedCount, pendingCount, acceptedCount, entitled, remaining, candidates, existingCandidates };
    })
    .filter((g) => {
      if (matchesFilter === "all") return true;
      const full = g.entitled != null && g.remaining === 0;
      return matchesFilter === "full" ? full : !full;
    })
    .sort((a, b) => new Date(a.coach.created_at).getTime() - new Date(b.coach.created_at).getTime());

  async function runAutoMatchSweep() {
    if (!weights) return;
    setAutoMatching(true);
    const autoApprove = settings?.auto_approve_matches ?? false;

    let totalNew = 0;
    for (const group of coachGroups) {
      if (group.remaining == null || group.remaining <= 0) continue;
      const toSuggest = group.candidates.slice(0, group.remaining);
      for (const { mentor, breakdown } of toSuggest) {
        const { error } = await supabase.from("coach2mentor_requests").insert({
          coach_listing_id: group.coach.id,
          mentor_listing_id: mentor.id,
          score: breakdown.total,
          admin_notes: "Auto-matched (top score)",
          status: autoApprove ? "pending" : "suggested",
        });
        if (!error) totalNew += 1;
      }
    }

    setAutoMatching(false);
    if (totalNew > 0) {
      setStatus(
        autoApprove
          ? `Auto-matched ${totalNew} new introduction${totalNew === 1 ? "" : "s"}.`
          : `Found ${totalNew} new suggested match${totalNew === 1 ? "" : "es"} — awaiting your approval.`
      );
    }
    await loadAll();
  }

  async function approveRequest(id: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from("coach2mentor_requests").update({ status: "pending" }).eq("id", id);
    await loadAll();
  }

  async function rejectRequest(id: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from("coach2mentor_requests").delete().eq("id", id);
    await loadAll();
  }

  async function revokeRequest(id: string) {
    if (!window.confirm("Undo this? This removes the introduction entirely.")) return;
    supabase.rpc("refresh_admin_session");
    await supabase.from("coach2mentor_requests").delete().eq("id", id);
    await loadAll();
  }

  const unpaidCoaches = coachListings.filter((l) => !l.paid && !l.deleted_at);
  const unpaidMentors = mentorListings.filter((l) => !l.paid && !l.deleted_at);
  const topupRequests = coachListings.filter((l) => l.topup_requested != null && !l.deleted_at);

  const filteredRequests = requests.filter(
    (r) => r.status !== "suggested" && (requestsFilter === "all" || r.status === requestsFilter)
  );

  function passesListingsFilter(l: { paid: boolean; deleted_at: string | null }) {
    if (listingsDeletedFilter === "active" && l.deleted_at) return false;
    if (listingsPaidFilter === "paid" && !l.paid) return false;
    if (listingsPaidFilter === "unpaid" && l.paid) return false;
    return true;
  }
  const filteredCoachListings = coachListings.filter(passesListingsFilter);
  const filteredMentorListings = mentorListings.filter(passesListingsFilter);

  function coachName(listingId: string) {
    const listing = coachListings.find((l) => l.id === listingId);
    return listing ? people[listing.person_id]?.full_name ?? "Unknown" : "Unknown";
  }
  function mentorName(listingId: string) {
    const listing = mentorListings.find((l) => l.id === listingId);
    return listing ? people[listing.person_id]?.full_name ?? "Unknown" : "Unknown";
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="py-8">
      <p className="text-sm text-gray-600">
        {coachListings.length} coach profiles · {mentorListings.length} mentor profiles ·{" "}
        {requests.length} requests
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-white/20">
        {(["unpaid", "matches", "requests", "weighting", "listings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium capitalize"
            style={
              tab === t
                ? { borderBottom: "2px solid var(--accent-dark)", color: "var(--accent-dark)" }
                : { color: "#9ca3af" }
            }
          >
            {t === "unpaid"
              ? `Unpaid (${unpaidCoaches.length + unpaidMentors.length + topupRequests.length})`
              : t}
          </button>
        ))}
      </div>

      {status && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}

      {tab === "unpaid" && (
        <div className="mt-6 flex flex-col gap-6">
          {topupRequests.length > 0 && (
            <div>
              <h2 className="font-semibold">Coaches requesting a top-up</h2>
              <div className="mt-2 flex flex-col gap-2">
                {topupRequests.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div>
                      <p className="text-sm font-medium">{people[l.person_id]?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-blue-700">
                        Wants {l.topup_requested} more — currently has {l.included_introductions ?? 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`$${CLUB2COACH_COACH_PACKAGES[l.topup_requested ?? 1]}`}
                        value={topupAmount[l.id] ?? ""}
                        onChange={(e) => setTopupAmount((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => confirmTopup(l.id, l.topup_requested as number)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Confirm top-up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-semibold">Coach profiles awaiting payment</h2>
            {unpaidCoaches.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">None right now.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {unpaidCoaches.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium">{people[l.person_id]?.full_name ?? "Unknown"}</p>
                      {l.included_introductions != null && (
                        <p className="text-xs text-blue-600">
                          Requested: {l.included_introductions} introduction{l.included_introductions === 1 ? "" : "s"}
                        </p>
                      )}
                      {l.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {l.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={coachPackage[l.id] ?? l.included_introductions ?? 1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setCoachPackage((prev) => ({ ...prev, [l.id]: n }));
                          setCoachAmount((prev) => ({ ...prev, [l.id]: String(CLUB2COACH_COACH_PACKAGES[n]) }));
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {Object.keys(CLUB2COACH_COACH_PACKAGES).map((n) => (
                          <option key={n} value={n}>
                            {n} intro{n === "1" ? "" : "s"}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder={`$${CLUB2COACH_COACH_PACKAGES[coachPackage[l.id] ?? l.included_introductions ?? 1]}`}
                        value={coachAmount[l.id] ?? ""}
                        onChange={(e) => setCoachAmount((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => markCoachPaid(l.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid
                      </button>
                      <button
                        onClick={() => deleteListing("coach2mentor_coach_listings", l.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold">Mentor profiles awaiting payment</h2>
            {unpaidMentors.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">None right now.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {unpaidMentors.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium">{people[l.person_id]?.full_name ?? "Unknown"}</p>
                      {l.max_mentees != null && (
                        <p className="text-xs text-blue-600">Requested capacity: {l.max_mentees} mentee{l.max_mentees === 1 ? "" : "s"}</p>
                      )}
                      {l.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {l.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={mentorCapacity[l.id] ?? l.max_mentees ?? 1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setMentorCapacity((prev) => ({ ...prev, [l.id]: n }));
                          setMentorAmount((prev) => ({ ...prev, [l.id]: String(COACH2MENTOR_MENTOR_CAPACITY_PACKAGES[n]) }));
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {Object.keys(COACH2MENTOR_MENTOR_CAPACITY_PACKAGES).map((n) => (
                          <option key={n} value={n}>
                            {n} mentee{n === "1" ? "" : "s"}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder={`$${COACH2MENTOR_MENTOR_CAPACITY_PACKAGES[mentorCapacity[l.id] ?? l.max_mentees ?? 1]}`}
                        value={mentorAmount[l.id] ?? ""}
                        onChange={(e) => setMentorAmount((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => markMentorPaid(l.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid
                      </button>
                      <button
                        onClick={() => deleteListing("coach2mentor_mentor_listings", l.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <FilterPills
              value={matchesFilter}
              onChange={setMatchesFilter}
              options={[
                { value: "all", label: "All coaches" },
                { value: "unfilled", label: "Needs matching" },
                { value: "full", label: "Fully matched" },
              ]}
            />
            <button
              onClick={() => runAutoMatchSweep()}
              disabled={autoMatching}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {autoMatching ? "Matching…" : "Re-run auto-match now"}
            </button>
          </div>

          <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings?.auto_approve_matches ?? false}
              onChange={(e) => toggleAutoApprove(e.target.checked)}
            />
            Fully automate matching — skip review and put top matches straight in front of mentors
          </label>

          {coachGroups.length === 0 ? (
            <p className="text-sm text-gray-500">No active, paid coach profiles yet — nothing to match.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {coachGroups.map(({ coach, suggestedCount, entitled, remaining, existingCandidates }) => (
                <div key={coach.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{people[coach.person_id]?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-500">
                        {coach.current_career_stage} · Advertised{" "}
                        {new Date(coach.created_at).toLocaleDateString("en-GB")}
                        {coach.personal_weights && (
                          <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Personal weighting
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {suggestedCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {suggestedCount} pending your approval
                        </span>
                      )}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          entitled != null && remaining === 0
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-50 text-blue-800"
                        }`}
                      >
                        {entitled != null
                          ? `${entitled - (remaining ?? 0)} of ${entitled} matched`
                          : "no package set"}
                      </span>
                    </div>
                  </div>
                  {coach.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {coach.notes}</p>}

                  <div className="mt-3 flex flex-col gap-1.5">
                    {existingCandidates.length === 0 ? (
                      <p className="text-xs text-gray-400">No mentors matched yet.</p>
                    ) : (
                      existingCandidates.map(({ mentor, breakdown, requestRow }) => (
                        <div
                          key={mentor.id}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                            requestRow.status === "suggested"
                              ? "border-amber-200 bg-amber-50"
                              : requestRow.status === "declined"
                              ? "border-gray-200 bg-gray-50 opacity-60"
                              : "border-green-100 bg-green-50/50"
                          }`}
                        >
                          <div>
                            <p className="text-sm">{people[mentor.person_id]?.full_name ?? "Unknown"}</p>
                            <p className="text-xs text-gray-500">{mentor.career_stage}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {requestRow.admin_notes === "Auto-matched (top score)" && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Auto
                              </span>
                            )}
                            <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                              {Math.round(breakdown.total * 100)}%
                            </span>
                            {requestRow.status === "suggested" && (
                              <>
                                <button
                                  onClick={() => approveRequest(requestRow.id)}
                                  className="btn-accent rounded-lg px-3 py-1 text-xs font-semibold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectRequest(requestRow.id)}
                                  className="text-xs font-semibold text-red-500 hover:underline"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {requestRow.status === "pending" && (
                              <span className="text-xs text-amber-600">Awaiting mentor</span>
                            )}
                            {requestRow.status === "accepted" && (
                              <span className="text-xs text-green-600">✓ Accepted</span>
                            )}
                            {requestRow.status === "declined" && (
                              <span className="text-xs text-gray-500">Declined</span>
                            )}
                            {requestRow.status !== "declined" && (
                              <button
                                onClick={() => revokeRequest(requestRow.id)}
                                className="text-xs font-semibold text-red-500 hover:underline"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-6">
          <div className="mb-4">
            <FilterPills
              value={requestsFilter}
              onChange={setRequestsFilter}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "accepted", label: "Accepted" },
                { value: "declined", label: "Declined" },
              ]}
            />
          </div>
          {filteredRequests.length === 0 ? (
            <p className="text-sm text-gray-500">
              {requests.length === 0 ? "No requests yet." : "Nothing matches this filter."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRequests.map((r) => {
                const coachListing = coachListings.find((l) => l.id === r.coach_listing_id);
                const mentorListing = mentorListings.find((l) => l.id === r.mentor_listing_id);
                return (
                  <div key={r.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        {coachName(r.coach_listing_id)} <span className="text-gray-400">→</span>{" "}
                        {mentorName(r.mentor_listing_id)}
                      </p>
                      <div className="flex items-center gap-2">
                        {r.score != null && (
                          <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                            {Math.round(r.score * 100)}%
                          </span>
                        )}
                        <span className="text-xs font-medium capitalize">{r.status}</span>
                      </div>
                    </div>
                    {(coachListing?.notes || mentorListing?.notes) && (
                      <div className="mt-1 space-y-0.5">
                        {coachListing?.notes && (
                          <p className="text-xs italic text-gray-400">Coach notes: {coachListing.notes}</p>
                        )}
                        {mentorListing?.notes && (
                          <p className="text-xs italic text-gray-400">Mentor notes: {mentorListing.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "weighting" && weights && (
        <div className="mt-6 max-w-xl rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Matching weighting (global default)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Used for any coach who hasn't set their own personal weighting. From 1 (least
            important) to 10 (most important).
          </p>
          {(Object.keys(weights) as (keyof Coach2MentorWeights)[]).map((key) => (
            <div key={key} className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                <span>{weights[key]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={weights[key]}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}

      {tab === "listings" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <FilterPills
              value={listingsPaidFilter}
              onChange={setListingsPaidFilter}
              options={[
                { value: "all", label: "All payment statuses" },
                { value: "paid", label: "Paid" },
                { value: "unpaid", label: "Unpaid" },
              ]}
            />
            <FilterPills
              value={listingsDeletedFilter}
              onChange={setListingsDeletedFilter}
              options={[
                { value: "active", label: "Hide deleted" },
                { value: "all", label: "Show deleted" },
              ]}
            />
          </div>

          <div>
            <h2 className="font-semibold">
              Coach profiles ({filteredCoachListings.length} of {coachListings.length})
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {filteredCoachListings.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center justify-between rounded-lg border bg-white p-3 ${l.deleted_at ? "opacity-50" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {people[l.person_id]?.full_name ?? "Unknown"}
                      {l.deleted_at && <span className="ml-2 text-xs font-normal text-red-500">(deleted)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{l.paid ? "Paid" : "Unpaid"} · {l.status}</p>
                  </div>
                  {l.deleted_at ? (
                    <button
                      onClick={() => restoreListing("coach2mentor_coach_listings", l.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteListing("coach2mentor_coach_listings", l.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold">
              Mentor profiles ({filteredMentorListings.length} of {mentorListings.length})
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {filteredMentorListings.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between rounded-lg border bg-white p-3 ${m.deleted_at ? "opacity-50" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {people[m.person_id]?.full_name ?? "Unknown"}
                      {m.deleted_at && <span className="ml-2 text-xs font-normal text-red-500">(deleted)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.paid ? "Paid" : "Unpaid"} · {m.status} · capacity{" "}
                      {m.max_mentees != null ? `${mentorAcceptedCount(m.id)} of ${m.max_mentees}` : "not set"}
                    </p>
                  </div>
                  {m.deleted_at ? (
                    <button
                      onClick={() => restoreListing("coach2mentor_mentor_listings", m.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteListing("coach2mentor_mentor_listings", m.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Coach2MentorAdminPage() {
  return (
    <PinGate>
      <Coach2MentorAdmin />
    </PinGate>
  );
}
