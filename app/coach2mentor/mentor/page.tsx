"use client";

import { useEffect, useState } from "react";
import RequireProfile from "@/components/RequireProfile";
import CheckboxGroup from "@/components/CheckboxGroup";
import GroupedRegionCheckboxGroup from "@/components/GroupedRegionCheckboxGroup";
import { createClient } from "@/lib/supabase/client";
import {
  GENDER_OPTIONS,
  AVAILABILITY_OPTIONS,
  ACCREDITATION_LEVELS,
  CAREER_STAGES,
  MENTOR_SPECIALISMS,
  RATE_UNITS,
  COACH2MENTOR_MENTOR_CAPACITY_PACKAGES,
} from "@/lib/constants";
import type { Coach2MentorMentorListing, Coach2MentorRequest, Person } from "@/types/database";
import { notifyAdmin } from "@/lib/notify";

interface RequestWithCoachName extends Coach2MentorRequest {
  coachName?: string;
}

function Coach2MentorMentorForm({ person }: { person: Person }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Coach2MentorMentorListing | null>(null);

  const [preferredCoachGender, setPreferredCoachGender] = useState("");
  const [availability, setAvailability] = useState("Either");
  const [regionsServed, setRegionsServed] = useState<string[]>([]);
  const [faNumber, setFaNumber] = useState("");
  const [licence, setLicence] = useState<string>(person.current_licence ?? ACCREDITATION_LEVELS[0]);
  const [careerStage, setCareerStage] = useState<string>(CAREER_STAGES[0]);
  const [specialisms, setSpecialisms] = useState<string[]>([]);
  const [meetCapacity, setMeetCapacity] = useState("");
  const [rateType, setRateType] = useState<"paid" | "free">("paid");
  const [rateAmount, setRateAmount] = useState("");
  const [rateUnit, setRateUnit] = useState<string>(RATE_UNITS[0]);
  const [rateNegotiable, setRateNegotiable] = useState(false);
  const [inPersonDiffers, setInPersonDiffers] = useState(false);
  const [inPersonAmount, setInPersonAmount] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState(1);
  const [currentlyOpen, setCurrentlyOpen] = useState(true);
  const [bio, setBio] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [authoriseShare, setAuthoriseShare] = useState(false);

  const [requests, setRequests] = useState<RequestWithCoachName[]>([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setExisting(null);
    setPreferredCoachGender("");
    setAvailability("Either");
    setRegionsServed([]);
    setFaNumber("");
    setLicence(person.current_licence ?? ACCREDITATION_LEVELS[0]);
    setCareerStage(CAREER_STAGES[0]);
    setSpecialisms([]);
    setMeetCapacity("");
    setRateType("paid");
    setRateAmount("");
    setRateUnit(RATE_UNITS[0]);
    setRateNegotiable(false);
    setInPersonDiffers(false);
    setInPersonAmount("");
    setSelectedCapacity(1);
    setCurrentlyOpen(true);
    setBio("");
    setNotes("");
    setConfirmAccurate(false);
    setAuthoriseShare(false);
    setRequests([]);
  }

  async function load() {
    const { data } = await supabase
      .from("coach2mentor_mentor_listings")
      .select("*")
      .eq("person_id", person.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (data) {
      const l = data as Coach2MentorMentorListing;
      setExisting(l);
      setPreferredCoachGender(l.preferred_coach_gender ?? "");
      setAvailability(l.availability ?? "Either");
      setRegionsServed(l.regions_served ?? []);
      setFaNumber(l.fa_number ?? "");
      setLicence(l.licence ?? ACCREDITATION_LEVELS[0]);
      setCareerStage(l.career_stage ?? CAREER_STAGES[0]);
      setSpecialisms(l.specialisms ?? []);
      setMeetCapacity(l.meet_capacity_per_year?.toString() ?? "");
      setRateType(l.rate_type);
      setRateAmount(l.rate_amount?.toString() ?? "");
      setRateUnit(l.rate_unit ?? RATE_UNITS[0]);
      setRateNegotiable(l.rate_negotiable);
      setInPersonDiffers(l.in_person_rate_differs);
      setInPersonAmount(l.in_person_rate_amount?.toString() ?? "");
      setSelectedCapacity(l.max_mentees ?? 1);
      setCurrentlyOpen(l.currently_open);
      setBio(l.bio ?? "");
      setNotes(l.notes ?? "");
      setConfirmAccurate(l.confirm_accurate);
      setAuthoriseShare(l.authorise_share);

      if (l.paid) {
        const { data: reqs } = await supabase
          .from("coach2mentor_requests")
          .select("*")
          .eq("mentor_listing_id", l.id);
        setRequests((reqs as Coach2MentorRequest[]) ?? []);
      }
    } else {
      resetForm();
    }
    setLoading(false);
  }

  function toggleRegion(v: string) {
    setRegionsServed((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  function toggleSpecialism(v: string) {
    setSpecialisms((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{8}$/.test(faNumber)) {
      setError("FA# must be exactly 8 digits.");
      return;
    }

    const minMentorIdx = ACCREDITATION_LEVELS.indexOf("B Licence");
    const licenceIdx = ACCREDITATION_LEVELS.indexOf(licence as any);
    if (minMentorIdx >= 0 && licenceIdx < minMentorIdx) {
      setError("You need a B Licence or above to register as a mentor.");
      return;
    }

    setSaving(true);

    const payload = {
      person_id: person.id,
      preferred_coach_gender: preferredCoachGender || null,
      availability,
      regions_served: regionsServed,
      fa_number: faNumber,
      licence,
      career_stage: careerStage,
      specialisms,
      meet_capacity_per_year: meetCapacity ? Number(meetCapacity) : null,
      rate_type: rateType,
      rate_amount: rateType === "paid" && rateAmount ? Number(rateAmount) : null,
      rate_unit: rateType === "paid" ? rateUnit : null,
      rate_negotiable: rateNegotiable,
      in_person_rate_differs: inPersonDiffers,
      in_person_rate_amount: inPersonDiffers && inPersonAmount ? Number(inPersonAmount) : null,
      max_mentees: selectedCapacity,
      currently_open: currentlyOpen,
      bio,
      notes,
      confirm_accurate: confirmAccurate,
      authorise_share: authoriseShare,
    };

    const { error: saveError } = existing
      ? await supabase.from("coach2mentor_mentor_listings").update(payload).eq("id", existing.id)
      : await supabase.from("coach2mentor_mentor_listings").insert(payload);

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
        "new mentor profile (Coach 2 Mentor)",
        `${person.full_name} (${person.email}, ${person.mobile})\nCareer stage: ${careerStage} · Licence: ${licence}`
      );
    }
  }

  async function handleDelete() {
    if (!existing) return;
    if (!window.confirm("Delete your mentor profile? You'll stop appearing to coaches searching for a mentor. You can create a new profile afterwards if you change your mind.")) {
      return;
    }
    await supabase
      .from("coach2mentor_mentor_listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", existing.id);
    await load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function respondToRequest(requestId: string, response: "accepted" | "declined") {
    await supabase
      .from("coach2mentor_requests")
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq("id", requestId);
    await load();
  }

  if (loading) return <p className="py-8 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">Become a Mentor — Your Profile</h1>

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
              ✓ Your profile is active — Coach In Mind will introduce you to up to{" "}
              {existing.max_mentees} coach{existing.max_mentees === 1 ? "" : "es"} based on your
              capacity.
            </>
          ) : (
            <>
              <strong>
                Payment required (${COACH2MENTOR_MENTOR_CAPACITY_PACKAGES[selectedCapacity]} AUD):
              </strong>{" "}
              save your profile, then Coach In Mind will be in touch about how to pay. Once
              confirmed, we'll start introducing you to coaches.
            </>
          )}
        </div>
      )}

      {!existing?.paid && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">
            How many mentees can you take on?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(COACH2MENTOR_MENTOR_CAPACITY_PACKAGES).map(([count, price]) => (
              <label
                key={count}
                className={`cursor-pointer rounded-lg border-2 p-3 text-center ${
                  selectedCapacity === Number(count) ? "border-brand-navy bg-brand-navy/5" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="capacity"
                  className="sr-only"
                  checked={selectedCapacity === Number(count)}
                  onChange={() => setSelectedCapacity(Number(count))}
                />
                <p className="font-semibold">
                  {count} mentee{count === "1" ? "" : "s"}
                </p>
                <p className="text-sm text-gray-500">${price} AUD</p>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            More capacity costs more upfront, but most mentors recoup it within a session or two
            at their own rate.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-xl border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Preferred coach gender</label>
            <select
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
          <label className="text-xs font-semibold uppercase text-gray-500">
            Regions you can serve — select all that apply
          </label>
          <div className="mt-1">
            <GroupedRegionCheckboxGroup selected={regionsServed} onToggle={toggleRegion} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">FA# (8 digits)</label>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={8}
            pattern="\d{8}"
            value={faNumber}
            onChange={(e) => setFaNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
            placeholder="12345678"
          />
          <p className="mt-1 text-xs text-gray-500">Your Football Australia registration number.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Your licence</label>
            <select
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {ACCREDITATION_LEVELS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              A B Licence or above is required to register as a mentor, and you can only be
              matched with coaches whose licence is below yours.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Your career stage</label>
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
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Areas of expertise — select all that apply
          </label>
          <div className="mt-1">
            <CheckboxGroup options={MENTOR_SPECIALISMS} selected={specialisms} onToggle={toggleSpecialism} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            How many times a year are you able to meet with a mentee?
          </label>
          <input
            type="number"
            value={meetCapacity}
            onChange={(e) => setMeetCapacity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            As a guide, most mentoring relationships run to around 6–12
            sessions a year (roughly every 1–2 months).
          </p>
        </div>

        {existing?.paid && (
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Mentee capacity</label>
            <p className="mt-1 text-sm text-gray-700">
              {selectedCapacity} mentee{selectedCapacity === 1 ? "" : "s"} — to change this, contact
              Coach In Mind about upgrading your package.
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Rate</p>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={rateType === "paid"} onChange={() => setRateType("paid")} />
              Paid
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={rateType === "free"} onChange={() => setRateType("free")} />
              Free / Volunteer
            </label>
          </div>
        </div>

        {rateType === "paid" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Rate (AUD)</label>
                <input
                  type="number"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Unit</label>
                <select
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {RATE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="-mt-3 text-xs text-gray-500">
              As a guide, mentoring sessions typically run 30–60 minutes.
              Rates commonly range from around $50–$150 AUD per session
              depending on experience and career stage — but this is
              entirely up to you.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rateNegotiable}
                onChange={(e) => setRateNegotiable(e.target.checked)}
              />
              Rate negotiable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inPersonDiffers}
                onChange={(e) => setInPersonDiffers(e.target.checked)}
              />
              Different rate for in-person
            </label>
            {inPersonDiffers && (
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">In-person rate (AUD)</label>
                <input
                  type="number"
                  value={inPersonAmount}
                  onChange={(e) => setInPersonAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  As a guide, in-person mentoring is often around $100 AUD per hour — but this is
                  entirely up to you.
                </p>
              </div>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={currentlyOpen}
            onChange={(e) => setCurrentlyOpen(e.target.checked)}
          />
          Currently open to new mentees
        </label>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Bio — your background, achievements, mentoring approach
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Notes for Coach In Mind admin (private — not shown to coaches)
          </label>
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
            checked={confirmAccurate}
            onChange={(e) => setConfirmAccurate(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I confirm the information I've provided is accurate and
            current to the best of my knowledge. *
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={authoriseShare}
            onChange={(e) => setAuthoriseShare(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I'm happy for my profile and bio to be visible to coaches
            searching for a mentor, and for my contact details to be
            shared once I accept a request. *
          </span>
        </label>

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
        <div className="mt-8 rounded-xl border-2 border-accent bg-accent-soft p-5" style={{ borderColor: "var(--accent)" }}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Requests from coaches</h2>
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: "var(--accent-dark)" }}
              >
                {requests.filter((r) => r.status === "pending").length} pending
              </span>
            )}
          </div>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              No introductions yet — Coach In Mind reviews coaches looking for a mentor and will
              put suitable matches in front of you here once your profile's live.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    r.status === "pending" ? "border-amber-300 bg-white shadow-sm" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{r.status}</p>
                    <p className="text-xs text-gray-500">
                      Requested {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.score != null && (
                      <span className="text-sm font-bold" style={{ color: "var(--accent-dark)" }}>
                        {Math.round(r.score * 100)}% match
                      </span>
                    )}
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToRequest(r.id, "accepted")}
                          className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToRequest(r.id, "declined")}
                          className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600"
                        >
                          Decline
                        </button>
                      </div>
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

export default function Coach2MentorMentorPage() {
  return <RequireProfile>{(person) => <Coach2MentorMentorForm person={person} />}</RequireProfile>;
}
