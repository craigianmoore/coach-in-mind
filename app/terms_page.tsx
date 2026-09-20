export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-xs text-gray-500">Last updated: [DATE — fill in before publishing]</p>

      <p className="mt-6">
        These Terms of Service ("Terms") govern your use of Coach In Mind,
        including Club 2 Coach and Coach 2 Mentor (together, the
        "Platform"), operated by Coach In Mind ("we", "us", "our"). By
        creating an account, you agree to these Terms and to our{" "}
        <a href="/privacy" className="text-brand-navy underline">
          Privacy Policy
        </a>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">1. What Coach In Mind is</h2>
      <p className="mt-2">
        Coach In Mind is an introduction and matching service. We help
        connect football coaches, clubs, and mentors based on the
        information they provide us. We do not employ coaches, run
        clubs, or provide mentoring ourselves.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">2. No guarantee of a match or outcome</h2>
      <p className="mt-2">
        We use the information you provide to suggest and, in some
        cases, introduce you to other users. We do not guarantee that
        you will be matched, that a match will lead to a coaching role,
        mentoring relationship, or any other outcome, or that any match
        will be the best possible one available. Paying for a package
        of introductions entitles you to that number of introductions
        being attempted in good faith — it is not a guarantee that any
        of them will result in a placement, agreement, or ongoing
        relationship.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">3. Accuracy of information</h2>
      <p className="mt-2">
        You are responsible for the accuracy of the information you
        provide, including your accreditation, availability, and any
        other details in your profile or listing. We do not
        independently verify accreditation, licences, identity, or any
        other claim made by a user, except where we say otherwise. We
        take no responsibility for the accuracy of information entered
        by users, or for the conduct, decisions, or outcomes of any
        coach, club, or mentor using the Platform.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">
        4. Coach registration and Working With Children Checks
      </h2>
      <p className="mt-2">
        Many roles advertised or sought through Coach In Mind involve
        coaching children and young people. Separately from Coach In
        Mind, Football Australia requires every coach, nationwide, to
        register each season through Play Football — the official
        national registration platform used by Football Australia and
        every state and territory Member Federation (for example
        Football Victoria, Football NSW, Football Queensland, and
        their equivalents). Registering through Play Football
        includes holding a current Working With Children Check or the
        equivalent state-based check (these go by different names in
        different states and territories, but the same requirement
        applies wherever coaching a minor is involved). Coach In Mind
        does not collect, verify, or hold this Play Football
        registration or check information for any user, and plays no
        part in a coach's registration.
      </p>
      <p className="mt-2">
        <strong>
          It is the responsibility of the engaging club — not Coach In
          Mind — to confirm that any coach they engage is properly
          registered through Play Football with the relevant Member
          Federation for that season, including holding a valid and
          current Working With Children Check (or the applicable state
          equivalent) where one is required for the role, before that
          coach begins coaching.
        </strong>{" "}
        It is the responsibility of the coach to be, and remain,
        properly registered through Play Football and to hold and be
        able to produce a valid check where required. Coach In Mind is
        not a party to the arrangement between a coach and a club, and
        takes no responsibility for a club's or coach's compliance with
        Play Football registration, Member Federation requirements,
        working-with-children obligations, or other child-safety
        legislation.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">5. Payments and refunds</h2>
      <p className="mt-2">
        Some listings require payment before they are included in
        matching. Payments are processed by Stripe; we do not store
        your card details. Fees paid for introduction packages cover
        our effort in attempting to find and share suitable matches —
        see Section 2 above regarding outcomes. [REFUND POLICY —
        confirm with a lawyer and your own business decision before
        publishing: e.g. under what circumstances, if any, a refund is
        available if no introductions are made within a stated period.]
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">6. Your conduct</h2>
      <p className="mt-2">
        You agree to provide accurate information, to use the Platform
        only for its intended purpose of seeking or offering a genuine
        coaching, club, or mentoring connection, and not to use contact
        details shared with you through the Platform for any purpose
        unrelated to that connection.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">7. Account suspension and termination</h2>
      <p className="mt-2">
        We may suspend or remove a listing or account that we
        reasonably believe contains false information, breaches these
        Terms, or poses a risk to another user, including a child-safety
        risk.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">8. Limitation of liability</h2>
      <p className="mt-2">
        To the maximum extent permitted by law, Coach In Mind is not
        liable for any loss or damage arising from a match, introduction,
        or the conduct of any user, including any coaching arrangement,
        employment relationship, or mentoring relationship that results
        from use of the Platform. Nothing in these Terms excludes any
        guarantee, right, or remedy you have under the Australian
        Consumer Law that cannot lawfully be excluded.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">9. Changes to these Terms</h2>
      <p className="mt-2">
        We may update these Terms from time to time. Continued use of
        the Platform after an update means you accept the revised
        Terms.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">10. Contact</h2>
      <p className="mt-2">
        Questions about these Terms can be sent via the{" "}
        <a href="/support" className="text-brand-navy underline">
          Support
        </a>{" "}
        page.
      </p>
    </div>
  );
}
