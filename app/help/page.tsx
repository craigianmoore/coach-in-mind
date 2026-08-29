import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-gray-500 hover:text-brand-navy">
        ← Back to Coach In Mind
      </Link>

      <h1 className="mt-4 text-2xl font-bold">H2C — Help 2 Coach</h1>
      <p className="mt-2 text-sm text-gray-600">
        Support, guidance, and resources for coaches, clubs, and mentors using Coach In Mind.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Frequently asked questions</h2>
          <p className="mt-1 text-sm text-gray-500">
            [Add your FAQ content here — e.g. how matching works, payment questions, how long
            introductions take, what happens if a match doesn't work out.]
          </p>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Getting started guides</h2>
          <p className="mt-1 text-sm text-gray-500">
            [Add step-by-step guidance here for each role — e.g. "Setting up your coach profile",
            "Advertising your first vacancy", "What to expect after you're matched".]
          </p>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Coaching resources</h2>
          <p className="mt-1 text-sm text-gray-600">
            <a
              href="/coach-influence-manual.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy underline"
            >
              Navigating Difficult Conversations &amp; Scenarios
            </a>{" "}
            — a practical guide covering parents, players, committees, sponsors, other coaches,
            new coaches, female coaches, goalkeeping coaches, weather calls, officials, club
            expectations, and keeping a healthy balance.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            [Add further resources here — accreditation pathways, Working With Children Check
            information, and other useful links.]
          </p>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Still need help?</h2>
          <p className="mt-1 text-sm text-gray-600">
            If you can't find what you're after, use{" "}
            <Link href="/support" className="font-medium text-brand-navy underline">
              Report an Issue
            </Link>{" "}
            and it'll come straight to the Coach In Mind team.
          </p>
        </section>
      </div>
    </div>
  );
}
