"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Landing page for the "reset your password" email link. The Supabase client
// picks the recovery code out of the URL and signs the person in; we then let
// them choose a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) setReady(true);
    });
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else setExpired(true);
    }, 2500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Please use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(err.message);
    router.push("/profile");
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {ready ? (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input type="password" required placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
          <input type="password" required placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-navy px-4 py-2 font-semibold text-white hover:bg-brand-navyLight disabled:opacity-50">
            {saving ? "Saving…" : "Save new password"}
          </button>
        </form>
      ) : expired ? (
        <p className="mt-6 text-sm text-gray-700">
          This reset link has expired or was opened in a different browser. Go back to{" "}
          <Link href="/login" className="text-brand-navy underline">log in</Link> and choose &ldquo;Forgot password?&rdquo; to get a new one.
        </p>
      ) : (
        <p className="mt-6 text-sm text-gray-500">Checking your link…</p>
      )}
    </div>
  );
}
