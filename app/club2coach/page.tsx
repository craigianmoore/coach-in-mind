import Link from "next/link";

export default function Club2CoachHomePage() {
  return (
    <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2">
      <Link
        href="/club2coach/coach"
        className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <h2 className="text-lg font-bold">I'm a coach looking for a role</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tell us your accreditation, preferred level, age groups and
          regions. We'll match you against open vacancies and share your
          details with a club once there's a good fit.
        </p>
      </Link>
      <Link
        href="/club2coach/club"
        className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
      >
        <h2 className="text-lg font-bold">I'm a club with a vacancy</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tell us about the role — level, age group, location, salary
          range, required accreditation. We'll match you against coaches
          looking for a role like this one.
        </p>
      </Link>
    </div>
  );
}
