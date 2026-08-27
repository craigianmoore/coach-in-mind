import Link from "next/link";
import CoachInMindLogo from "@/components/CoachInMindLogo";

export default function Club2CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-club2coach">
      <header style={{ backgroundColor: "var(--header-bg)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--header-text)" }}>
              Club <span className="text-white">2</span> Coach
            </h1>
            <p className="text-sm" style={{ color: "var(--header-text)" }}>
              Coach placement matching — Victoria
            </p>
            <nav className="mt-3 flex gap-4 text-sm font-medium" style={{ color: "var(--header-text)" }}>
              <Link href="/club2coach/coach" className="hover:underline">
                Find a Role
              </Link>
              <Link href="/club2coach/club" className="hover:underline">
                Advertise a Vacancy
              </Link>
              <Link href="/club2coach/admin" className="hover:underline">
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
          coach–club matches only — it does not guarantee a coach will
          find a role or a club will find a coach. Once a match is
          shared, it is up to the coach and club to make contact, verify
          each other's details, and reach their own arrangement. Coach In
          Mind takes no responsibility or liability for the accuracy of
          information entered by users, or for the conduct, decisions, or
          outcomes of any coach or club using it.
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-16">{children}</main>
    </div>
  );
}
