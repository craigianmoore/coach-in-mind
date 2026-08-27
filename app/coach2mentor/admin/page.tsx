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

type Tab = "unpaid" | "requests" | "weighting";

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

  const unpaidCoaches = coachListings.filter((l) => !l.paid);
  const unpaidMentors = mentorListings.filter((l) => !l.paid);
  const weights = settings?.weights as Coach2MentorWeights | undefined;

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

      <div className="mt-4 flex gap-2 border-b border-white/20">
        {(["unpaid", "requests", "weighting"] as Tab[]).map((t) => (
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
                    <button
                      onClick={() => markCoachPaid(l.id)}
                      className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Mark paid (${ROLE_PRICES_AUD.coach2mentor_coach})
                    </button>
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
                    <button
                      onClick={() => markMentorPaid(l.id)}
                      className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Mark paid (${ROLE_PRICES_AUD.coach2mentor_mentor})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-6">
          {requests.length === 0 ? (
            <p className="text-sm text-gray-500">No requests yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {requests.map((r) => {
                const coachListing = coachListings.find((l) => l.id === r.coach_listing_id);
                const mentorListing = mentorListings.find((l) => l.id === r.mentor_listing_id);
                return (
                  <div key={r.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        {coachName(r.coach_listing_id)} <span className="text-gray-400">→</span>{" "}
                        {mentorName(r.mentor_listing_id)}
                      </p>
                      <span className="text-xs font-medium capitalize">{r.status}</span>
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
