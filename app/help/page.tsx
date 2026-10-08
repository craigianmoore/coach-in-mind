import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-full bg-brand-goldLight/40 px-4 py-1.5 text-base font-semibold text-brand-navy transition hover:bg-brand-gold hover:text-white"
      >
        ← Back to Coach In Mind
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Help 2 Coach</h1>
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

        <section className="rounded-xl border border-brand-gold/40 bg-brand-goldLight/20 p-6">
          <h2 className="font-semibold text-brand-navy">Resources</h2>
          <p className="mt-1 text-sm text-gray-600">
            <Link href="/help/manual" className="font-medium text-brand-navy underline">
              Navigating Difficult Conversations &amp; Scenarios
            </Link>{" "}
            — a practical guide covering parents, players, committees, sponsors, other coaches,
            new coaches, female coaches, goalkeeping coaches, weather calls, officials, club
            expectations, and keeping a healthy balance. Browse it by topic, or{" "}
            <a
              href="/coach-influence-manual.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy underline"
            >
              download the PDF
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-gray-600">
            <a
              href="/coach-interview-checklist.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-navy underline"
            >
              Interviewing a Coach — Checklist for Clubs
            </a>{" "}
            — a one-page checklist to work through when interviewing a coach: sighting their
            current Licence/Diploma, confirming a valid WWCC, checking Play Football
            registration, and asking about any disciplinary history.
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
                A package of credits (1–3 for coaches, 1–5 for clubs; a coach credit = one application, a club credit = one advert) or, for
                mentors, mentee places (1, 2, 3, 5 or 10 at a time, from $100 each) that you can top up whenever you need more room. You're
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
                For clubs on Club 2 Coach, an advert runs for 90 days. If no coach was introduced in that time your
                credit is returned automatically so you can advertise again at no charge (or you can ask for a refund instead). If coaches were introduced and the role isn't filled, the advert ends and you advertise again with a new credit. If you run
                out of introductions before finding the right fit, you can buy more
                credits directly from your own profile or listing page at any time.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">What's the founding member offer?</p>
              <p className="mt-1 text-gray-600">
                The first 60 coaches to save a listing get one free credit, to use on either
                Club 2 Coach or Coach 2 Mentor (you choose — one per coach, and not for mentor
                profiles). Press Activate on your coach page when you're ready to start looking; the
                clock starts then (60 days) and we email you
                a week before it ends. Once all 60 places are taken the offer ends. Clubs
                have their own free first introduction.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Do my credits expire?</p>
              <p className="mt-1 text-gray-600">
                Credits in your bank never expire, but a used credit does. One credit = one
                application: press Activate and your listing is in matching for 60 days, then it ends and that credit is gone — to
                re-apply you use or buy another. To look for both a club and a mentor you activate
                both, one credit each; your credits are one bank shared across the two. Club credits belong to the advert: it runs 90 days, then ends. With no
                introduction the credit comes back automatically; if coaches were introduced it is used up
                and unused introductions don't carry over — to re-advertise, you use a new credit.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Can I get a refund?</p>
              <p className="mt-1 text-gray-600">
                Clubs: if no introduction is made in your 90 days, your credit is returned automatically (it
                doesn't expire) — or you can ask for a refund of that package instead from the Support page
                within 45 days of our email telling you it was returned. Coaches: if no introduction has been
                made within 90 days of pressing Activate, you can request a full refund from the Support page
                any time from day 90 until 45 days after that. This doesn't limit your rights under the
                Australian Consumer Law. Once at least one introduction has been made, the package is
                non-refundable, including any unused introductions in it.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">How do referral rewards work?</p>
              <p className="mt-1 text-gray-600">
                Share your referral code or link. When someone you refer makes their first payment
                you earn 1 free credit (2 if it's a club), up to 6 in total. You need a paid
                or founding listing to receive them, and a club can only earn one referral reward.
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
              <p className="font-medium text-gray-800">My listing is saved — why isn't it matching yet?</p>
              <p className="mt-1 text-gray-600">
                A listing or vacancy only joins matching once payment is confirmed (or a free or
                gifted introduction is applied). The confirmation email you receive when you save
                says what's still needed.
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
                Once a match is approved, you'll get an email and be able to see each other's contact
                details — coaches under "Your introductions" on their coach page, clubs under
                "Coaches introduced to you" on the vacancy. From there, it's up to you both —
                Coach In Mind's role ends at the introduction.
              </p>
            </div>
          </div>
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
