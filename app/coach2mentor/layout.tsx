import Link from "next/link";
import CoachInMindLogo from "@/components/CoachInMindLogo";

export default function Coach2MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-coach2mentor">
      <header style={{ backgroundColor: "var(--header-bg)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--header-text)" }}>
              Coach <span style={{ color: "var(--accent)" }}>2</span> Mentor
            </h1>
            <p className="text-sm text-white/70">Coach mentoring matching — Victoria</p>
            <nav className="mt-3 flex gap-4 text-sm font-medium text-white/90">
              <Link href="/coach2mentor/coach" className="hover:underline">
                Find a Mentor
              </Link>
              <Link href="/coach2mentor/mentor" className="hover:underline">
                Become a Mentor
              </Link>
              <Link href="/coach2mentor/admin" className="hover:underline">
                Admin
              </Link>
            </nav>
          </div>
          <CoachInMindLogo />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Disclaimer:</strong> This tool helps surface potential
          mentor–coach matches only — it does not guarantee a mentor will
          be available or a coach will find the right fit. Any mentoring
          fees, rates, or in-kind arrangements are negotiated and agreed
          directly between the mentor and coach once introduced. Coach In
          Mind does not process payments between mentors and coaches, and
          takes no responsibility or liability for the accuracy of
          information entered by users, or for the conduct, decisions, or
          outcomes of any mentor or coach using it.
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-16">{children}</main>
    </div>
  );
}
