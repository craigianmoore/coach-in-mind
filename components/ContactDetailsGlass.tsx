// Read-only "behind glass" view of the signed-in person's contact details
// at the top of a listing form: you can see them, but not touch them from
// here. They're only editable on the account profile page.
export default function ContactDetailsGlass({
  fullName,
  email,
  mobile,
  who = "the other party",
}: {
  fullName: string;
  email: string;
  mobile: string;
  who?: string;
}) {
  return (
    <div
      className="relative mt-3 cursor-not-allowed select-none overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br from-slate-200/60 to-slate-300/40 px-4 py-3 text-sm shadow-inner backdrop-blur-sm"
      aria-label="Your contact details (read only)"
      title="Read only — edit these on your account profile"
    >
      {/* soft glass sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span aria-hidden>🔒</span> Your contact details
        </p>
        <p className="mt-1 font-medium text-slate-800">{fullName}</p>
        <p className="text-slate-700">
          {email} · {mobile}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          This is what {who} sees once you&apos;re matched. To change it, update your{" "}
          <a href="/profile" className="cursor-pointer select-text font-semibold text-blue-700 underline">
            account profile
          </a>
          .
        </p>
      </div>
    </div>
  );
}
