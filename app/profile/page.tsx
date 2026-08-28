"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import { REGIONS, ACCREDITATION_LEVELS, GENDER_OPTIONS } from "@/lib/constants";
import type { Person } from "@/types/database";

function ProfileForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [existing, setExisting] = useState<Person | null>(null);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [currentLicence, setCurrentLicence] = useState("None / In Progress");
  const [mobileWarning, setMobileWarning] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) setEmail(user.email);

    const { data } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      const p = data as Person;
      setExisting(p);
      setFullName(p.full_name);
      setMobile(p.mobile);
      setEmail(p.email);
      setGender(p.gender ?? "");
      setRegion(p.region ?? "");
      setCurrentLicence(p.current_licence ?? "None / In Progress");
    }
    setLoading(false);
  }

  // Soft, non-blocking check: does this mobile number already belong
  // to a different account? Never says whose — just flags it, so a
  // genuinely shared family number doesn't get anyone locked out.
  async function checkMobile(value: string) {
    if (!value.trim()) {
      setMobileWarning(false);
      return;
    }
    const { data } = await supabase.rpc("is_mobile_registered", {
      check_mobile: value,
      exclude_person_id: existing?.id ?? null,
    });
    setMobileWarning(Boolean(data));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be logged in.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      full_name: fullName,
      mobile,
      email,
      gender: gender || null,
      region: region || null,
      current_licence: currentLicence,
    };

    // upsert rather than insert/update: this is the safe fix for a
    // real bug users hit — if a profile already exists but the page's
    // local state hadn't caught up (e.g. saved once, no clear
    // confirmation shown, saved again), a plain insert would fail with
    // a "duplicate key" error instead of just updating the row. Upsert
    // keyed on user_id makes saving idempotent — safe to click twice.
    const { data: saved, error: saveError } = await supabase
      .from("people")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setExisting(saved as Person);
    setSavedMessage("Profile saved.");
    setTimeout(() => setSavedMessage(null), 3000);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (next) {
      router.push(next);
    } else {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Your Coach In Mind profile</h1>
      <p className="mt-1 text-sm text-gray-600">
        This is your shared identity — the same details are used whether
        you're a coach, a club, or a mentor, across both Club 2 Coach and
        Coach 2 Mentor. Each role you take on is still activated (and paid
        for) separately.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Full name *</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Mobile *</label>
            <input
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              onBlur={(e) => checkMobile(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            {mobileWarning && (
              <p className="mt-1 text-xs text-amber-700">
                This mobile number is already linked to another Coach In
                Mind account. If that's you, log in with your original
                account instead — you can still save, but duplicate
                accounts can't be merged later.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Email *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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
            <label className="text-xs font-semibold uppercase text-gray-500">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select…</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Current coaching accreditation
          </label>
          <select
            value={currentLicence}
            onChange={(e) => setCurrentLicence(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {ACCREDITATION_LEVELS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="text-sm font-medium text-green-600">✓ {savedMessage}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-navy px-4 py-2 font-semibold text-white hover:bg-brand-navyLight disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Create profile"}
        </button>
      </form>

      {existing && !next && (
        <div className="mt-8 rounded-xl border bg-white p-6">
          <h2 className="font-semibold">What would you like to do?</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/club2coach/coach"
              className="rounded-lg border border-brand-goldLight bg-brand-goldLight/10 p-3 text-sm font-medium hover:bg-brand-goldLight/20"
            >
              Find a coaching role (Club 2 Coach)
            </Link>
            <Link
              href="/club2coach/club"
              className="rounded-lg border border-brand-goldLight bg-brand-goldLight/10 p-3 text-sm font-medium hover:bg-brand-goldLight/20"
            >
              Advertise a vacancy (Club 2 Coach)
            </Link>
            <Link
              href="/coach2mentor/coach"
              className="rounded-lg border border-brand-navy bg-brand-navy/5 p-3 text-sm font-medium hover:bg-brand-navy/10"
            >
              Find a mentor (Coach 2 Mentor)
            </Link>
            <Link
              href="/coach2mentor/mentor"
              className="rounded-lg border border-brand-navy bg-brand-navy/5 p-3 text-sm font-medium hover:bg-brand-navy/10"
            >
              Become a mentor (Coach 2 Mentor)
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<p className="p-6">Loading…</p>}>
        <ProfileForm />
      </Suspense>
    </AuthGuard>
  );
}
