"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/types/database";

function SupportForm() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      const p = data as Person;
      setPersonId(p.id);
      setName(p.full_name);
      setEmail(p.email);
    } else if (user?.email) {
      setEmail(user.email);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const { error: saveError } = await supabase.from("support_queries").insert({
      person_id: personId,
      name,
      email,
      message,
    });

    if (saveError) {
      setError(saveError.message);
      setSending(false);
      return;
    }

    // Best-effort email notification — the query is already safely
    // saved above regardless of whether this succeeds.
    try {
      await fetch("/api/support-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
    } catch {
      // Ignore — the query is already saved.
    }

    setSent(true);
    setSending(false);
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>;

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Thanks — we've got it</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your message has been sent to the Coach In Mind team. We'll get
          back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Report an issue</h1>
      <p className="mt-1 text-sm text-gray-600">
        Found a bug, have a question, or want to raise a concern? Send it
        through here — it goes straight to the Coach In Mind team.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Your name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Your email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">What's the issue?</label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Tell us what happened, what you expected, and anything else that would help us look into it."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="btn-accent self-start rounded-lg px-6 py-2 font-semibold disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

export default function SupportPage() {
  return (
    <AuthGuard>
      <SupportForm />
    </AuthGuard>
  );
}
