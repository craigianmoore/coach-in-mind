"use client";

import { useEffect, useState } from "react";
import RequireProfile from "@/components/RequireProfile";
import CheckboxGroup from "@/components/CheckboxGroup";
import { createClient } from "@/lib/supabase/client";
import { scoreCoach2MentorMatch } from "@/lib/scoring";
import {
  GENDER_OPTIONS,
  AVAILABILITY_OPTIONS,
  CAREER_STAGES,
  MENTOR_SPECIALISMS,
  ROLE_PRICES_AUD,
} from "@/lib/constants";
import type {
  Coach2MentorCoachListing,
  Coach2MentorMentorListing,
  Coach2MentorRequest,
  Coach2MentorWeights,
  Person,
  AdminSettings,
} from "@/types/database";
import { notifyAdmin } from "@/lib/notify";

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

  const [mentors, setMentors] = useState<Coach2MentorMentorListing[]>([]);
  const [requests, setRequests] = useState<Coach2MentorRequest[]>([]);
  const [weights, setWeights] = useState<Coach2MentorWeights | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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
    setMentors([]);
    setRequests([]);
  }

  async function load() {
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

      if (l.paid) {
        const [{ data: m }, { data: r }, { data: st }] = await Promise.all([
          supabase.from("coach2mentor_mentor_listings").select("*"),
          supabase.from("coach2mentor_requests").select("*").eq("coach_listing_id", l.id),
          supabase.from("admin_settings").select("*").eq("product", "coach2mentor").maybeSingle(),
        ]);
        setMentors((m as Coach2MentorMentorListing[]) ?? []);
        setRequests((r as Coach2MentorRequest[]) ?? []);
        setWeights((st as AdminSettings | null)?.weights as Coach2MentorWeights | null ?? null);
      }
    } else {
      resetForm();
    }
    setLoading(false);
  }

  function toggleArea(value: string) {
    setSupportAreas((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
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
    };

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

    if (!existing) {
      notifyAdmin(
        "new coach profile (Coach 2 Mentor)",
        `${person.full_name} (${person.email}, ${person.mobile})\nCareer stage: ${careerStage}`
      );
    }
  }

  async function handleDelete() {
    if (!existing) return;
    if (!window.confirm("Delete your mentor-seeking profile? You can create a new one afterwards if you change your mind.")) {
      return;
    }
    await supabase
      .from("coach2mentor_coach_listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", existing.id);
    await load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function sendRequest(mentorListingId: string, score: number | null) {
    if (!existing) return;
    setStatus(null);
    const { error: reqError } = await supabase.from("coach2mentor_requests").insert({
      coach_listing_id: existing.id,
      mentor_listing_id: mentorListingId,
      score,
    });
    if (reqError) setStatus(reqError.message);
    else {
      setStatus("Request sent.");
      await load();
    }
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  const requestedIds = new Set(requests.map((r) => r.mentor_listing_id));

  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Find a Mentor — Your Profile</h1>

      {existing && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            existing.paid
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {existing.paid ? (
            <>✓ Your profile is active — browse mentors below.</>
          ) : (
            <>
              <strong>Payment required (${ROLE_PRICES_AUD.coach2mentor_coach} AUD):</strong> save
              your profile, then Coach In Mind will be in touch about how
              to pay. Once confirmed, you'll be able to browse and
              request mentors.
            </>
          )}
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

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-accent self-start rounded-lg px-6 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : existing ? "Save changes" : "Save profile"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              className="self-start rounded-lg border border-red-200 px-6 py-2 font-semibold text-red-600 hover:bg-red-50"
            >
              Delete profile
            </button>
          )}
        </div>
      </form>

      {existing?.paid && (
        <div className="mt-8">
          <h2 className="text-lg font-bold">Browse Mentors</h2>
          {status && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{status}</p>}
          {mentors.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No mentors listed yet — check back soon.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {mentors
                .map((m) => ({
                  mentor: m,
                  breakdown: weights ? scoreCoach2MentorMatch(existing, person.region, m, weights) : null,
                }))
                .sort((a, b) => (b.breakdown?.total ?? 0) - (a.breakdown?.total ?? 0))
                .map(({ mentor, breakdown }) => (
                  <div key={mentor.id} className="rounded-xl border bg-white p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{mentor.career_stage}</p>
                        <p className="text-xs text-gray-500">{mentor.licence}</p>
                      </div>
                      {breakdown && (
                        <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                          {Math.round(breakdown.total * 100)}%
                        </span>
                      )}
                    </div>
                    {mentor.bio && <p className="mt-2 text-sm text-gray-700">{mentor.bio}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mentor.specialisms.map((s) => (
                        <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {mentor.rate_type === "free" ? "Free / volunteer" : `$${mentor.rate_amount} AUD ${mentor.rate_unit}`}
                    </p>
                    <div className="mt-4 border-t pt-3">
                      {requestedIds.has(mentor.id) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                          ✓ Request sent
                        </span>
                      ) : (
                        <button
                          onClick={() => sendRequest(mentor.id, breakdown ? breakdown.total : null)}
                          className="btn-accent w-full rounded-lg px-4 py-2 text-sm font-semibold"
                        >
                          Request this mentor
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Coach2MentorCoachPage() {
  return <RequireProfile>{(person) => <Coach2MentorCoachForm person={person} />}</RequireProfile>;
}
