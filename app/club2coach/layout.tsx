import Link from "next/link";
import ViewModeShell from "@/components/ViewModeShell";
import CoachInMindLogo from "@/components/CoachInMindLogo";

export default function Club2CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-club2coach">
      <header style={{ background: "var(--header-bg)" }} className="shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--header-text)" }}>
              Club <span className="text-white">2</span> Coach
            </h1>
            <p className="text-sm font-medium tracking-wide" style={{ color: "var(--header-text)" }}>
              Club &amp; Coach Matching
            </p>
            <nav className="mt-4 flex gap-3 text-sm font-semibold" style={{ color: "var(--header-text)" }}>
              <Link
                href="/club2coach/coach"
                className="rounded-full bg-black/10 px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-black/20 hover:shadow"
              >
                Find a Coaching Role
              </Link>
              <Link
                href="/club2coach/club"
                className="rounded-full bg-black/10 px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-black/20 hover:shadow"
              >
                Advertise a Coaching Vacancy
              </Link>
            </nav>
          </div>
          {/* Doubles as the admin entry point — deliberately unlabelled */}
          <Link href="/club2coach/admin" className="transition hover:-translate-y-0.5 hover:opacity-90">
            <CoachInMindLogo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="rounded-lg border border-brand-gold/20 bg-white/70 p-3 text-xs leading-relaxed text-brand-navy/70">
          <span className="font-semibold text-brand-navy">A quick note:</span> This tool helps
          surface potential coach–club matches only — it does not guarantee a coach will find a
          role or a club will find a coach. Once a match is shared, it is up to the coach and
          club to make contact, verify each other&rsquo;s details, and reach their own
          arrangement. Coach In Mind takes no responsibility or liability for the accuracy of
          information entered by users, or for the conduct, decisions, or outcomes of any coach
          or club using it.
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <ViewModeShell>{children}</ViewModeShell>
      </main>
    </div>
  );
}
