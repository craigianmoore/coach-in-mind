import Link from "next/link";

// This used to embed its own full copy of the mentor sign-up form and
// request-inbox UI — a second, older implementation living side by side
// with the real one at /coach2mentor/mentor, written to the same table
// but missing things the real one had (Terms agreement, FA# check, the
// B Licence/Diploma minimum, pay-now button). Since this page is the one
// linked from the main nav and the homepage, that meant most people
// signing up as a mentor went through the unguarded copy. Replaced with
// a plain hub, same pattern as /club2coach, so there's exactly one
// mentor form and one coach-seeking-a-mentor form to keep in sync.
export default function Coach2MentorHomePage() {
  return (
    <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2">
      <Link
        href="/coach2mentor/coach"
        className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <h2 className="text-lg font-bold">I'm a coach looking for a mentor</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tell us your career stage, what you want help with, and how
          you'd like to meet. We'll match you against mentors and share
          your details once there's a good fit.
        </p>
      </Link>
      <Link
        href="/coach2mentor/mentor"
        className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <h2 className="text-lg font-bold">I'm looking to mentor</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tell us your accreditation, specialisms, and how many coaches
          you can take on. We'll match you against coaches looking for a
          mentor like you.
        </p>
      </Link>
    </div>
  );
}
