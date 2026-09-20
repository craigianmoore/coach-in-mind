export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-xs text-gray-500">Last updated: [DATE — fill in before publishing]</p>

      <p className="mt-6">
        This Privacy Policy explains how Coach In Mind ("we", "us",
        "our") collects, uses, and protects your personal information
        when you use Club 2 Coach and Coach 2 Mentor (together, the
        "Platform"). We handle your information in line with the
        Australian Privacy Principles under the Privacy Act 1988 (Cth).
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">1. What we collect</h2>
      <p className="mt-2">We collect the information you give us directly, including:</p>
      <ul className="mt-2 list-disc pl-5">
        <li>Your name, mobile number, and email address</li>
        <li>Your coaching accreditation, region, and gender (where provided)</li>
        <li>
          Listing details relevant to your role — for example, a
          coach's preferred competition levels and salary expectations,
          or a club's vacancy details
        </li>
        <li>Payment information, processed directly by Stripe — we do not store your card details ourselves</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">2. How we use it</h2>
      <p className="mt-2">We use your information to:</p>
      <ul className="mt-2 list-disc pl-5">
        <li>Match you with relevant coaches, clubs, or mentors</li>
        <li>Share your contact details with another user, but only once a match has been reviewed and confirmed</li>
        <li>Process payments for paid listings</li>
        <li>Contact you about your account or a match</li>
        <li>Improve the Platform</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">3. When we share it</h2>
      <p className="mt-2">
        Your contact details (mobile number and email) are kept private
        and are never shown to another user by default. They are only
        shared with a specific matched coach, club, or mentor once that
        match has been confirmed — either by our team reviewing it, or
        automatically if you've opted into automatic matching, as
        described in the Platform itself. A Coach 2 Mentor mentor's
        profile and bio (not their contact details) may be visible to
        coaches browsing for a mentor, if that mentor has opted in to
        this.
      </p>
      <p className="mt-2">
        We share payment information with Stripe, our payment
        processor, solely to process payments. We do not sell your
        personal information to third parties.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">4. Data security</h2>
      <p className="mt-2">
        Your information is stored using Supabase, with access
        controls that restrict who can see it — including a
        requirement that only an authenticated administrator session
        can access data across all users. We take reasonable steps to
        protect your information, but no online service can guarantee
        complete security.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">5. Access, correction, and deletion</h2>
      <p className="mt-2">
        You can view and update most of your own information directly
        in your profile and listings. To request a copy of your data,
        a correction, or deletion of your account, contact us via the{" "}
        <a href="/support" className="text-brand-navy underline">
          Support
        </a>{" "}
        page.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">6. Children's information</h2>
      <p className="mt-2">
        The Platform is intended for adults seeking or offering
        coaching, club, or mentoring services. We do not knowingly
        collect personal information from children. (See our{" "}
        <a href="/terms" className="text-brand-navy underline">
          Terms of Service
        </a>{" "}
        regarding Play Football registration and Working With Children
        Check responsibilities for coaches working with young
        players.)
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">7. Changes to this Policy</h2>
      <p className="mt-2">
        We may update this Privacy Policy from time to time. Continued
        use of the Platform after an update means you accept the
        revised Policy.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">8. Contact</h2>
      <p className="mt-2">
        Questions about this Policy, or a request relating to your
        personal information, can be sent via the{" "}
        <a href="/support" className="text-brand-navy underline">
          Support
        </a>{" "}
        page.
      </p>
    </div>
  );
}
