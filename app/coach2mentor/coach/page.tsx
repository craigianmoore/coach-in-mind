"use client";

import { useEffect, useState } from "react";
import RequireProfile from "@/components/RequireProfile";
import CheckboxGroup from "@/components/CheckboxGroup";
import { createClient } from "@/lib/supabase/client";
import {
  GENDER_OPTIONS,
  AVAILABILITY_OPTIONS,
  CAREER_STAGES,
  MENTOR_SPECIALISMS,
  CLUB2COACH_COACH_PACKAGES,
} from "@/lib/constants";
import type {
  Coach2MentorCoachListing,
  Coach2MentorRequest,
  Coach2MentorWeights,
  Person,
  AdminSettings,
} from "@/types/database";
import { notifyAdmin } from "@/lib/notify";

const WEIGHT_LABELS: Record<keyof Coach2MentorWeights, string> = {
  specialism_overlap: "Specialism overlap",
  career_stage: "Career stage fit",
  geography: "Geography",
  availability: "Availability",
  budget_fit: "Budget fit",
  gender: "Gender preference",
};

function Coach2MentorCoachForm({ person }: { person: Person }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Coach2MentorCoachListing | null>(null);

  const [preferredMentorGender, setPreferredMentorGender] = useState("");
  const [availability, setAvailability] = useState("Either");
  const [careerStage, setCareerStage] = useState<string>(CAREER_STAGES[0]);
  const [supportAreas, setSupportAreas] = useState<string[]>([]);
  const [meetMin, setMeetMin] = useState("");
  const [meetMax, setMeetMax] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(1);

  const [globalWeights, setGlobalWeights] = useState<Coach2MentorWeights | null>(null);
  const [personalWeights, setPersonalWeights] = useState<Coach2MentorWeights | null>(null);

  const [matches, setMatches] = useState<(Coach2MentorRequest & { mentorName?: string; mentorBio?: string })[]>([]);
  const [introductionsUsed, setIntroductionsUsed] = useState(0);
  const [topupPackage, setTopupPackage] = useState(1);
  const [requestingTopup, setRequestingTopup] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setExisting(null);
    setPreferredMentorGender("");
    setAvailability("Either");
    setCareerStage(CAREER_STAGES[0]);
    setSupportAreas([]);
    setMeetMin("");
    setMeetMax("");
    setBudgetMin("");
    setBudgetMax("");
    setGoals("");
    setNotes("");
    setSelectedPackage(1);
    setPersonalWeights(null);
    setMatches([]);
  }

  async function load() {
    const { data: settingsData } = await supabase
      .from("admin_settings")
      .select("*")
      .eq("product", "coach2mentor")
      .maybeSingle();
    const global = (settingsData as AdminSettings | null)?.weights as Coach2MentorWeights | undefined;
    if (global) setGlobalWeights(global);

    const { data } = await supabase
      .from("coach2mentor_coach_listings")
      .select("*")
      .eq("person_id", person.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (data) {
      const l = data as Coach2MentorCoachListing;
      setExisting(l);
      setPreferredMentorGender(l.preferred_mentor_gender ?? "");
      setAvailability(l.availability ?? "Either");
      setCareerStage(l.current_career_stage ?? CAREER_STAGES[0]);
      setSupportAreas(l.support_areas ?? []);
      setMeetMin(l.meet_min?.toString() ?? "");
      setMeetMax(l.meet_max?.toString() ?? "");
      setBudgetMin(l.budget_min?.toString() ?? "");
      setBudgetMax(l.budget_max?.toString() ?? "");
      setGoals(l.goals ?? "");
      setNotes(l.notes ?? "");
      setSelectedPackage(l.included_introductions ?? 1);
      setPersonalWeights(l.personal_weights ?? global ?? null);

      // Fetch this coach's matches. RLS already hides 'suggested' rows
      // entirely — only pending/accepted/declined ever come back.
      const { data: reqs } = await supabase
        .from("coach2mentor_requests")
        .select("*")
        .eq("coach_listing_id", l.id)
        .order("created_at", { ascending: false });

      const requestRows = (reqs as Coach2MentorRequest[]) ?? [];

      // For accepted matches, the mentor's contact record is visible
      // via RLS now — pull their name. For pending ones, only the
      // listing content (not contact) is visible, so no name yet.
      const enriched = await Promise.all(
        requestRows.map(async (r) => {
          const { data: mentorListing } = await supabase
            .from("coach2mentor_mentor_listings")
            .select("bio, person_id")
            .eq("id", r.mentor_listing_id)
            .maybeSingle();

          let mentorName: string | undefined;
          if (r.status === "accepted" && mentorListing?.person_id) {
            const { data: mentorPerson } = await supabase
              .from("people")
              .select("full_name")
              .eq("id", mentorListing.person_id)
              .maybeSingle();
            mentorName = mentorPerson?.full_name;
          }

          return { ...r, mentorName, mentorBio: mentorListing?.bio ?? undefined };
        })
      );
      setMatches(enriched);

      if (l.paid) {
        const { count } = await supabase
          .from("coach2mentor_requests")
          .select("*", { count: "exact", head: true })
          .eq("coach_listing_id", l.id)
          .neq("status", "declined");
        setIntroductionsUsed(count ?? 0);
      }
    } else {
      resetForm();
      setPersonalWeights(global ?? null);
    }
    setLoading(false);
  }

  function toggleArea(value: string) {
    setSupportAreas((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function updatePersonalWeight(key: keyof Coach2MentorWeights, value: number) {
    setPersonalWeights((prev) => ({ ...(prev as Coach2MentorWeights), [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      person_id: person.id,
      preferred_mentor_gender: preferredMentorGender || null,
      availability,
      current_career_stage: careerStage,
      support_areas: supportAreas,
      meet_min: meetMin ? Number(meetMin) : null,
      meet_max: meetMax ? Number(meetMax) : null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      goals,
      notes,
      personal_weights: personalWeights,
      included_introductions: selectedPackage, // the coach's chosen package — admin confirms this when marking paid
    };

    const isNew = !existing;

    const { error: saveError } = existing
      ? await supabase.from("coach2mentor_coach_listings").update(payload).eq("id", existing.id)
      : await supabase.from("coach2mentor_coach_listings").insert(payload);

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await load();
    setSaving(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (isNew) {
      notifyAdmin(
        "new coach profile (Coach 2 Mentor)",
        `${person.full_name} (${person.email}, ${person.mobile})\nCareer stage: ${careerStage}`
      );
    }
  }

  async function requestTopup() {
    if (!existing) return;
    setRequestingTopup(true);
    await supabase
      .from("coach2mentor_coach_listings")
      .update({ topup_requested: topupPackage })
      .eq("id", existing.id);
    await load();
    setRequestingTopup(false);
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Find a Mentor — Your Profile</h1>
      <p className="mt-1 text-sm text-gray-600">
        Coach In Mind reviews mentors on your behalf and introduces you to your best matches —
        there's no browsing required.
      </p>

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
              ✓ Your profile is active — you're set up for {existing.included_introductions ?? "?"} mentor
              introduction{existing.included_introductions === 1 ? "" : "s"}
              {existing.included_introductions != null && (
                <> ({introductionsUsed} of {existing.included_introductions} used)</>
              )}
              . Coach In Mind will introduce you to your top matches.
            </>
          ) : (
            <>
              <strong>Payment required (${CLUB2COACH_COACH_PACKAGES[selectedPackage]} AUD):</strong> save
              your profile, then Coach In Mind will be in touch about how
              to pay. Once confirmed, we'll start matching you with mentors.
            </>
          )}
        </div>
      )}

      {existing?.paid && existing.included_introductions != null && introductionsUsed >= existing.included_introductions && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            You've used all {existing.included_introductions} of your introductions
          </p>
          {existing.topup_requested != null ? (
            <p className="mt-2 text-sm text-blue-800">
              Top-up request sent ({existing.topup_requested} more introduction
              {existing.topup_requested === 1 ? "" : "s"}) — Coach In Mind will be in touch about
              payment.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-blue-800">
                To be introduced to more mentors, buy another package below.
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
            How many mentor introductions do you want?
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {Object.entries(CLUB2COACH_COACH_PACKAGES).map(([count, price]) => (
              <label
                key={count}
                className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center ${
                  selectedPackage === Number(count) ? "border-brand-navy bg-brand-navy/5" : "border-gray-200"
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
        </div>
      )}

      {existing && matches.length > 0 && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700">Your matches</h2>
          <div className="mt-2 flex flex-col gap-2">
            {matches.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {m.status === "accepted" ? m.mentorName ?? "A mentor" : "A potential mentor"}
                  </p>
                  {m.mentorBio && m.status !== "declined" && (
                    <p className="text-xs text-gray-500 line-clamp-1">{m.mentorBio}</p>
                  )}
                  <p className="text-xs text-gray-400 capitalize">
                    {m.status === "pending" ? "Awaiting mentor's response" : m.status}
                  </p>
                </div>
                {m.score != null && (
                  <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                    {Math.round(m.score * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-xl border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Preferred mentor gender</label>
            <select
              value={preferredMentorGender}
              onChange={(e) => setPreferredMentorGender(e.target.value)}
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
            <label className="text-xs font-semibold uppercase text-gray-500">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {AVAILABILITY_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Current career stage</label>
          <select
            value={careerStage}
            onChange={(e) => setCareerStage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {CAREER_STAGES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Areas you want support with — select all that apply
          </label>
          <div className="mt-1">
            <CheckboxGroup options={MENTOR_SPECIALISMS} selected={supportAreas} onToggle={toggleArea} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">
              Meetings per year — min
            </label>
            <input
              type="number"
              value={meetMin}
              onChange={(e) => setMeetMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">
              Meetings per year — max
            </label>
            <input
              type="number"
              value={meetMax}
              onChange={(e) => setMeetMax(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">
              Budget min (AUD per session)
            </label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">
              Budget max (AUD per session)
            </label>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <p className="-mt-3 text-xs text-gray-500">
          Leave blank if you're only looking for free/volunteer mentors.
        </p>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            What are you hoping to get from mentoring?
          </label>
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {personalWeights && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              What matters most to you in a mentor?
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Rate each factor from 1 (least important) to 10 (most important). This is personal to
              you — it shapes who Coach In Mind prioritises introducing you to, on top of the
              standard matching criteria.
            </p>
            {(Object.keys(personalWeights) as (keyof Coach2MentorWeights)[]).map((key) => (
              <div key={key} className="mt-3">
                <div className="flex justify-between text-sm">
                  <span>{WEIGHT_LABELS[key]}</span>
                  <span>{personalWeights[key]}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={personalWeights[key]}
                  onChange={(e) => updatePersonalWeight(key, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Notes for Coach In Mind admin (private — not shown publicly)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-accent self-start rounded-lg px-6 py-2 font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Save profile"}
        </button>
      </form>
    </div>
  );
}

export default function Coach2MentorCoachPage() {
  return <RequireProfile>{(person) => <Coach2MentorCoachForm person={person} />}</RequireProfile>;
}
