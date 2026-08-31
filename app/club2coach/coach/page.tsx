"use client";

import { useEffect, useState } from "react";
import RequireProfile from "@/components/RequireProfile";
import CheckboxGroup from "@/components/CheckboxGroup";
import RegionMap from "@/components/RegionMap";
import { createClient } from "@/lib/supabase/client";
import {
  COACHING_ROLES,
  ABILITY_LEVELS,
  COMPETITION_LEVELS,
  AGE_GROUPS,
  REGIONS,
  REGIONS_BY_STATE,
  GENDER_OPTIONS,
  CLUB2COACH_COACH_PACKAGES,
  STATE_OPTIONS,
  STATE_LABELS,
} from "@/lib/constants";
import type { Club2CoachCoachListing, Person } from "@/types/database";
import { notifyAdmin } from "@/lib/notify";

function Club2CoachCoachForm({ person }: { person: Person }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Club2CoachCoachListing | null>(null);

  const [roleSought, setRoleSought] = useState<string>(COACHING_ROLES[0]);
  const [preferredTeamGender, setPreferredTeamGender] = useState("");
  const [abilityLevels, setAbilityLevels] = useState<string[]>([]);
  const [competitionLevels, setCompetitionLevels] = useState<string[]>([]);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [statePreferences, setStatePreferences] = useState<string[]>([]);
  const [openToRelocating, setOpenToRelocating] = useState(false);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [overview, setOverview] = useState("");
  const [notes, setNotes] = useState("");
  const [authoriseShare, setAuthoriseShare] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(1);
  const [introductionsUsed, setIntroductionsUsed] = useState(0);
  const [topupPackage, setTopupPackage] = useState(1);
  const [requestingTopup, setRequestingTopup] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setExisting(null);
    setRoleSought(COACHING_ROLES[0]);
    setPreferredTeamGender("");
    setAbilityLevels([]);
    setCompetitionLevels([]);
    setAgeGroups([]);
    setRegions([]);
    setStatePreferences([]);
    setOpenToRelocating(false);
    setSalaryMin("");
    setSalaryMax("");
    setSalaryNegotiable(false);
    setOverview("");
    setNotes("");
    setAuthoriseShare(false);
    setSelectedPackage(1);
  }

  async function load() {
    const { data } = await supabase
      .from("club2coach_coach_listings")
      .select("*")
      .eq("person_id", person.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (data) {
      const l = data as Club2CoachCoachListing;
      setExisting(l);
      setRoleSought(l.role_sought);
      setPreferredTeamGender(l.preferred_team_gender ?? "");
      setAbilityLevels(l.ability_levels ?? []);
      setCompetitionLevels(l.preferred_competition_levels ?? []);
      setAgeGroups(l.preferred_age_groups ?? []);
      setRegions(l.preferred_regions ?? []);
      setStatePreferences(l.state_preferences ?? []);
      setOpenToRelocating(l.open_to_relocating);
      setSalaryMin(l.salary_min?.toString() ?? "");
      setSalaryMax(l.salary_max?.toString() ?? "");
      setSalaryNegotiable(l.salary_negotiable);
      setOverview(l.overview ?? "");
      setNotes(l.notes ?? "");
      setAuthoriseShare(l.authorise_share);
      setSelectedPackage(l.included_introductions ?? 1);

      if (l.paid) {
        // RLS already restricts this to only rows that are actually
        // approved (i.e. genuinely used, not just suggested) — so a
        // plain count is exactly "how many introductions used".
        const { count } = await supabase
          .from("club2coach_shares")
          .select("*", { count: "exact", head: true })
          .eq("coach_listing_id", l.id);
        setIntroductionsUsed(count ?? 0);
      }
    } else {
      resetForm();
    }
    setLoading(false);
  }

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      person_id: person.id,
      role_sought: roleSought,
      preferred_team_gender: preferredTeamGender || null,
      ability_levels: abilityLevels,
      preferred_competition_levels: competitionLevels,
      preferred_age_groups: ageGroups,
      preferred_regions: regions,
      open_to_relocating: openToRelocating,
      state_preferences: statePreferences,
      salary_min: salaryMin ? Number(salaryMin) : null,
      salary_max: salaryMax ? Number(salaryMax) : null,
      salary_negotiable: salaryNegotiable,
      overview,
      notes,
      authorise_share: authoriseShare,
      included_introductions: selectedPackage, // the coach's chosen package — admin confirms this (or adjusts it) when marking paid
    };

    const { error: saveError } = existing
      ? await supabase.from("club2coach_coach_listings").update(payload).eq("id", existing.id)
      : await supabase.from("club2coach_coach_listings").insert(payload);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (!existing) {
      notifyAdmin(
        "new coach listing (Club 2 Coach)",
        `${person.full_name} (${person.email}, ${person.mobile})\nRole sought: ${roleSought}`
      );
    }
  }

  async function requestTopup() {
    if (!existing) return;
    setRequestingTopup(true);
    await supabase
      .from("club2coach_coach_listings")
      .update({ topup_requested: topupPackage })
      .eq("id", existing.id);
    await load();
    setRequestingTopup(false);
  }

  async function handleDelete() {
    if (!existing) return;
    if (!window.confirm("Delete your coach listing? You can create a new one afterwards if you change your mind.")) {
      return;
    }
    await supabase
      .from("club2coach_coach_listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", existing.id);
    await load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  // Regions and maps only make sense once at least one state is
  // picked — before that there's nothing to scope them to, so they
  // stay hidden rather than showing an unfiltered wall of every
  // region across every federation.

  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Find a Coaching Role</h1>

      {existing && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            existing.paid
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {existing.paid ? (
            <>
              ✓ Your listing is active and included in matching — you're set up for{" "}
              {existing.included_introductions ?? "?"} club introduction
              {existing.included_introductions === 1 ? "" : "s"}
              {existing.included_introductions != null && (
                <> ({introductionsUsed} of {existing.included_introductions} used)</>
              )}
              .
            </>
          ) : (
            <>
              <strong>Payment required (${CLUB2COACH_COACH_PACKAGES[selectedPackage]} AUD):</strong> your
              listing is saved but won't be included in matching until
              payment is confirmed. Coach In Mind will be in touch about
              how to pay — once confirmed, this activates automatically.
            </>
          )}
        </div>
      )}

      {existing?.paid &&
        existing.included_introductions != null &&
        introductionsUsed >= existing.included_introductions && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              You've used all {existing.included_introductions} of your introductions
            </p>
            {existing.topup_requested != null ? (
              <p className="mt-2 text-sm text-blue-800">
                Top-up request sent ({existing.topup_requested} more introduction
                {existing.topup_requested === 1 ? "" : "s"}) — Coach In Mind will be in touch about
                payment. You'll be back in matching as soon as it's confirmed.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-blue-800">
                  To keep being matched with clubs, buy another package below.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {Object.entries(CLUB2COACH_COACH_PACKAGES).map(([count, price]) => (
                    <label
                      key={count}
                      className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center ${
                        topupPackage === Number(count) ? "border-brand-navy bg-brand-navy/5" : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="topup-package"
                        className="sr-only"
                        checked={topupPackage === Number(count)}
                        onChange={() => setTopupPackage(Number(count))}
                      />
                      <p className="font-semibold">
                        {count} introduction{count === "1" ? "" : "s"}
                      </p>
                      <p className="text-sm text-gray-500">${price} AUD</p>
                    </label>
                  ))}
                </div>
                <button
                  onClick={requestTopup}
                  disabled={requestingTopup}
                  className="btn-accent mt-3 rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {requestingTopup ? "Sending…" : "Request top-up"}
                </button>
              </>
            )}
          </div>
        )}

      {!existing?.paid && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">
            How many club introductions do you want?
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {Object.entries(CLUB2COACH_COACH_PACKAGES).map(([count, price]) => (
              <label
                key={count}
                className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center ${
                  selectedPackage === Number(count)
                    ? "border-brand-navy bg-brand-navy/5"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  className="sr-only"
                  checked={selectedPackage === Number(count)}
                  onChange={() => setSelectedPackage(Number(count))}
                />
                <p className="font-semibold">
                  {count} introduction{count === "1" ? "" : "s"}
                </p>
                <p className="text-sm text-gray-500">${price} AUD</p>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            We'll match you with your top-scoring club vacancies, up to this many, based on your
            criteria below. If none of them work out, you can top up for more later.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-xl border bg-white p-6">
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Coaching role sought</label>
          <select
            value={roleSought}
            onChange={(e) => setRoleSought(e.target.value)}
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
          <label className="text-xs font-semibold uppercase text-gray-500">
            Ability level — select all that apply
          </label>
          <div className="mt-1">
            <CheckboxGroup
              options={ABILITY_LEVELS}
              selected={abilityLevels}
              onToggle={(v) => toggle(abilityLevels, setAbilityLevels, v)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Preferred competition levels
          </label>
          <div className="mt-1">
            <CheckboxGroup
              options={COMPETITION_LEVELS}
              selected={competitionLevels}
              onToggle={(v) => toggle(competitionLevels, setCompetitionLevels, v)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Preferred age groups</label>
          <div className="mt-1">
            <CheckboxGroup
              options={AGE_GROUPS}
              selected={ageGroups}
              onToggle={(v) => toggle(ageGroups, setAgeGroups, v)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Which state(s) are you open to coaching in?
          </label>
          <div className="mt-1 flex flex-wrap gap-3">
            {STATE_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={statePreferences.includes(opt)}
                  onChange={() => {
                    const next = statePreferences.includes(opt)
                      ? statePreferences.filter((s) => s !== opt)
                      : [...statePreferences, opt];
                    setStatePreferences(next);
                    // Drop any previously-selected regions that no
                    // longer belong to the currently chosen state(s),
                    // so nothing stale lingers invisibly in the
                    // background.
                    const stillValid = next.length === 0 ? REGIONS : next.flatMap((s) => REGIONS_BY_STATE[s] ?? []);
                    setRegions((prev) => prev.filter((r) => stillValid.includes(r)));
                  }}
                />
                {STATE_LABELS[opt]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            This is a hard preference, not just a nice-to-have — roles outside your selected
            state(s) won't be matched to you. Leave everything unchecked to stay open to every
            state, including any added later.
          </p>
        </div>

        {statePreferences.length > 0 && (
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Preferred regions</label>
            <div className="mt-2 flex flex-col gap-4">
              {statePreferences.map((s) => (
                <div key={s}>
                  <p className="mb-1.5 text-xs font-semibold text-gray-600">{STATE_LABELS[s]}</p>
                  <CheckboxGroup
                    options={REGIONS_BY_STATE[s] ?? []}
                    selected={regions}
                    onToggle={(v) => toggle(regions, setRegions, v)}
                  />
                </div>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={openToRelocating}
                onChange={(e) => setOpenToRelocating(e.target.checked)}
              />
              Open to relocating outside preferred regions
            </label>
          </div>
        )}

        {statePreferences.some((s) => s !== "ACT") && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
              Not sure which region? Here's roughly where each one sits.
            </p>
            <div className="flex flex-wrap gap-4">
              {statePreferences
                .filter((s) => s !== "ACT") // no map for ACT — it's a single-region federation
                .map((s) => (
                  <div key={s}>
                    <p className="mb-1.5 text-sm font-bold text-brand-navy">{STATE_LABELS[s]}</p>
                    <RegionMap state={s} />
                  </div>
                ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Preferred team gender to work with
          </label>
          <select
            value={preferredTeamGender}
            onChange={(e) => setPreferredTeamGender(e.target.value)}
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
          <p className="text-xs font-semibold uppercase text-gray-500">Package</p>
          <p className="mt-1 text-xs text-gray-500">
            This is only indicative — actual pay structures vary a lot by club and level, and
            this figure is more relevant to NSW &amp; VIC than other states.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">
              Package expectation min (AUD)
            </label>
            <input
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">
              Package expectation max (AUD)
            </label>
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
          Package negotiable
        </label>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Short overview — sell yourself to clubs
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
            I authorise Coach In Mind to share my details above with a
            matched club once a suitable match is confirmed. My details
            are kept private and only shared once approved. *
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-accent self-start rounded-lg px-6 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Add coach listing"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              className="self-start rounded-lg border border-red-200 px-6 py-2 font-semibold text-red-600 hover:bg-red-50"
            >
              Delete listing
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function Club2CoachCoachPage() {
  return <RequireProfile>{(person) => <Club2CoachCoachForm person={person} />}</RequireProfile>;
}
