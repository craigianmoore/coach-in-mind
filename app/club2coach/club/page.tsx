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
  GENDER_OPTIONS,
  ACCREDITATION_LEVELS,
  ROLE_PRICES_AUD,
} from "@/lib/constants";
import type { Club2CoachClubVacancy, Person } from "@/types/database";

const PRIORITY_HINTS = [
  "Accreditation",
  "Competition level",
  "Geography",
  "Ability level",
  "Age group",
  "Salary fit",
  "Gender fit",
] as const;

function Club2CoachClubForm({ person }: { person: Person }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Club2CoachClubVacancy | null>(null);

  const [clubName, setClubName] = useState("");
  const [roleBeingRecruited, setRoleBeingRecruited] = useState<string>(COACHING_ROLES[0]);
  const [competitionLevel, setCompetitionLevel] = useState<string>(COMPETITION_LEVELS[0]);
  const [ageGroup, setAgeGroup] = useState<string>(AGE_GROUPS[0]);
  const [teamGender, setTeamGender] = useState("");
  const [preferredCoachGender, setPreferredCoachGender] = useState("");
  const [region, setRegion] = useState<string>(REGIONS[0]);
  const [requiredAccreditation, setRequiredAccreditation] = useState<string>(ACCREDITATION_LEVELS[0]);
  const [requiredAbilityLevel, setRequiredAbilityLevel] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [overview, setOverview] = useState("");
  const [priorityHints, setPriorityHints] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [authoriseShare, setAuthoriseShare] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data } = await supabase
      .from("club2coach_club_vacancies")
      .select("*")
      .eq("person_id", person.id)
      .maybeSingle();

    if (data) {
      const v = data as Club2CoachClubVacancy;
      setExisting(v);
      setClubName(v.club_name);
      setRoleBeingRecruited(v.role_being_recruited);
      setCompetitionLevel(v.competition_level);
      setAgeGroup(v.age_group);
      setTeamGender(v.team_gender ?? "");
      setPreferredCoachGender(v.preferred_coach_gender ?? "");
      setRegion(v.region);
      setRequiredAccreditation(v.required_accreditation);
      setRequiredAbilityLevel(v.required_ability_level ?? "");
      setSalaryMin(v.salary_min?.toString() ?? "");
      setSalaryMax(v.salary_max?.toString() ?? "");
      setSalaryNegotiable(v.salary_negotiable);
      setOverview(v.overview ?? "");
      setPriorityHints(v.priority_hints ?? []);
      setNotes(v.notes ?? "");
      setAuthoriseShare(v.authorise_share);
    }
    setLoading(false);
  }

  function toggleHint(value: string) {
    setPriorityHints((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      person_id: person.id,
      club_name: clubName,
      role_being_recruited: roleBeingRecruited,
      competition_level: competitionLevel,
      age_group: ageGroup,
      team_gender: teamGender || null,
      preferred_coach_gender: preferredCoachGender || null,
      region,
      required_accreditation: requiredAccreditation,
      required_ability_level: requiredAbilityLevel || null,
      salary_min: salaryMin ? Number(salaryMin) : null,
      salary_max: salaryMax ? Number(salaryMax) : null,
      salary_negotiable: salaryNegotiable,
      overview,
      priority_hints: priorityHints,
      notes,
      authorise_share: authoriseShare,
    };

    const { error: saveError } = existing
      ? await supabase.from("club2coach_club_vacancies").update(payload).eq("id", existing.id)
      : await supabase.from("club2coach_club_vacancies").insert(payload);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Advertise a Coaching Vacancy</h1>

      {existing && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            existing.paid
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {existing.paid ? (
            <>✓ Your vacancy is active and included in matching.</>
          ) : (
            <>
              <strong>Payment required (${ROLE_PRICES_AUD.club2coach_club} AUD):</strong> your
              vacancy is saved but won't be included in matching until
              payment is confirmed. Coach In Mind will be in touch about
              how to pay — once confirmed, this activates automatically.
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-xl border bg-white p-6">
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Club name *</label>
          <input
            required
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Role being recruited</label>
            <select
              value={roleBeingRecruited}
              onChange={(e) => setRoleBeingRecruited(e.target.value)}
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
              value={competitionLevel}
              onChange={(e) => setCompetitionLevel(e.target.value)}
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
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
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
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {REGIONS.map((r) => (
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
              value={teamGender}
              onChange={(e) => setTeamGender(e.target.value)}
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
              value={preferredCoachGender}
              onChange={(e) => setPreferredCoachGender(e.target.value)}
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
              value={requiredAccreditation}
              onChange={(e) => setRequiredAccreditation(e.target.value)}
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
              value={requiredAbilityLevel}
              onChange={(e) => setRequiredAbilityLevel(e.target.value)}
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
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Salary offer max (AUD)</label>
            <input
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={salaryNegotiable}
            onChange={(e) => setSalaryNegotiable(e.target.checked)}
          />
          Salary negotiable
        </label>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Short overview — sell your club to coaches
          </label>
          <textarea
            maxLength={300}
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            What matters most for this role? (optional)
          </label>
          <div className="mt-1">
            <CheckboxGroup options={PRIORITY_HINTS} selected={priorityHints} onToggle={toggleHint} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            This is a hint for the admin, not a guarantee — the admin
            reviews it and decides whether to apply custom weighting for
            this specific vacancy. It won't change the score on its own.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Notes for Coach In Mind admin (private — not shown publicly)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={authoriseShare}
            onChange={(e) => setAuthoriseShare(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I authorise Coach In Mind to share this vacancy's details
            above with a matched coach once a suitable match is
            confirmed. *
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-accent self-start rounded-lg px-6 py-2 font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Add vacancy"}
        </button>
      </form>
    </div>
  );
}

export default function Club2CoachClubPage() {
  return <RequireProfile>{(person) => <Club2CoachClubForm person={person} />}</RequireProfile>;
}
