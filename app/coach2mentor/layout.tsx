import Link from "next/link";
import ViewModeShell from "@/components/ViewModeShell";
import CoachInMindLogo from "@/components/CoachInMindLogo";

export default function Coach2MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-coach2mentor">
      <header style={{ background: "var(--header-bg)" }} className="shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--header-text)" }}>
              Coach <span style={{ color: "var(--accent)" }}>2</span> Mentor
            </h1>
            <p className="text-sm font-medium tracking-wide text-white/70">
              Coach &amp; Mentor Matching
            </p>
            <nav className="mt-4 flex gap-3 text-sm font-semibold text-white/90">
              <Link
                href="/coach2mentor/coach"
                className="rounded-full bg-white/10 px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/20 hover:shadow"
              >
                Find a Mentor
              </Link>
              <Link
                href="/coach2mentor/mentor"
                className="rounded-full bg-white/10 px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/20 hover:shadow"
              >
                Become a Mentor
              </Link>
            </nav>
          </div>
          {/* Doubles as the admin entry point — deliberately unlabelled */}
          <Link href="/coach2mentor/admin" className="transition hover:-translate-y-0.5 hover:opacity-90">
            <CoachInMindLogo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="rounded-lg border border-brand-navy/10 bg-white/60 p-3 text-xs leading-relaxed text-brand-navy/70">
          <span className="font-semibold text-brand-navy">A quick note:</span> This tool helps
          surface potential mentor–coach matches only — it does not guarantee a mentor will be
          available or a coach will find the right fit. Any mentoring fees, rates, or in-kind
          arrangements are negotiated and agreed directly between the mentor and coach once
          introduced. Coach In Mind does not process payments between mentors and coaches, and
          takes no responsibility or liability for the accuracy of information entered by users,
          or for the conduct, decisions, or outcomes of any mentor or coach using it.
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <ViewModeShell>{children}</ViewModeShell>
      </main>
    </div>
  );
}
