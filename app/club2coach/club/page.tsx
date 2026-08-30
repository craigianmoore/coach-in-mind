"use client";

import { useEffect, useState } from "react";
import RequireProfile from "@/components/RequireProfile";
import CheckboxGroup from "@/components/CheckboxGroup";
import { createClient } from "@/lib/supabase/client";
import {
  COACHING_ROLES,
  ABILITY_LEVELS,
  COMPETITION_LEVELS,
  AGE_GROUPS,
  REGIONS,
  REGIONS_BY_STATE,
  GENDER_OPTIONS,
  ACCREDITATION_LEVELS,
  CLUB2COACH_CLUB_PACKAGES,
  STATE_LABELS,
  MEMBER_FEDERATIONS,
} from "@/lib/constants";
import type { Club, Club2CoachClubVacancy, Club2CoachShare, Person } from "@/types/database";
import { notifyAdmin } from "@/lib/notify";

const PRIORITY_HINTS = [
  "Accreditation",
  "Competition level",
  "Geography",
  "Ability level",
  "Age group",
  "Salary fit",
  "Gender fit",
] as const;

type FormState = {
  clubName: string;
  roleBeingRecruited: string;
  competitionLevel: string;
  ageGroup: string;
  teamGender: string;
  preferredCoachGender: string;
  region: string;
  requiredAccreditation: string;
  requiredAbilityLevel: string;
  salaryMin: string;
  salaryMax: string;
  salaryNegotiable: boolean;
  overview: string;
  priorityHints: string[];
  notes: string;
  authoriseShare: boolean;
};

function emptyForm(): FormState {
  return {
    clubName: "",
    roleBeingRecruited: COACHING_ROLES[0],
    competitionLevel: COMPETITION_LEVELS[0],
    ageGroup: AGE_GROUPS[0],
    teamGender: "",
    preferredCoachGender: "",
    region: REGIONS[0],
    requiredAccreditation: ACCREDITATION_LEVELS[0],
    requiredAbilityLevel: "",
    salaryMin: "",
    salaryMax: "",
    salaryNegotiable: false,
    overview: "",
    priorityHints: [],
    notes: "",
    authoriseShare: false,
  };
}

function formFromVacancy(v: Club2CoachClubVacancy): FormState {
  return {
    clubName: v.club_name,
    roleBeingRecruited: v.role_being_recruited,
    competitionLevel: v.competition_level,
    ageGroup: v.age_group,
    teamGender: v.team_gender ?? "",
    preferredCoachGender: v.preferred_coach_gender ?? "",
    region: v.region,
    requiredAccreditation: v.required_accreditation,
    requiredAbilityLevel: v.required_ability_level ?? "",
    salaryMin: v.salary_min?.toString() ?? "",
    salaryMax: v.salary_max?.toString() ?? "",
    salaryNegotiable: v.salary_negotiable,
    overview: v.overview ?? "",
    priorityHints: v.priority_hints ?? [],
    notes: v.notes ?? "",
    authoriseShare: v.authorise_share,
  };
}

// A calendar month from a given date — not just "30 days" — matching
// how a person reads "one month from now" (e.g. 15 Jan -> 15 Feb).
function addOneCalendarMonth(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  return d;
}

function isPastContactWindow(v: Club2CoachClubVacancy): boolean {
  if (!v.shared_at) return false;
  return new Date() > addOneCalendarMonth(v.shared_at);
}

function daysLeftInContactWindow(v: Club2CoachClubVacancy): number | null {
  if (!v.shared_at) return null;
  const expiry = addOneCalendarMonth(v.shared_at);
  const ms = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(v: Club2CoachClubVacancy) {
  if (v.status === "filled") {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Filled</span>;
  }
  if (v.status === "expired") {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Expired</span>;
  }
  if (!v.paid) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Payment required
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
  );
}

function Club2CoachClubForm({ person }: { person: Person }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vacancies, setVacancies] = useState<Club2CoachClubVacancy[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberFederation, setMemberFederation] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null while showForm=false; "new" or a vacancy id while true
  const [form, setForm] = useState<FormState>(emptyForm());
  const [openCountMessage, setOpenCountMessage] = useState<string | null>(null);
  const [activity, setActivity] = useState<Club2CoachShare[] | null>(null);

  useEffect(() => {
    load();
    loadClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadClubs() {
    const { data } = await supabase.from("clubs").select("*").order("name", { ascending: true });
    setClubs((data as Club[]) ?? []);
  }

  async function load() {
    const { data } = await supabase
      .from("club2coach_club_vacancies")
      .select("*")
      .eq("person_id", person.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const list = (data as Club2CoachClubVacancy[]) ?? [];

    // Lazy auto-expiry: if a vacancy's one-month contact window has
    // passed and nobody marked it filled, flip it to 'expired' now.
    // Runs on every load rather than a scheduled job — self-corrects
    // the moment anyone views the list.
    const toExpire = list.filter(
      (v) => v.status !== "filled" && v.status !== "expired" && isPastContactWindow(v)
    );
    if (toExpire.length > 0) {
      await supabase
        .from("club2coach_club_vacancies")
        .update({ status: "expired" })
        .in("id", toExpire.map((v) => v.id));
      toExpire.forEach((v) => (v.status = "expired"));
    }

    setVacancies(list);
    setLoading(false);
  }

  function openNewForm() {
    setForm(emptyForm());
    setEditingId("new");
    setShowForm(true);
    setOpenCountMessage(null);
    setError(null);
    setActivity(null);
    setMemberFederation("");
  }

  async function openEditForm(v: Club2CoachClubVacancy) {
    setForm(formFromVacancy(v));
    setEditingId(v.id);
    setShowForm(true);
    setOpenCountMessage(null);
    setError(null);
    setActivity(null);
    setMemberFederation(v.state ?? "");

    const { data } = await supabase
      .from("club2coach_shares")
      .select("*")
      .eq("club_vacancy_id", v.id)
      .order("shared_at", { ascending: true });
    setActivity((data as Club2CoachShare[]) ?? []);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setActivity(null);
    setMemberFederation("");
  }

  function toggleHint(value: string) {
    setForm((prev) => ({
      ...prev,
      priorityHints: prev.priorityHints.includes(value)
        ? prev.priorityHints.filter((v) => v !== value)
        : [...prev.priorityHints, value],
    }));
  }

  async function markFilled(v: Club2CoachClubVacancy) {
    await supabase
      .from("club2coach_club_vacancies")
      .update({ status: "filled", filled_at: new Date().toISOString() })
      .eq("id", v.id);
    await load();
    if (editingId === v.id) closeForm();
  }

  async function deleteVacancy(v: Club2CoachClubVacancy) {
    if (!window.confirm(`Delete the ${v.role_being_recruited} vacancy at ${v.club_name}? This removes it from your list.`)) {
      return;
    }
    await supabase
      .from("club2coach_club_vacancies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", v.id);
    await load();
    if (editingId === v.id) closeForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!memberFederation) {
      setError("Please select your Member Federation first.");
      return;
    }
    const matchedClub = clubs.find(
      (c) =>
        c.state === memberFederation &&
        c.name.trim().toLowerCase() === form.clubName.trim().toLowerCase()
    );
    if (!matchedClub) {
      setError(
        "Please select a club from the suggestions list — start typing and choose a match. If your club doesn't appear, double-check you've selected the right Member Federation above."
      );
      return;
    }

    setSaving(true);

    const payload = {
      person_id: person.id,
      club_id: matchedClub.id,
      club_name: matchedClub.name, // canonical spelling/casing from the master list
      state: matchedClub.state,
      role_being_recruited: form.roleBeingRecruited,
      competition_level: form.competitionLevel,
      age_group: form.ageGroup,
      team_gender: form.teamGender || null,
      preferred_coach_gender: form.preferredCoachGender || null,
      region: form.region,
      required_accreditation: form.requiredAccreditation,
      required_ability_level: form.requiredAbilityLevel || null,
      salary_min: form.salaryMin ? Number(form.salaryMin) : null,
      salary_max: form.salaryMax ? Number(form.salaryMax) : null,
      salary_negotiable: form.salaryNegotiable,
      overview: form.overview,
      priority_hints: form.priorityHints,
      notes: form.notes,
      authorise_share: form.authoriseShare,
    };

    const isNew = editingId === "new";

    const { error: saveError } = isNew
      ? await supabase.from("club2coach_club_vacancies").insert(payload)
      : await supabase.from("club2coach_club_vacancies").update(payload).eq("id", editingId as string);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
    closeForm();

    if (isNew) {
      notifyAdmin(
        "new vacancy advertised",
        `${matchedClub.name} — ${form.roleBeingRecruited}\nAdvertised by: ${person.full_name} (${person.email}, ${person.mobile})\nCompetition: ${form.competitionLevel} · ${form.ageGroup} · ${form.region}`
      );

      // Club-scoped, not person-scoped: this counts every open vacancy
      // at this club regardless of who advertised it, via a function
      // that returns a number only — never the underlying rows, so no
      // other club contact's activity or details are ever exposed.
      const { data: n } = await supabase.rpc("get_c2c_open_vacancy_count", {
        target_club_id: matchedClub.id,
      });
      const count = n ?? 0;
      setOpenCountMessage(
        `${matchedClub.name} currently has ${count} open vacanc${count === 1 ? "y" : "ies"} advertised.`
      );
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  // Reacts to whatever's currently typed in the club field — before a
  // valid club is picked (or submitted), show every region across all
  // states so the field stays usable while typing.
  // Only clubs within the chosen Member Federation — closes the "two
  // clubs with the same name in different states" collision risk, and
  // keeps the suggestions list relevant instead of nationwide.
  const clubsInFederation = memberFederation ? clubs.filter((c) => c.state === memberFederation) : [];

  const typedClub = clubsInFederation.find(
    (c) => c.name.trim().toLowerCase() === form.clubName.trim().toLowerCase()
  );
  const regionOptions = typedClub ? REGIONS_BY_STATE[typedClub.state] ?? REGIONS : REGIONS;


  if (!showForm) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Your Coaching Vacancies</h1>
          <button
            type="button"
            onClick={openNewForm}
            className="btn-accent rounded-lg px-5 py-2 font-semibold"
          >
            Advertise a Vacancy
          </button>
        </div>

        {openCountMessage && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {openCountMessage}
          </div>
        )}

        {vacancies.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            No vacancies advertised yet. Click "Advertise a Vacancy" to add your first one.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {vacancies.map((v) => {
              const daysLeft = daysLeftInContactWindow(v);
              const canMarkFilled = v.status !== "filled" && v.status !== "expired";
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <button type="button" onClick={() => openEditForm(v)} className="flex-1 text-left">
                    <p className="font-semibold">
                      {v.club_name}
                      {v.state && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          {STATE_LABELS[v.state]}
                        </span>
                      )}{" "}
                      — {v.role_being_recruited}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {v.competition_level} · {v.age_group} · {v.region}
                    </p>
                    {v.status === "active" && v.paid && daysLeft !== null && (
                      <p className="mt-0.5 text-xs text-blue-700">
                        {daysLeft > 0
                          ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in the contact window`
                          : "Contact window closing"}
                      </p>
                    )}
                  </button>
                  <div className="flex items-center gap-3">
                    {statusBadge(v)}
                    {canMarkFilled && (
                      <button
                        type="button"
                        onClick={() => markFilled(v)}
                        className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Mark as filled
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteVacancy(v)}
                      className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const existing = editingId !== "new" ? vacancies.find((v) => v.id === editingId) ?? null : null;

  return (
    <div className="py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {existing ? "Edit Coaching Vacancy" : "Advertise a Coaching Vacancy"}
        </h1>
        <button type="button" onClick={closeForm} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          ← Back to your vacancies
        </button>
      </div>

      {existing && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            existing.status === "filled" || existing.status === "expired"
              ? "border-gray-200 bg-gray-50 text-gray-700"
              : existing.paid
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {existing.status === "filled" ? (
            <>This vacancy is marked as filled.</>
          ) : existing.status === "expired" ? (
            <>
              This vacancy's one-month contact window has closed. Most
              clubs will have made contact by now — if the role's still
              open, advertise it again.
            </>
          ) : existing.paid ? (
            <>✓ Your vacancy is active and included in matching.</>
          ) : (
            <>
              <strong>Payment required (from ${CLUB2COACH_CLUB_PACKAGES[1]} AUD):</strong> your
              vacancy is saved but won't be included in matching until
              payment is confirmed. Coach In Mind will be in touch about
              how to pay — once confirmed, this activates automatically.
            </>
          )}
        </div>
      )}

      {existing && !existing.paid && existing.status !== "filled" && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Year 1 Introductory Pricing
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(CLUB2COACH_CLUB_PACKAGES).map(([count, price]) => (
              <div key={count} className="rounded-lg border border-gray-200 p-3 text-center">
                <p className="font-semibold">
                  {count} intro{count === "1" ? "" : "s"}
                </p>
                <p className="text-sm text-gray-500">${price} AUD</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Coach In Mind will confirm which package suits your vacancy when we're in touch about
            payment.
          </p>
        </div>
      )}

      {existing && (
        <div className="mt-4 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Activity history</h2>
            <div className="flex items-center gap-2">
              {existing.status !== "filled" && existing.status !== "expired" && (
                <button
                  type="button"
                  onClick={() => markFilled(existing)}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Mark as filled
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteVacancy(existing)}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-gray-600">
            <li>Advertised: {formatDate(existing.created_at)}</li>
            <li>Payment confirmed: {existing.paid ? formatDate(existing.paid_at) : "Not yet paid"}</li>
            {existing.shared_at ? (
              <>
                <li>Contact window opened: {formatDate(existing.shared_at)}</li>
                <li>
                  Contact window closes: {formatDate(addOneCalendarMonth(existing.shared_at).toISOString())}
                </li>
              </>
            ) : (
              <li>Contact window: not started yet — no coaches introduced so far</li>
            )}
            <li>
              Coaches introduced: {activity === null ? "Loading…" : activity.length}
              {activity && activity.length > 0 && (
                <ul className="ml-4 mt-1 list-disc text-xs text-gray-500">
                  {activity.map((a) => (
                    <li key={a.id}>Introduced on {formatDate(a.shared_at)}</li>
                  ))}
                </ul>
              )}
            </li>
            {existing.filled_at && <li>Marked filled: {formatDate(existing.filled_at)}</li>}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-xl border bg-white p-6">
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Member Federation *</label>
          <select
            required
            value={memberFederation}
            onChange={(e) => {
              setMemberFederation(e.target.value);
              // Previously-typed club name may belong to a different
              // federation — clear it so nothing mismatched sticks
              // around silently.
              setForm((f) => ({ ...f, clubName: "" }));
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select your Member Federation…</option>
            {Object.entries(MEMBER_FEDERATIONS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            This narrows the club list below to just your federation's clubs.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Club name *</label>
          <input
            required
            disabled={!memberFederation}
            list="club-options"
            autoComplete="off"
            value={form.clubName}
            onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))}
            placeholder={memberFederation ? "Start typing your club name…" : "Select your Member Federation first"}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
          />
          <datalist id="club-options">
            {clubsInFederation.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-gray-500">
            Pick your club from the suggestions as you type. Can't find
            it? Let Coach In Mind know and we'll add it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Role being recruited</label>
            <select
              value={form.roleBeingRecruited}
              onChange={(e) => setForm((f) => ({ ...f, roleBeingRecruited: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {COACHING_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Competition level</label>
            <select
              value={form.competitionLevel}
              onChange={(e) => setForm((f) => ({ ...f, competitionLevel: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {COMPETITION_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Age group</label>
            <select
              value={form.ageGroup}
              onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Region</label>
            <select
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Team gender *</label>
            <select
              required
              value={form.teamGender}
              onChange={(e) => setForm((f) => ({ ...f, teamGender: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Preferred coach gender *</label>
            <select
              required
              value={form.preferredCoachGender}
              onChange={(e) => setForm((f) => ({ ...f, preferredCoachGender: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="-mt-3 text-xs text-gray-500">
          If coach gender isn't important for this role, choose "No
          preference" — that keeps it from affecting the match score.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Required accreditation</label>
            <select
              value={form.requiredAccreditation}
              onChange={(e) => setForm((f) => ({ ...f, requiredAccreditation: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {ACCREDITATION_LEVELS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Required ability level</label>
            <select
              value={form.requiredAbilityLevel}
              onChange={(e) => setForm((f) => ({ ...f, requiredAbilityLevel: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select…</option>
              {ABILITY_LEVELS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Salary offer min (AUD)</label>
            <input
              type="number"
              value={form.salaryMin}
              onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Salary offer max (AUD)</label>
            <input
              type="number"
              value={form.salaryMax}
              onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.salaryNegotiable}
            onChange={(e) => setForm((f) => ({ ...f, salaryNegotiable: e.target.checked }))}
          />
          Salary negotiable
        </label>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Short overview — sell your club to coaches
          </label>
          <textarea
            maxLength={300}
            value={form.overview}
            onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            What matters most for this role? (optional)
          </label>
          <div className="mt-1">
            <CheckboxGroup options={PRIORITY_HINTS} selected={form.priorityHints} onToggle={toggleHint} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ticking a box here doesn't change the match score by itself —
            it flags that factor to Coach In Mind's admin as especially
            important for <em>this specific vacancy</em>. When reviewing
            candidates for this role, the admin can choose to weight that
            factor more heavily than the standard formula would — a
            manual decision they make on your behalf, not an automatic
            one.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Notes for Coach In Mind admin (private — not shown publicly)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={form.authoriseShare}
            onChange={(e) => setForm((f) => ({ ...f, authoriseShare: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            I authorise Coach In Mind to share this vacancy's details
            above with a matched coach once a suitable match is
            confirmed. *
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-accent self-start rounded-lg px-6 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Add vacancy"}
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="self-start rounded-lg px-6 py-2 font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Club2CoachClubPage() {
  return <RequireProfile>{(person) => <Club2CoachClubForm person={person} />}</RequireProfile>;
}
