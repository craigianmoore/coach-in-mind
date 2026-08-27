import Link from "next/link";

export default function Coach2MentorHomePage() {
  return (
    <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2">
      <Link
        href="/coach2mentor/coach"
        className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <h2 className="text-lg font-bold">I'm a coach looking for a mentor</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tell us where you're at and what you want to develop. Browse
          mentors and send a request — they'll accept if it's a fit.
        </p>
      </Link>
      <Link
        href="/coach2mentor/mentor"
        className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <h2 className="text-lg font-bold">I'd like to become a mentor</h2>
        <p className="mt-2 text-sm text-gray-600">
          Share your experience and areas of expertise. Coaches searching
          for a mentor can find you and send a request.
        </p>
      </Link>
    </div>
  );
}
