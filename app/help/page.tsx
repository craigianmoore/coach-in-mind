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
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="font-semibold">Disclaimer — Club 2 Coach &amp; Coach 2 Mentor</h2>
          <p className="mt-2 text-sm">
            These tools help facilitate potential matches only — they do not guarantee a coach
            will find a role or mentor, a club will find a coach, or a mentor will find a mentee.
            Once a match is approved, it is up to the people involved to make contact, verify each
            other's details, and reach their own arrangement. Coach In Mind takes no
            responsibility or liability for the accuracy of information entered by users, or for
            the conduct, decisions, or outcomes of anyone using it.
          </p>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Frequently asked questions</h2>
          <div className="mt-3 flex flex-col gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-800">How does matching work?</p>
              <p className="mt-1 text-gray-600">
                Coach In Mind reviews and curates every match — there's no public browsing on
                either side. When you pay for a package, we score you against active vacancies,
                mentors, or coaches (depending on your role) and suggest the best fits. Every
                suggestion is reviewed before it goes live — contact details are only shared once
                a match is approved.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">What does a match percentage actually mean?</p>
              <p className="mt-1 text-gray-600">
                It's not a school grade — very few matches hit the high 90s, because it takes
                every single factor lining up at once to get there. As a rough guide: <b>70%+</b>{" "}
                is a strong, obvious fit; <b>50–70%</b> is solid and workable, usually with one or
                two factors neutral rather than wrong; <b>30–50%</b> means there are real gaps
                worth a closer look; and <b>under 30%</b> usually means several things don't line
                up. A lower score doesn't always mean a weak candidate either — sometimes it's one
                specific mismatch (like being in the wrong state) pulling down an otherwise great
                fit.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">What am I actually paying for?</p>
              <p className="mt-1 text-gray-600">
                A package of introductions (1–3 for coaches and mentors, 1–5 for clubs) or, for
                mentors, a capacity package based on how many mentees you can take on. You're
                paying for a curated introduction, not a guaranteed outcome — what happens after
                you're introduced is between you and the other party.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">How long does an introduction take?</p>
              <p className="mt-1 text-gray-600">
                It depends on how many active, paid listings there are to match against on the
                other side. Once you're paid and active, Coach In Mind reviews matches regularly —
                if there's nothing to match against yet, you'll be matched as soon as a suitable
                listing appears.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">What happens if a match doesn't work out?</p>
              <p className="mt-1 text-gray-600">
                For clubs and coaches on Club 2 Coach, if a role isn't filled within the one-month
                contact window, the vacancy simply expires — you can advertise it again. If you run
                out of introductions before finding the right fit, you can top up for more
                directly from your own profile or listing page at any time.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                Can I change my criteria if I'm not getting good matches?
              </p>
              <p className="mt-1 text-gray-600">
                Yes — you can edit your vacancy or profile criteria at any time. Coach In Mind will
                reassess against your updated details next time matching runs.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Getting started guides</h2>
          <div className="mt-3 flex flex-col gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-800">Setting up your profile</p>
              <p className="mt-1 text-gray-600">
                After creating your account, fill in your profile on the "My Profile" page — this
                shared identity is used whether you're a coach, club, or mentor. Then choose which
                service you want from the options shown: Club 2 Coach or Coach 2 Mentor.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Advertising a vacancy (clubs)</p>
              <p className="mt-1 text-gray-600">
                From Club 2 Coach, click "Advertise a Vacancy," fill in your requirements, and
                choose a package. Coach In Mind will be in touch about payment — once confirmed,
                your vacancy activates and matching begins automatically.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Finding a role or mentor (coaches)</p>
              <p className="mt-1 text-gray-600">
                Set up your profile with what you're looking for, choose a package, and once
                payment's confirmed, Coach In Mind will introduce you to your best-fitting matches.
                On Coach 2 Mentor, you can also set your own personal priorities to shape how
                you're matched.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Offering to mentor</p>
              <p className="mt-1 text-gray-600">
                Set up your mentor profile, choose your mentee capacity, and once paid, you'll
                start receiving match requests on your own dashboard — accept or decline each one
                individually.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">What to expect after you're matched</p>
              <p className="mt-1 text-gray-600">
                Once a match is approved, you'll be able to see each other's contact details.
                From there, it's up to you both — Coach In Mind's role ends at the introduction.
              </p>
            </div>
          </div>
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
