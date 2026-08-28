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
  SupportQuery,
} from "@/types/database";

type Tab = "unpaid" | "matches" | "weighting" | "listings" | "admins" | "support";

interface AdminPinRow {
  id: string;
  label: string | null;
  created_at: string;
}

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

  const [adminPins, setAdminPins] = useState<AdminPinRow[]>([]);
  const [newPin, setNewPin] = useState("");
  const [newPinLabel, setNewPinLabel] = useState("");
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");

  const [supportQueries, setSupportQueries] = useState<SupportQuery[]>([]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSupportQueries() {
    const { data } = await supabase
      .from("support_queries")
      .select("*")
      .order("created_at", { ascending: false });
    setSupportQueries((data as SupportQuery[]) ?? []);
  }

  async function loadAll() {
    setLoading(true);
    // support_queries is loaded here too — not just lazily on tab
    // click — so the "Support (N)" badge count is correct the moment
    // the page loads, not just after you've already opened that tab.
    const [{ data: cl }, { data: cv }, { data: ppl }, { data: sh }, { data: st }, { data: sq }] = await Promise.all([
      supabase.from("club2coach_coach_listings").select("*"),
      supabase.from("club2coach_club_vacancies").select("*"),
      supabase.from("people").select("*"),
      supabase.from("club2coach_shares").select("*"),
      supabase.from("admin_settings").select("*").eq("product", "club2coach").maybeSingle(),
      supabase.from("support_queries").select("*").order("created_at", { ascending: false }),
    ]);

    setCoachListings((cl as Club2CoachCoachListing[]) ?? []);
    setVacancies((cv as Club2CoachClubVacancy[]) ?? []);
    const peopleMap: Record<string, Person> = {};
    ((ppl as Person[]) ?? []).forEach((p) => (peopleMap[p.id] = p));
    setPeople(peopleMap);
    setShares((sh as Club2CoachShare[]) ?? []);
    setSettings(st as AdminSettings | null);
    setSupportQueries((sq as SupportQuery[]) ?? []);
    setLoading(false);
  }

  async function loadAdminPins() {
    const { data } = await supabase.rpc("list_admin_pins");
    setAdminPins((data as AdminPinRow[]) ?? []);
  }

  useEffect(() => {
    if (tab === "admins") loadAdminPins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function markQueryResolved(id: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from("support_queries").update({ status: "resolved" }).eq("id", id);
    await loadSupportQueries();
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
    if (error) {
      setStatus(error.message);
      return;
    }

    // Start the club's 1-month contact-window clock on the FIRST
    // introduction only — later introductions for the same vacancy
    // don't reset it.
    const vacancy = vacancies.find((v) => v.id === vacancyId);
    if (vacancy && !vacancy.shared_at) {
      await supabase
        .from("club2coach_club_vacancies")
        .update({ shared_at: new Date().toISOString() })
        .eq("id", vacancyId);
    }

    setStatus("Details shared — both parties can now see each other's contact info.");
    await loadAll();
  }

  async function updateWeight(key: keyof Club2CoachWeights, value: number) {
    if (!settings) return;
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    const newWeights = { ...(settings.weights as Club2CoachWeights), [key]: value };
    setSettings({ ...settings, weights: newWeights });
    await supabase.from("admin_settings").update({ weights: newWeights }).eq("id", settings.id);
  }

  async function deleteListing(table: "club2coach_coach_listings" | "club2coach_club_vacancies", id: string) {
    if (!window.confirm("Delete this listing? It will be hidden from the owner and from matching — this can be undone from this tab.")) {
      return;
    }
    supabase.rpc("refresh_admin_session");
    await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await loadAll();
  }

  async function restoreListing(table: "club2coach_coach_listings" | "club2coach_club_vacancies", id: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from(table).update({ deleted_at: null }).eq("id", id);
    await loadAll();
  }

  async function addAdminPin(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    supabase.rpc("refresh_admin_session");
    const { error } = await supabase.rpc("add_admin_pin", {
      new_pin: newPin,
      new_label: newPinLabel || null,
    });
    if (error) setStatus(error.message);
    else {
      setStatus("New admin PIN added.");
      setNewPin("");
      setNewPinLabel("");
      await loadAdminPins();
    }
  }

  async function revokeAdminPin(id: string, label: string | null) {
    if (!window.confirm(`Revoke ${label || "this"} admin PIN? They'll lose admin access immediately.`)) {
      return;
    }
    setStatus(null);
    supabase.rpc("refresh_admin_session");
    const { error } = await supabase.rpc("revoke_admin_pin", { target_id: id });
    if (error) setStatus(error.message);
    else {
      setStatus("PIN revoked.");
      await loadAdminPins();
    }
  }

  function startEditingLabel(p: AdminPinRow) {
    setEditingPinId(p.id);
    setEditingLabelValue(p.label || "");
  }

  async function saveLabel(id: string) {
    setStatus(null);
    supabase.rpc("refresh_admin_session");
    const { error } = await supabase.rpc("update_admin_pin_label", {
      target_id: id,
      new_label: editingLabelValue || null,
    });
    if (error) setStatus(error.message);
    else {
      setEditingPinId(null);
      await loadAdminPins();
    }
  }

  const unpaidCoaches = coachListings.filter((l) => !l.paid && !l.deleted_at);
  const unpaidVacancies = vacancies.filter((v) => !v.paid && !v.deleted_at);
  const activeCoaches = coachListings.filter((l) => l.paid && l.status !== "placed" && !l.deleted_at);
  const activeVacancies = vacancies.filter(
    (v) => v.paid && v.status !== "filled" && v.status !== "expired" && !v.deleted_at
  );
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

      <div className="mt-4 flex flex-wrap gap-2 border-b">
        {(["unpaid", "matches", "weighting", "listings", "admins", "support"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-accent text-accent" : "text-gray-500"
            }`}
            style={tab === t ? { borderColor: "var(--accent-dark)", color: "var(--accent-dark)" } : {}}
          >
            {t === "unpaid"
              ? `Unpaid (${unpaidCoaches.length + unpaidVacancies.length})`
              : t === "support"
              ? `Support (${supportQueries.filter((q) => q.status === "open").length})`
              : t}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markCoachPaid(l.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid (${ROLE_PRICES_AUD.club2coach_coach})
                      </button>
                      <button
                        onClick={() => deleteListing("club2coach_coach_listings", l.id)}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markVacancyPaid(v.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid (${ROLE_PRICES_AUD.club2coach_club})
                      </button>
                      <button
                        onClick={() => deleteListing("club2coach_club_vacancies", v.id)}
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

      {tab === "listings" && (
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <h2 className="font-semibold">All coach listings ({coachListings.length})</h2>
            <div className="mt-2 flex flex-col gap-2">
              {coachListings.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center justify-between rounded-lg border bg-white p-3 ${l.deleted_at ? "opacity-50" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {people[l.person_id]?.full_name ?? "Unknown"}
                      {l.deleted_at && <span className="ml-2 text-xs font-normal text-red-500">(deleted)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {l.role_sought} · {l.paid ? "Paid" : "Unpaid"} · {l.status}
                    </p>
                  </div>
                  {l.deleted_at ? (
                    <button
                      onClick={() => restoreListing("club2coach_coach_listings", l.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteListing("club2coach_coach_listings", l.id)}
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
            <h2 className="font-semibold">All vacancies ({vacancies.length})</h2>
            <div className="mt-2 flex flex-col gap-2">
              {vacancies.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between rounded-lg border bg-white p-3 ${v.deleted_at ? "opacity-50" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {v.club_name} — {v.role_being_recruited}
                      {v.deleted_at && <span className="ml-2 text-xs font-normal text-red-500">(deleted)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {people[v.person_id]?.full_name ?? "Unknown"} · {v.paid ? "Paid" : "Unpaid"} · {v.status}
                    </p>
                  </div>
                  {v.deleted_at ? (
                    <button
                      onClick={() => restoreListing("club2coach_club_vacancies", v.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteListing("club2coach_club_vacancies", v.id)}
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

      {tab === "admins" && (
        <div className="mt-6 max-w-xl">
          <p className="text-sm text-gray-600">
            Anyone with a valid PIN below gets a 2-hour admin session —
            this applies across both Club 2 Coach and Coach 2 Mentor, not
            just this page.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {adminPins.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                {editingPinId === p.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={editingLabelValue}
                      onChange={(e) => setEditingLabelValue(e.target.value)}
                      placeholder="e.g. Sarah"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => saveLabel(p.id)}
                      className="btn-accent rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingPinId(null)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium">{p.label || "Unlabelled PIN"}</p>
                      <p className="text-xs text-gray-500">
                        Added {new Date(p.created_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditingLabel(p)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => revokeAdminPin(p.id, p.label)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={addAdminPin} className="mt-6 flex flex-col gap-3 rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold">Add a new admin PIN</h3>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Label (who is this for?)</label>
              <input
                value={newPinLabel}
                onChange={(e) => setNewPinLabel(e.target.value)}
                placeholder="e.g. Sarah"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">6-digit PIN</label>
              <input
                required
                pattern="[0-9]{6}"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="btn-accent self-start rounded-lg px-5 py-2 text-sm font-semibold"
            >
              Add admin PIN
            </button>
          </form>
        </div>
      )}
      {tab === "support" && (
        <div className="mt-6 flex flex-col gap-3">
          {supportQueries.length === 0 ? (
            <p className="text-sm text-gray-500">No queries or complaints have been submitted.</p>
          ) : (
            supportQueries.map((q) => (
              <div
                key={q.id}
                className={`rounded-lg border bg-white p-4 ${q.status === "resolved" ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {q.name} <span className="font-normal text-gray-500">&lt;{q.email}&gt;</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(q.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      q.status === "resolved" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {q.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{q.message}</p>
                {q.status !== "resolved" && (
                  <button
                    onClick={() => markQueryResolved(q.id)}
                    className="mt-3 rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            ))
          )}
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
