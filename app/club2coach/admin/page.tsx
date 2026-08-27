"use client";

import { useEffect, useState } from "react";
import PinGate from "@/components/PinGate";
import { createClient } from "@/lib/supabase/client";
import { scoreClub2CoachMatch } from "@/lib/scoring";
import { ROLE_PRICES_AUD } from "@/lib/constants";
import type {
  Club2CoachCoachListing,
  Club2CoachClubVacancy,
  Club2CoachWeights,
  Club2CoachShare,
  Person,
  AdminSettings,
} from "@/types/database";

type Tab = "unpaid" | "matches" | "weighting";

function Club2CoachAdmin() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("unpaid");

  const [coachListings, setCoachListings] = useState<Club2CoachCoachListing[]>([]);
  const [vacancies, setVacancies] = useState<Club2CoachClubVacancy[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [shares, setShares] = useState<Club2CoachShare[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: cl }, { data: cv }, { data: ppl }, { data: sh }, { data: st }] = await Promise.all([
      supabase.from("club2coach_coach_listings").select("*"),
      supabase.from("club2coach_club_vacancies").select("*"),
      supabase.from("people").select("*"),
      supabase.from("club2coach_shares").select("*"),
      supabase.from("admin_settings").select("*").eq("product", "club2coach").maybeSingle(),
    ]);

    setCoachListings((cl as Club2CoachCoachListing[]) ?? []);
    setVacancies((cv as Club2CoachClubVacancy[]) ?? []);
    const peopleMap: Record<string, Person> = {};
    ((ppl as Person[]) ?? []).forEach((p) => (peopleMap[p.id] = p));
    setPeople(peopleMap);
    setShares((sh as Club2CoachShare[]) ?? []);
    setSettings(st as AdminSettings | null);
    setLoading(false);
  }

  async function markCoachPaid(id: string) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const { error } = await supabase.rpc("mark_club2coach_coach_paid", {
      target_listing_id: id,
      amount: ROLE_PRICES_AUD.club2coach_coach,
    });
    if (error) setStatus(error.message);
    else {
      setStatus("Marked as paid.");
      await loadAll();
    }
  }

  async function markVacancyPaid(id: string) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const { error } = await supabase.rpc("mark_club2coach_club_paid", {
      target_listing_id: id,
      amount: ROLE_PRICES_AUD.club2coach_club,
    });
    if (error) setStatus(error.message);
    else {
      setStatus("Marked as paid.");
      await loadAll();
    }
  }

  async function shareMatch(coachListingId: string, vacancyId: string, score: number) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const { error } = await supabase.from("club2coach_shares").insert({
      coach_listing_id: coachListingId,
      club_vacancy_id: vacancyId,
      score,
    });
    if (error) setStatus(error.message);
    else {
      setStatus("Details shared — both parties can now see each other's contact info.");
      await loadAll();
    }
  }

  async function updateWeight(key: keyof Club2CoachWeights, value: number) {
    if (!settings) return;
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    const newWeights = { ...(settings.weights as Club2CoachWeights), [key]: value };
    setSettings({ ...settings, weights: newWeights });
    await supabase.from("admin_settings").update({ weights: newWeights }).eq("id", settings.id);
  }

  const unpaidCoaches = coachListings.filter((l) => !l.paid);
  const unpaidVacancies = vacancies.filter((v) => !v.paid);
  const activeCoaches = coachListings.filter((l) => l.paid && l.status !== "placed");
  const activeVacancies = vacancies.filter((v) => v.paid && v.status !== "filled");
  const sharedPairs = new Set(shares.map((s) => `${s.coach_listing_id}:${s.club_vacancy_id}`));

  const weights = settings?.weights as Club2CoachWeights | undefined;

  const computedMatches = weights
    ? activeVacancies.flatMap((vacancy) =>
        activeCoaches.map((coach) => {
          const coachPerson = people[coach.person_id];
          const breakdown = scoreClub2CoachMatch(coach, coachPerson?.current_licence ?? null, vacancy, weights);
          return { coach, vacancy, breakdown };
        })
      ).sort((a, b) => b.breakdown.total - a.breakdown.total)
    : [];

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="py-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {coachListings.length} coach listings · {vacancies.length} vacancies
        </p>
      </div>

      <div className="mt-4 flex gap-2 border-b">
        {(["unpaid", "matches", "weighting"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-accent text-accent" : "text-gray-500"
            }`}
            style={tab === t ? { borderColor: "var(--accent-dark)", color: "var(--accent-dark)" } : {}}
          >
            {t === "unpaid" ? `Unpaid (${unpaidCoaches.length + unpaidVacancies.length})` : t}
          </button>
        ))}
      </div>

      {status && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}

      {tab === "unpaid" && (
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <h2 className="font-semibold">Coach listings awaiting payment</h2>
            {unpaidCoaches.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">None right now.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {unpaidCoaches.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium">{people[l.person_id]?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-500">{l.role_sought}</p>
                      {l.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {l.notes}</p>}
                    </div>
                    <button
                      onClick={() => markCoachPaid(l.id)}
                      className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Mark paid (${ROLE_PRICES_AUD.club2coach_coach})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold">Vacancies awaiting payment</h2>
            {unpaidVacancies.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">None right now.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {unpaidVacancies.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium">{v.club_name}</p>
                      <p className="text-xs text-gray-500">
                        {v.role_being_recruited} · {v.competition_level}
                      </p>
                      {v.notes && <p className="mt-1 text-xs italic text-gray-400">Notes: {v.notes}</p>}
                    </div>
                    <button
                      onClick={() => markVacancyPaid(v.id)}
                      className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Mark paid (${ROLE_PRICES_AUD.club2coach_club})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div className="mt-6">
          {computedMatches.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active, paid listings on both sides yet — nothing to match.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {computedMatches.slice(0, 50).map(({ coach, vacancy, breakdown }) => {
                const key = `${coach.id}:${vacancy.id}`;
                const alreadyShared = sharedPairs.has(key);
                return (
                  <div key={key} className="rounded-lg border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {people[coach.person_id]?.full_name} <span className="text-gray-400">→</span>{" "}
                          {vacancy.club_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vacancy.role_being_recruited} · {vacancy.competition_level} · {vacancy.region}
                        </p>
                        {(coach.notes || vacancy.notes) && (
                          <div className="mt-1 space-y-0.5">
                            {coach.notes && (
                              <p className="text-xs italic text-gray-400">Coach notes: {coach.notes}</p>
                            )}
                            {vacancy.notes && (
                              <p className="text-xs italic text-gray-400">Club notes: {vacancy.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-accent" style={{ color: "var(--accent-dark)" }}>
                          {Math.round(breakdown.total * 100)}%
                        </p>
                        {alreadyShared ? (
                          <span className="text-xs text-green-600">✓ Shared</span>
                        ) : (
                          <button
                            onClick={() => shareMatch(coach.id, vacancy.id, breakdown.total)}
                            className="btn-accent mt-1 rounded-lg px-3 py-1 text-xs font-semibold"
                          >
                            Share this match
                          </button>
                        )}
                      </div>
                    </div>
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
            Rate how much each criterion counts toward the overall match
            score, from 1 (least important) to 10 (most important).
          </p>
          {(Object.keys(weights) as (keyof Club2CoachWeights)[]).map((key) => (
            <div key={key} className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{key.replace("_", " ")}</span>
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

export default function Club2CoachAdminPage() {
  return (
    <PinGate>
      <Club2CoachAdmin />
    </PinGate>
  );
}
