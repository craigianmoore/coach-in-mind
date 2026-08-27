"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthGuard from "./AuthGuard";

// One 6-digit PIN, shared by both products. Entering it correctly
// grants a 4-hour admin session recorded on the caller's own `people`
// row (see grant_admin_pin_session in schema.sql) — RLS policies check
// that flag directly, so this is real access control, not just a UI
// gate that hides buttons.
export default function PinGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PinGateInner>{children}</PinGateInner>
    </AuthGuard>
  );
}

function PinGateInner({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkExistingSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setChecked(true);
      return;
    }

    const { data } = await supabase
      .from("people")
      .select("admin_session_until")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.admin_session_until && new Date(data.admin_session_until) > new Date()) {
      setUnlocked(true);
      // Extend the session on every admin page load, so it behaves as
      // "2 hours since your last activity" rather than a fixed window.
      supabase.rpc("refresh_admin_session");
    }
    setChecked(true);
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc("grant_admin_pin_session", {
      input_pin: pin,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (data === true) {
      setUnlocked(true);
    } else {
      setError("Incorrect PIN.");
    }
    setLoading(false);
  }

  if (!checked) {
    return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto mt-12 max-w-sm rounded-xl border bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-bold">Admin access</h1>
      <p className="mt-1 text-sm text-gray-600">
        Listings, matches, and platform settings are restricted to admins.
      </p>
      <form onSubmit={handleUnlock} className="mt-4 flex flex-col gap-3">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-center tracking-widest"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || pin.length !== 6}
          className="btn-accent rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
