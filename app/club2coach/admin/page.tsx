"use client";

import { useEffect, useState } from "react";
import PinGate from "@/components/PinGate";
import { createClient } from "@/lib/supabase/client";
import { scoreClub2CoachMatch } from "@/lib/scoring";
import { CLUB2COACH_COACH_PACKAGES, CLUB2COACH_CLUB_PACKAGES } from "@/lib/constants";
import type {
  Club2CoachCoachListing,
  Club2CoachClubVacancy,
  Club2CoachWeights,
  Club2CoachShare,
  Person,
  AdminSettings,
  SupportQuery,
  CoachCreditRequest,
} from "@/types/database";

type Tab = "unpaid" | "matches" | "weighting" | "listings" | "admins" | "support" | "people";

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
  const [creditRequests, setCreditRequests] = useState<CoachCreditRequest[]>([]);
  const [creditAmount, setCreditAmount] = useState<Record<string, string>>({});

  const [supportFilter, setSupportFilter] = useState<"open" | "resolved" | "all">("open");
  const [listingsPaidFilter, setListingsPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [listingsDeletedFilter, setListingsDeletedFilter] = useState<"active" | "all">("active");
  const [matchesFilter, setMatchesFilter] = useState<"all" | "unshared" | "shared">("all");
  const [matchesClubFilter, setMatchesClubFilter] = useState<string>("all");
  const [vacancyPackage, setVacancyPackage] = useState<Record<string, number>>({});
  const [vacancyAmount, setVacancyAmount] = useState<Record<string, string>>({});
  const [coachPackage, setCoachPackage] = useState<Record<string, number>>({});
  const [coachAmount, setCoachAmount] = useState<Record<string, string>>({});
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [autoMatching, setAutoMatching] = useState(false);

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
    const [{ data: cl }, { data: cv }, { data: ppl }, { data: sh }, { data: st }, { data: sq }, { data: cr }] = await Promise.all([
      supabase.from("club2coach_coach_listings").select("*"),
      supabase.from("club2coach_club_vacancies").select("*"),
      supabase.from("people").select("*"),
      supabase.from("club2coach_shares").select("*"),
      supabase.from("admin_settings").select("*").eq("product", "club2coach").maybeSingle(),
      supabase.from("support_queries").select("*").order("created_at", { ascending: false }),
      supabase.from("coach_credit_requests").select("*").eq("status", "pending"),
    ]);

    setCoachListings((cl as Club2CoachCoachListing[]) ?? []);
    setVacancies((cv as Club2CoachClubVacancy[]) ?? []);
    const peopleMap: Record<string, Person> = {};
    ((ppl as Person[]) ?? []).forEach((p) => (peopleMap[p.id] = p));
    setPeople(peopleMap);
    setShares((sh as Club2CoachShare[]) ?? []);
    setSettings(st as AdminSettings | null);
    setCreditRequests((cr as CoachCreditRequest[]) ?? []);
    setSupportQueries((sq as SupportQuery[]) ?? []);
    setLoading(false);
  }

  async function loadAdminPins() {
    const { data } = await supabase.rpc("list_admin_pins");
    setAdminPins((data as AdminPinRow[]) ?? []);
  }

  useEffect(() => {
    if (tab === "admins") loadAdminPins();
    if (tab === "matches" && weights) runAutoMatchSweep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function markQueryResolved(id: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from("support_queries").update({ status: "resolved" }).eq("id", id);
    await loadSupportQueries();
  }

  async function confirmCreditSplit(req: CoachCreditRequest) {
    supabase.rpc("refresh_admin_session");
    setStatus(null);
    const amount = Number(creditAmount[req.id] ?? CLUB2COACH_COACH_PACKAGES[req.total_package]);
    const { error } = await supabase.rpc("confirm_coach_credit_split", {
      request_id: req.id,
      amount,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(
      `Combined package confirmed — ${req.club2coach_count} Club2Coach + ${req.coach2mentor_count} Coach2Mentor.`
    );
    await loadAll();
  }

  async function confirmTopup(id: string, requested: number) {
    supabase.rpc("refresh_admin_session");
    setStatus(null);
    const amount = Number(topupAmount[id] ?? CLUB2COACH_COACH_PACKAGES[requested]);
    const { error } = await supabase.rpc("confirm_club2coach_coach_topup", {
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

  async function markCoachPaid(id: string) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const introductions = coachPackage[id] ?? 1;
    const amount = Number(coachAmount[id] ?? CLUB2COACH_COACH_PACKAGES[introductions]);
    const { error } = await supabase.rpc("mark_club2coach_coach_paid", {
      target_listing_id: id,
      amount,
      introductions,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(`Marked as paid — ${introductions} club introduction${introductions === 1 ? "" : "s"} included.`);
    await loadAll();
  }

  async function markVacancyPaid(id: string) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const introductions = vacancyPackage[id] ?? 1;
    const amount = Number(vacancyAmount[id] ?? CLUB2COACH_CLUB_PACKAGES[introductions]);
    const { error } = await supabase.rpc("mark_club2coach_club_paid", {
      target_listing_id: id,
      amount,
      introductions,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadAll();
    await runAutoMatchSweep([id]);
  }

  async function giftVacancy(id: string) {
    if (!window.confirm("Gift this vacancy for free? This activates it and includes the selected number of introductions, but records $0 — not a real payment.")) {
      return;
    }
    supabase.rpc("refresh_admin_session");
    setStatus(null);
    const introductions = vacancyPackage[id] ?? 1;
    const { error } = await supabase.rpc("gift_club2coach_vacancy", {
      target_listing_id: id,
      introductions,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadAll();
    await runAutoMatchSweep([id]);
  }

  // Fills any vacancy's remaining paid slots with its current
  // top-scoring, not-yet-considered candidates. Idempotent — safe to
  // run repeatedly, since club2coach_shares has a unique constraint
  // on (coach, vacancy) so it can never double-suggest the same pair.
  // When auto_approve_matches is off (the default), new rows go in as
  // 'suggested' — invisible to both parties, no contact info shared —
  // and need an explicit Approve click. When it's on, they go straight
  // to 'approved', same as before.
  // vacancyIds: restrict the sweep to specific vacancies (e.g. right
  // after marking one paid); omit to sweep everything with open slots.
  async function runAutoMatchSweep(vacancyIds?: string[]) {
    if (!weights) return;
    setAutoMatching(true);

    const autoApprove = settings?.auto_approve_matches ?? false;

    const targets = activeVacancies.filter((v) => {
      if (vacancyIds && !vacancyIds.includes(v.id)) return false;
      if (v.included_introductions == null) return false;
      const usedSlots = shares.filter((s) => s.club_vacancy_id === v.id).length;
      return usedSlots < v.included_introductions;
    });

    let totalNew = 0;
    for (const vacancy of targets) {
      const usedSlots = shares.filter((s) => s.club_vacancy_id === vacancy.id).length;
      const remaining = (vacancy.included_introductions ?? 0) - usedSlots;
      if (remaining <= 0) continue;

      const candidates = activeCoaches
        .filter((c) => !sharedPairs.has(`${c.id}:${vacancy.id}`))
        .map((coach) => {
          const coachPerson = people[coach.person_id];
          const breakdown = scoreClub2CoachMatch(coach, coachPerson?.current_licence ?? null, vacancy, weights);
          return { coach, breakdown };
        })
        .sort((a, b) => b.breakdown.total - a.breakdown.total)
        .slice(0, remaining);

      for (const { coach, breakdown } of candidates) {
        const { error } = await supabase.from("club2coach_shares").insert({
          coach_listing_id: coach.id,
          club_vacancy_id: vacancy.id,
          score: breakdown.total,
          admin_notes: "Auto-matched (top score)",
          status: autoApprove ? "approved" : "suggested",
        });
        if (!error) {
          totalNew += 1;
          if (autoApprove && !vacancy.shared_at) {
            await supabase
              .from("club2coach_club_vacancies")
              .update({ shared_at: new Date().toISOString() })
              .eq("id", vacancy.id);
          }
        }
      }
    }

    setAutoMatching(false);
    if (totalNew > 0) {
      setStatus(
        autoApprove
          ? `Auto-matched and shared ${totalNew} new introduction${totalNew === 1 ? "" : "s"}.`
          : `Found ${totalNew} new suggested match${totalNew === 1 ? "" : "es"} — awaiting your approval.`
      );
    }
    await loadAll();
  }

  async function approveShare(shareId: string, vacancyId: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from("club2coach_shares").update({ status: "approved" }).eq("id", shareId);
    const vacancy = vacancies.find((v) => v.id === vacancyId);
    if (vacancy && !vacancy.shared_at) {
      await supabase
        .from("club2coach_club_vacancies")
        .update({ shared_at: new Date().toISOString() })
        .eq("id", vacancyId);
    }
    await loadAll();
  }

  async function rejectShare(shareId: string) {
    supabase.rpc("refresh_admin_session");
    await supabase.from("club2coach_shares").delete().eq("id", shareId);
    await loadAll();
  }

  async function toggleAutoApprove(value: boolean) {
    if (!settings) return;
    supabase.rpc("refresh_admin_session");
    setSettings({ ...settings, auto_approve_matches: value });
    await supabase.from("admin_settings").update({ auto_approve_matches: value }).eq("id", settings.id);
  }

  async function revokeShare(shareId: string) {
    if (!window.confirm("Undo this introduction? Both parties will lose access to each other's contact details.")) {
      return;
    }
    supabase.rpc("refresh_admin_session");
    await supabase.from("club2coach_shares").delete().eq("id", shareId);
    await loadAll();
  }

  async function shareMatch(coachListingId: string, vacancyId: string, score: number) {
    supabase.rpc("refresh_admin_session"); // keep the idle-timeout session alive
    setStatus(null);
    const { error } = await supabase.from("club2coach_shares").insert({
      coach_listing_id: coachListingId,
      club_vacancy_id: vacancyId,
      score,
      status: "approved", // a manual admin click is itself the review — goes live immediately
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
  const topupRequests = coachListings.filter((l) => l.topup_requested != null && !l.deleted_at);
  const unpaidVacancies = vacancies.filter((v) => !v.paid && !v.deleted_at);
  // Excludes coaches who've used up their own paid introduction quota
  // — once shared to as many clubs as they paid for, they stop being
  // a candidate anywhere until they top up, regardless of how well
  // they'd otherwise score against a vacancy.
  function coachIntroductionsUsed(coachListingId: string) {
    return shares.filter((s) => s.coach_listing_id === coachListingId).length;
  }
  const activeCoaches = coachListings.filter((l) => {
    if (!l.paid || l.status === "placed" || l.deleted_at) return false;
    if (l.included_introductions != null && coachIntroductionsUsed(l.id) >= l.included_introductions) {
      return false;
    }
    return true;
  });
  const activeVacancies = vacancies.filter(
    (v) => v.paid && v.status !== "filled" && v.status !== "expired" && !v.deleted_at
  );
  const sharedPairs = new Set(shares.map((s) => `${s.coach_listing_id}:${s.club_vacancy_id}`));

  const weights = settings?.weights as Club2CoachWeights | undefined;

  // Grouped by vacancy rather than a flat coach×vacancy list — this is
  // what actually lets you track "2 of 3 introductions shared" per
  // club without different clubs' candidates getting mixed together.
  const clubNamesForFilter = Array.from(new Set(activeVacancies.map((v) => v.club_name))).sort();

  const vacancyGroups = activeVacancies
    .filter((v) => matchesClubFilter === "all" || v.club_name === matchesClubFilter)
    .map((vacancy) => {
      const vacancyShares = shares.filter((s) => s.club_vacancy_id === vacancy.id);
      const approvedCount = vacancyShares.filter((s) => s.status === "approved").length;
      const suggestedCount = vacancyShares.filter((s) => s.status === "suggested").length;
      const usedSlots = approvedCount + suggestedCount; // a pending suggestion still reserves its slot
      const entitled = vacancy.included_introductions;
      const remaining = entitled != null ? Math.max(0, entitled - usedSlots) : null;
      const candidates = weights
        ? activeCoaches
            .map((coach) => {
              const coachPerson = people[coach.person_id];
              const breakdown = scoreClub2CoachMatch(coach, coachPerson?.current_licence ?? null, vacancy, weights);
              const shareRow = shares.find(
                (s) => s.coach_listing_id === coach.id && s.club_vacancy_id === vacancy.id
              );
              return { coach, breakdown, shareRow };
            })
            .sort((a, b) => b.breakdown.total - a.breakdown.total)
        : [];
      return { vacancy, approvedCount, suggestedCount, entitled, remaining, candidates };
    })
    .filter((g) => {
      if (matchesFilter === "all") return true;
      const full = g.entitled != null && g.remaining === 0;
      return matchesFilter === "shared" ? full : !full;
    })
    // Submission order — oldest vacancy first, so you work through them
    // in the order clubs actually paid, not by whichever has the
    // highest-scoring candidate today.
    .sort((a, b) => new Date(a.vacancy.created_at).getTime() - new Date(b.vacancy.created_at).getTime());

  const filteredSupportQueries = supportQueries.filter(
    (q) => supportFilter === "all" || q.status === supportFilter
  );

  const allPeople = Object.values(people).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const newSignupsCount = allPeople.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < 24 * 60 * 60 * 1000
  ).length;

  function passesListingsFilter(l: { paid: boolean; deleted_at: string | null }) {
    if (listingsDeletedFilter === "active" && l.deleted_at) return false;
    if (listingsPaidFilter === "paid" && !l.paid) return false;
    if (listingsPaidFilter === "unpaid" && l.paid) return false;
    return true;
  }

  const filteredCoachListingsForListingsTab = coachListings.filter(passesListingsFilter);
  const filteredVacanciesForListingsTab = vacancies.filter(passesListingsFilter);

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
      <div className="flex gap-2">
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

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="py-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {coachListings.length} coach listings · {vacancies.length} vacancies
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b">
        {(["unpaid", "matches", "weighting", "listings", "admins", "support", "people"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-accent text-accent" : "text-gray-500"
            }`}
            style={tab === t ? { borderColor: "var(--accent-dark)", color: "var(--accent-dark)" } : {}}
          >
            {t === "unpaid"
              ? `Unpaid (${unpaidCoaches.length + unpaidVacancies.length + topupRequests.length + creditRequests.length})`
              : t === "support"
              ? `Support (${supportQueries.filter((q) => q.status === "open").length})`
              : t === "people"
              ? `People${newSignupsCount > 0 ? ` (${newSignupsCount} new)` : ""}`
              : t}
          </button>
        ))}
      </div>

      {status && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}

      {tab === "unpaid" && (
        <div className="mt-6 flex flex-col gap-6">
          {creditRequests.length > 0 && (
            <div>
              <h2 className="font-semibold">Coaches requesting a combined Club2Coach + Coach2Mentor package</h2>
              <div className="mt-2 flex flex-col gap-2">
                {creditRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div>
                      <p className="text-sm font-medium">{people[req.person_id]?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-purple-700">
                        {req.total_package} total — {req.club2coach_count} Club2Coach,{" "}
                        {req.coach2mentor_count} Coach2Mentor
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`$${CLUB2COACH_COACH_PACKAGES[req.total_package]}`}
                        value={creditAmount[req.id] ?? ""}
                        onChange={(e) => setCreditAmount((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => confirmCreditSplit(req)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Confirm split
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topupRequests.length > 0 && (
            <div>
              <h2 className="font-semibold">Coaches requesting a top-up</h2>
              <div className="mt-2 flex flex-col gap-2">
                {topupRequests.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div>
                      <p className="text-sm font-medium">{people[l.person_id]?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-blue-700">
                        Wants {l.topup_requested} more introduction{l.topup_requested === 1 ? "" : "s"} — currently
                        has {l.included_introductions ?? 0}
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
                      {l.included_introductions != null && (
                        <p className="text-xs text-blue-600">
                          Requested: {l.included_introductions} introduction
                          {l.included_introductions === 1 ? "" : "s"}
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
                          setCoachAmount((prev) => ({ ...prev, [l.id]: String(CLUB2COACH_COACH_PACKAGES[Number(n)]) }));
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
                      <select
                        value={vacancyPackage[v.id] ?? 1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setVacancyPackage((prev) => ({ ...prev, [v.id]: n }));
                          setVacancyAmount((prev) => ({ ...prev, [v.id]: String(CLUB2COACH_CLUB_PACKAGES[n]) }));
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {Object.keys(CLUB2COACH_CLUB_PACKAGES).map((n) => (
                          <option key={n} value={n}>
                            {n} intro{n === "1" ? "" : "s"}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder={`$${CLUB2COACH_CLUB_PACKAGES[vacancyPackage[v.id] ?? 1]}`}
                        value={vacancyAmount[v.id] ?? ""}
                        onChange={(e) => setVacancyAmount((prev) => ({ ...prev, [v.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => markVacancyPaid(v.id)}
                        className="btn-accent rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Mark paid
                      </button>
                      <button
                        onClick={() => giftVacancy(v.id)}
                        className="rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                      >
                        Gift free
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
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <FilterPills
              value={matchesFilter}
              onChange={setMatchesFilter}
              options={[
                { value: "all", label: "All vacancies" },
                { value: "unshared", label: "Needs sharing" },
                { value: "shared", label: "Fully shared" },
              ]}
            />
            <select
              value={matchesClubFilter}
              onChange={(e) => setMatchesClubFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="all">All clubs</option>
              {clubNamesForFilter.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
            Fully automate matching — skip review and share top matches immediately
          </label>

          {vacancyGroups.length === 0 ? (
            <p className="text-sm text-gray-500">
              {activeVacancies.length === 0
                ? "No active, paid vacancies yet — nothing to match."
                : "No vacancies match this filter."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {vacancyGroups.map(({ vacancy, approvedCount, suggestedCount, entitled, remaining, candidates }) => (
                <div key={vacancy.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {vacancy.club_name} — {vacancy.role_being_recruited}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vacancy.competition_level} · {vacancy.region} · Advertised{" "}
                        {new Date(vacancy.created_at).toLocaleDateString("en-GB")}
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
                          ? `${approvedCount} of ${entitled} approved`
                          : `${approvedCount} shared (no package set)`}
                      </span>
                    </div>
                  </div>
                  {vacancy.notes && (
                    <p className="mt-1 text-xs italic text-gray-400">Club notes: {vacancy.notes}</p>
                  )}

                  {entitled != null && remaining === 0 && suggestedCount === 0 && (
                    <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
                      ✓ All paid introductions for this vacancy have been approved and shared.
                    </p>
                  )}

                  <div className="mt-3 flex flex-col gap-1.5">
                    {/* Pending suggestions — invisible to the coach and club until you approve them */}
                    {candidates
                      .filter((c) => c.shareRow?.status === "suggested")
                      .map(({ coach, breakdown, shareRow }) => (
                        <div
                          key={coach.id}
                          className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm">{people[coach.person_id]?.full_name}</p>
                            {coach.notes && (
                              <p className="text-xs italic text-gray-400">Coach notes: {coach.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Suggested
                            </span>
                            <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                              {Math.round(breakdown.total * 100)}%
                            </span>
                            <button
                              onClick={() => shareRow && approveShare(shareRow.id, vacancy.id)}
                              className="btn-accent rounded-lg px-3 py-1 text-xs font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => shareRow && rejectShare(shareRow.id)}
                              className="text-xs font-semibold text-red-500 hover:underline"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* Approved — contact details are actually visible to both parties */}
                    {candidates
                      .filter((c) => c.shareRow?.status === "approved")
                      .map(({ coach, breakdown, shareRow }) => (
                        <div
                          key={coach.id}
                          className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50/50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm">{people[coach.person_id]?.full_name}</p>
                            {coach.notes && (
                              <p className="text-xs italic text-gray-400">Coach notes: {coach.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {shareRow?.admin_notes === "Auto-matched (top score)" && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Auto
                              </span>
                            )}
                            <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                              {Math.round(breakdown.total * 100)}%
                            </span>
                            <span className="text-xs text-green-600">✓ Shared</span>
                            <button
                              onClick={() => shareRow && revokeShare(shareRow.id)}
                              className="text-xs font-semibold text-red-500 hover:underline"
                            >
                              Undo
                            </button>
                          </div>
                        </div>
                      ))}

                    {/* Other available candidates — only while slots remain */}
                    {(entitled == null || remaining! > 0) &&
                      candidates
                        .filter((c) => !c.shareRow)
                        .slice(0, 10)
                        .map(({ coach, breakdown }) => (
                          <div
                            key={coach.id}
                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm">{people[coach.person_id]?.full_name}</p>
                              {coach.notes && (
                                <p className="text-xs italic text-gray-400">Coach notes: {coach.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                                {Math.round(breakdown.total * 100)}%
                              </span>
                              <button
                                onClick={() => shareMatch(coach.id, vacancy.id, breakdown.total)}
                                className="btn-accent rounded-lg px-3 py-1 text-xs font-semibold"
                              >
                                Share this match
                              </button>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              ))}
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
              Coach listings ({filteredCoachListingsForListingsTab.length} of {coachListings.length})
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {filteredCoachListingsForListingsTab.map((l) => (
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
            <h2 className="font-semibold">
              Vacancies ({filteredVacanciesForListingsTab.length} of {vacancies.length})
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {filteredVacanciesForListingsTab.map((v) => (
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
                      {people[v.person_id]?.full_name ?? "Unknown"} ·{" "}
                      {v.is_charity ? "Gifted" : v.paid ? "Paid" : "Unpaid"} · {v.status}
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
          <FilterPills
            value={supportFilter}
            onChange={setSupportFilter}
            options={[
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
              { value: "all", label: "All" },
            ]}
          />
          {filteredSupportQueries.length === 0 ? (
            <p className="text-sm text-gray-500">
              {supportQueries.length === 0
                ? "No queries or complaints have been submitted."
                : "Nothing matches this filter."}
            </p>
          ) : (
            filteredSupportQueries.map((q) => (
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

      {tab === "people" && (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            {allPeople.length} total · {newSignupsCount} signed up in the last 24 hours
          </p>
          {allPeople.map((p) => {
            const isNew = Date.now() - new Date(p.created_at).getTime() < 24 * 60 * 60 * 1000;
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                <div>
                  <p className="text-sm font-medium">
                    {p.full_name}
                    {isNew && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        New
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.email} · {p.mobile} · {p.region ?? "No region set"}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Joined {new Date(p.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
            );
          })}
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
