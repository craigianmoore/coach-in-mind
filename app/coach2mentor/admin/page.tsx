"use client";

import { useEffect, useState } from "react";
import PinGate from "@/components/PinGate";
import { createClient } from "@/lib/supabase/client";
import { ROLE_PRICES_AUD } from "@/lib/constants";
import type {
  Coach2MentorCoachListing,
  Coach2MentorMentorListing,
  Coach2MentorRequest,
  Coach2MentorWeights,
  Person,
  AdminSettings,
} from "@/types/database";

type Tab = "unpaid" | "requests" | "weighting" | "listings";
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

  async function markCoachPaid(id: string) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const { error } = await supabase.rpc("mark_coach2mentor_coach_paid", {
      target_listing_id: id,
      amount: ROLE_PRICES_AUD.coach2mentor_coach,
    });
    if (error) setStatus(error.message);
    else {
      setStatus("Marked as paid.");
      await loadAll();
    }
  }

  async function markMentorPaid(id: string) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const { error } = await supabase.rpc("mark_coach2mentor_mentor_paid", {
      target_listing_id: id,
      amount: ROLE_PRICES_AUD.coach2mentor_mentor,
    });
    if (error) setStatus(error.message);
    else {
      setStatus("Marked as paid.");
      await loadAll();
    }
  }

  async function updateWeight(key: keyof Coach2MentorWeights, value: number) {
    if (!settings) return;
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    const newWeights = { ...(settings.weights as Coach2MentorWeights), [key]: value };
    setSettings({ ...settings, weights: newWeights });
    await supabase.from("admin_settings").update({ weights: newWeights }).eq("id", settings.id);
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

  const unpaidCoaches = coachListings.filter((l) => !l.paid && !l.deleted_at);
  const unpaidMentors = mentorListings.filter((l) => !l.paid && !l.deleted_at);
  const weights = settings?.weights as Coach2MentorWeights | undefined;

  const filteredRequests = requests.filter((r) => requestsFilter === "all" || r.status === requestsFilter);

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
        {(["unpaid", "requests", "weighting", "listings"] as Tab[]).map((t) => (
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
            {t === "unpaid" ? `Unpaid (${unpaidCoaches.length + unpaidMentors.length})` : t}
          </button>
        ))}
      </div>

      {status && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}

      {tab === "unpaid" && (
        <div className="mt-6 flex flex-col gap-6">
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
                      {l.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {l.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markCoachPaid(l.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid (${ROLE_PRICES_AUD.coach2mentor_coach})
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
                      {l.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {l.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markMentorPaid(l.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid (${ROLE_PRICES_AUD.coach2mentor_mentor})
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
                      <div className="flex items-center gap-3">
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
          <h2 className="font-semibold">Matching weighting</h2>
          <p className="mt-1 text-sm text-gray-600">
            Used to rank mentors when a coach browses — from 1 (least
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
                    <p className="text-xs text-gray-500">{m.paid ? "Paid" : "Unpaid"} · {m.status}</p>
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
