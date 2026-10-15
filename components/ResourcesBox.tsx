"use client";

// The Resources panel on the Help page. Titles are always visible; the links open only for clubs that
// have paid (and admins). Everyone else sees a lock. The files themselves are also protected on the server.
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResourcesBox() {
  const [acc, setAcc] = useState<{ checklist: boolean; manual: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/resources/access")
      .then((r) => r.json())
      .then((j) => setAcc({ checklist: j.checklist === true, manual: j.manual === true }))
      .catch(() => setAcc({ checklist: false, manual: false }));
  }, []);

  const link = "font-medium text-brand-navy underline";
  const Title = ({ href, children, external, ok }: { href: string; children: React.ReactNode; external?: boolean; ok: boolean }) =>
    ok ? (
      external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>{children}</a>
      ) : (
        <Link href={href} className={link}>{children}</Link>
      )
    ) : (
      <span className="font-medium text-gray-500">{acc ? "🔒 " : ""}{children}</span>
    );

  return (
    <section className="rounded-xl border border-brand-gold/40 bg-brand-goldLight/20 p-6">
      <h2 className="font-semibold text-brand-navy">Resources</h2>
      {acc && (!acc.manual || !acc.checklist) && (
        <p className="mt-1 rounded-lg bg-white/60 px-3 py-2 text-sm text-gray-700">
          🔒 Resources unlock once you&apos;ve paid for something. Coaches get the guide when they buy credits; clubs get
          both once a paid vacancy is live. A free credit doesn&apos;t count.
        </p>
      )}
      <p className="mt-2 text-sm text-gray-600">
        <Title href="/help/manual" ok={acc?.manual === true}>Navigating Difficult Conversations &amp; Scenarios</Title> — a practical guide
        covering parents, players, committees, sponsors, other coaches, new coaches, female coaches, goalkeeping
        coaches, weather calls, officials, club expectations, and keeping a healthy balance.
        {acc?.manual && (
          <>
            {" "}Browse it by topic, or{" "}
            <a href="/api/resources/coach-influence-manual.pdf" target="_blank" rel="noopener noreferrer" className={link}>
              download the PDF
            </a>
            .
          </>
        )}
      </p>
      <p className="mt-3 text-sm text-gray-600">
        <Title href="/api/resources/coach-interview-checklist.pdf" external ok={acc?.checklist === true}>Interviewing a Coach — Checklist for Clubs</Title>{" "}
        — a one-page checklist to work through when interviewing a coach: sighting their current Licence/Diploma,
        confirming a valid WWCC, checking Play Football registration, and asking about any disciplinary history.
      </p>
    </section>
  );
}
