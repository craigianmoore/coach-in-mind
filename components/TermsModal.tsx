"use client";

// A hovering (in-page) Terms & Privacy consent dialog, used anywhere
// someone needs to agree before creating an account or activating a
// role — signup, and every Club2Coach/Coach2Mentor listing form.
// Deliberately shows the content in-page rather than linking out to
// /terms and /privacy in a new tab, so filling in a form is never
// interrupted by navigating away from it.
import { useState } from "react";

interface TermsModalProps {
  open: boolean;
  onAgree: () => void;
  onClose: () => void;
}

export default function TermsModal({ open, onAgree, onClose }: TermsModalProps) {
  const [tab, setTab] = useState<"terms" | "privacy">("terms");
  const [readToBottom, setReadToBottom] = useState(false);

  if (!open) return null;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setReadToBottom(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Terms of Service &amp; Privacy Policy</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b px-6">
          <button
            type="button"
            onClick={() => {
              setTab("terms");
              setReadToBottom(false);
            }}
            className={`px-3 py-2 text-sm font-semibold ${
              tab === "terms" ? "border-b-2 border-brand-navy text-brand-navy" : "text-gray-500"
            }`}
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("privacy");
              setReadToBottom(false);
            }}
            className={`px-3 py-2 text-sm font-semibold ${
              tab === "privacy" ? "border-b-2 border-brand-navy text-brand-navy" : "text-gray-500"
            }`}
          >
            Privacy Policy
          </button>
        </div>

        <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed text-gray-700">
          {tab === "terms" ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
          <p className="text-xs text-gray-500">
            {readToBottom
              ? "You've reached the end — you can agree below."
              : "Scroll to the bottom to enable Agree."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAgree}
              disabled={!readToBottom}
              className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              I agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content mirrors /app/terms/page.tsx and /app/privacy/page.tsx —
// kept as plain text/paragraphs here (not imported from those pages
// directly, since those are full page components with their own
// layout wrapper) so update BOTH places if the wording changes.
function TermsContent() {
  return (
    <>
      <p className="text-xs text-gray-500">Last updated: [DATE — fill in before publishing]</p>
      <p className="mt-4">
        These Terms of Service ("Terms") govern your use of Coach In Mind, including Club 2 Coach and Coach 2
        Mentor (together, the "Platform"), operated by Coach In Mind ("we", "us", "our"). By creating an account
        or activating any role, you agree to these Terms and to our Privacy Policy.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">1. What Coach In Mind is</h3>
      <p className="mt-2">
        Coach In Mind is an introduction and matching service. We help connect football coaches, clubs, and
        mentors based on the information they provide us. We do not employ coaches, run clubs, or provide
        mentoring ourselves.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">2. No guarantee of a match or outcome</h3>
      <p className="mt-2">
        We do not guarantee that you will be matched, that a match will lead to a placement or relationship, or
        that any match will be the best possible one available. Paying for a package of introductions entitles
        you to that number of introductions being attempted in good faith — not a guarantee of any resulting
        agreement.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">3. Accuracy of information</h3>
      <p className="mt-2">
        You are responsible for the accuracy of the information you provide. We do not independently verify
        accreditation, licences, identity, or any other claim made by a user, except where we say otherwise. We
        take no responsibility for the accuracy of information entered by users, or for the conduct, decisions,
        or outcomes of any coach, club, or mentor using the Platform.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">4. Coach registration and Working With Children Checks</h3>
      <p className="mt-2">
        Football Australia requires every coach, nationwide, to register each season through Play Football —
        the official national registration platform used by Football Australia and every state and territory
        Member Federation. Registering through Play Football includes holding a current Working With Children
        Check or the equivalent state-based check. Coach In Mind does not collect, verify, or hold this
        registration or check information for any user, and plays no part in a coach's registration.
      </p>
      <p className="mt-2">
        <strong>
          It is the responsibility of the engaging club — not Coach In Mind — to confirm that any coach they
          engage is properly registered through Play Football with the relevant Member Federation for that
          season, including holding a valid and current Working With Children Check (or the applicable state
          equivalent) where one is required, before that coach begins coaching.
        </strong>{" "}
        It is the responsibility of the coach to be, and remain, properly registered and to hold and be able to
        produce a valid check where required. Coach In Mind is not a party to the arrangement between a coach
        and a club, and takes no responsibility for compliance with Play Football registration, Member
        Federation requirements, working-with-children obligations, or other child-safety legislation.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">5. Payments and refunds</h3>
      <p className="mt-2">
        Some listings require payment before they are included in matching. Payments are processed by Stripe;
        we do not store your card details. [Full refund policy — see the complete Terms of Service at /terms.]
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">6–10.</h3>
      <p className="mt-2">
        Your conduct, account suspension, limitation of liability, changes to these Terms, and how to contact
        us are all covered in full at{" "}
        <a href="/terms" target="_blank" className="text-brand-navy underline">
          /terms
        </a>
        .
      </p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-gray-500">Last updated: [DATE — fill in before publishing]</p>
      <p className="mt-4">
        This Privacy Policy explains how Coach In Mind ("we", "us", "our") collects, uses, and protects your
        personal information. We handle your information in line with the Australian Privacy Principles under
        the Privacy Act 1988 (Cth).
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">1. What we collect</h3>
      <p className="mt-2">
        Your name, mobile number, email, coaching accreditation, region, gender (where provided), listing
        details relevant to your role, and payment information (processed directly by Stripe — we don't store
        card details ourselves).
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">2. How we use it</h3>
      <p className="mt-2">
        To match you with relevant coaches, clubs, or mentors; to share your contact details with a confirmed
        match only; to process payments; to contact you about your account or a match; and to improve the
        Platform.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">3. When we share it</h3>
      <p className="mt-2">
        Your contact details are kept private and only shared with a specific matched coach, club, or mentor
        once that match has been confirmed. A Coach 2 Mentor mentor's profile and bio may be visible to coaches
        browsing for a mentor, if that mentor has opted in. We share payment information with Stripe only to
        process payments, and never sell your personal information.
      </p>

      <h3 className="mt-6 font-semibold text-gray-900">4–8.</h3>
      <p className="mt-2">
        Data security, access/correction/deletion of your data, children's information, changes to this
        Policy, and how to contact us are all covered in full at{" "}
        <a href="/privacy" target="_blank" className="text-brand-navy underline">
          /privacy
        </a>
        .
      </p>
    </>
  );
}
