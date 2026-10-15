"use client";

// The Resources panel on the Help page. Titles are always visible; the links open only for clubs that
// have paid (and admins). Everyone else sees a lock. The files themselves are also protected on the server.
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResourcesBox() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/resources/access")
      .then((r) => r.json())
      .then((j) => setAllowed(j.allowed === true))
      .catch(() => setAllowed(false));
  }, []);

  const link = "font-medium text-brand-navy underline";
  const locked = allowed === false;
  const Title = ({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) =>
    allowed ? (
      external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>{children}</a>
      ) : (
        <Link href={href} className={link}>{children}</Link>
      )
    ) : (
      <span className="font-medium text-gray-500">{locked ? "🔒 " : ""}{children}</span>
    );

  return (
    <section className="rounded-xl border border-brand-gold/40 bg-brand-goldLight/20 p-6">
      <h2 className="font-semibold text-brand-navy">Resources</h2>
      {locked && (
        <p className="mt-1 rounded-lg bg-white/60 px-3 py-2 text-sm text-gray-700">
          🔒 These resources unlock once your club has paid for a vacancy and it&apos;s live.{" "}
          <Link href="/club2coach/club" className="font-medium text-brand-navy underline">Go to your vacancies</Link>
        </p>
      )}
      <p className="mt-2 text-sm text-gray-600">
        <Title href="/help/manual">Navigating Difficult Conversations &amp; Scenarios</Title> — a practical guide
        covering parents, players, committees, sponsors, other coaches, new coaches, female coaches, goalkeeping
        coaches, weather calls, officials, club expectations, and keeping a healthy balance.
        {allowed && (
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
        <Title href="/api/resources/coach-interview-checklist.pdf" external>Interviewing a Coach — Checklist for Clubs</Title>{" "}
        — a one-page checklist to work through when interviewing a coach: sighting their current Licence/Diploma,
        confirming a valid WWCC, checking Play Football registration, and asking about any disciplinary history.
      </p>
    </section>
  );
}
