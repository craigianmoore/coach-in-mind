"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TermsModal from "@/components/TermsModal";

function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/profile";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Something went wrong signing up.");
      setLoading(false);
      return;
    }

    router.push(`/profile?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-bold">Create your Coach In Mind account</h1>
      <p className="mt-1 text-sm text-gray-600">
        One login covers both Club 2 Coach and Coach 2 Mentor. You'll set up
        your shared profile next.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />

        <div className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            required
            checked={agreedToTerms}
            readOnly
            // Not directly togglable — clicking it opens the modal
            // the same as clicking the link text does, so there's
            // exactly one way to agree (reading it), not a way to
            // tick the box without ever seeing the content.
            onClick={() => setShowTermsModal(true)}
            className="mt-0.5"
          />
          <button type="button" onClick={() => setShowTermsModal(true)} className="text-left">
            I agree to the{" "}
            <span className="text-brand-navy underline">Terms of Service and Privacy Policy</span>
            {agreedToTerms && <span className="ml-2 text-xs font-semibold text-green-600">✓ Agreed</span>}
            {" *"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="rounded-lg bg-brand-navy px-4 py-2 font-semibold text-white hover:bg-brand-navyLight disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Continue"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-navy hover:underline">
            Log in
          </Link>
        </p>
      </form>

      <TermsModal
        open={showTermsModal}
        onAgree={() => {
          setAgreedToTerms(true);
          setShowTermsModal(false);
        }}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <SignupForm />
    </Suspense>
  );
}
