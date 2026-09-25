import Link from "next/link";
import CoachInMindLogo from "@/components/CoachInMindLogo";

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <div className="bg-brand-navy pb-24 pt-12 text-white sm:pt-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center">
          <CoachInMindLogo size={130} />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-goldLight">
            Australian football, matched properly
          </p>
          <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl md:text-5xl">
            Stop relying on the group chat to fill a coaching role
          </h1>
          <p className="max-w-xl text-white/80">
            Coach In Mind matches accredited coaches with clubs looking for
            exactly what they offer — no scrambling, no missed
            opportunities.
          </p>
        </div>
      </div>

      {/* PAIN / CTA CARDS — overlaps the hero */}
      <div className="mx-auto -mt-14 grid max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-2">
        <Link
          href="/club2coach"
          className="flex flex-col gap-4 rounded-2xl bg-white p-8 text-left shadow-xl ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-goldLight/25">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8935A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7a2 2 0 0 1 2-2h4l2-2h2l2 2h4a2 2 0 0 1 2 2v14" /><path d="M3 21h18" /><path d="M9 21v-6h6v6" /></svg>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
            For clubs
          </span>
          <h2 className="text-2xl font-bold leading-snug text-brand-navy">
            Every season, the same scramble
          </h2>
          <p className="flex-grow text-sm leading-relaxed text-gray-600">
            A coach decides not to coach the next season. Your committee
            spends weeks chasing word-of-mouth leads and posting in
            Facebook groups — and half the candidates aren&rsquo;t even
            qualified for the level. Trials and the season creep closer.
          </p>
          <span className="mt-1 self-start rounded-lg bg-brand-navy px-6 py-3 text-sm font-bold text-white">
            Find a coach for my club
          </span>
        </Link>

        <Link
          href="/coach2mentor"
          className="flex flex-col gap-4 rounded-2xl bg-white p-8 text-left shadow-xl ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-silverLight/40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8F97A3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-silver">
            For coaches
          </span>
          <h2 className="text-2xl font-bold leading-snug text-brand-navy">
            The roles are out there. You just can&rsquo;t see them
          </h2>
          <p className="flex-grow text-sm leading-relaxed text-gray-600">
            Most vacancies never get advertised publicly — they&rsquo;re
            filled through someone&rsquo;s mate, or a committee
            member&rsquo;s phone contacts. Meanwhile you&rsquo;re sitting
            on a licence and season after season of experience, ready to
            coach.
          </p>
          <span className="mt-1 self-start rounded-lg bg-brand-navy px-6 py-3 text-sm font-bold text-white">
            Find a role near me
          </span>
        </Link>
      </div>

      {/* Create account / log in */}
      <div className="mt-10 flex justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white hover:bg-brand-navyLight"
        >
          Create your account
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-brand-navy/30 px-6 py-3 font-semibold text-brand-navy hover:bg-brand-navy/5"
        >
          Log in
        </Link>
      </div>

      {/* HOW IT WORKS */}
      <div className="mx-auto mt-24 max-w-5xl px-4 pb-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
          How it works
        </p>
        <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
          One profile. Real matches.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF6A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
            </span>
            <p className="text-xs font-bold tracking-wide text-gray-400">STEP 1</p>
            <h3 className="text-base font-bold text-brand-navy">Build your profile</h3>
            <p className="max-w-[240px] text-sm text-gray-500">
              Accreditation, experience, availability, preferred level and
              region — for a club vacancy or a coaching role.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF6A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </span>
            <p className="text-xs font-bold tracking-wide text-gray-400">STEP 2</p>
            <h3 className="text-base font-bold text-brand-navy">Get matched</h3>
            <p className="max-w-[240px] text-sm text-gray-500">
              We score against accreditation, level, geography and
              availability — not a swipe, a proper fit.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF6A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>
            </span>
            <p className="text-xs font-bold tracking-wide text-gray-400">STEP 3</p>
            <h3 className="text-base font-bold text-brand-navy">Connect directly</h3>
            <p className="max-w-[240px] text-sm text-gray-500">
              A club receives the introduction, or a coach hears back from
              a mentor — no chasing group chats.
            </p>
          </div>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div className="mt-20 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 bg-[#F3EFE6] px-4 py-6 text-center">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          Accredited coaches only
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11Z" /></svg>
          Built on Australia&rsquo;s coaching accreditation ladder
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Sign-up required — no public browsing
        </span>
      </div>

      {/* TWO PRODUCTS */}
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
          Two products, one platform
        </p>
        <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
          Whatever the role, one login
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl bg-brand-navy p-8 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-goldLight">
              Club2Coach
            </span>
            <h3 className="text-xl font-bold text-white">Clubs ↔ Coaches</h3>
            <p className="flex-grow text-sm leading-relaxed text-white/70">
              Admin-curated matching for head coach, assistant and
              technical director vacancies — scored on accreditation,
              level, age group and region.
            </p>
            <Link href="/club2coach" className="text-sm font-bold text-brand-goldLight hover:underline">
              Explore Club2Coach →
            </Link>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-brand-navy p-8 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-silverLight">
              Coach2Mentor
            </span>
            <h3 className="text-xl font-bold text-white">Coaches ↔ Mentors</h3>
            <p className="flex-grow text-sm leading-relaxed text-white/70">
              Browse mentor profiles directly, send a request, and connect
              — matched on specialism, career stage and availability.
            </p>
            <Link href="/coach2mentor" className="text-sm font-bold text-brand-silverLight hover:underline">
              Explore Coach2Mentor →
            </Link>
          </div>
        </div>
      </div>

      {/* SUCCESS STORY PLACEHOLDER */}
      <div className="mx-auto max-w-5xl px-4 pb-24">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 p-8 text-center sm:flex-row sm:items-center sm:text-left">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B8935A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" /></svg>
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Success stories — coming soon
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              [First club placement story] — a quote from the club and the
              coach on how the match came together, replacing this
              placeholder once the first season&rsquo;s results are in.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex flex-col items-center justify-between gap-4 bg-brand-navy px-4 py-8 text-white sm:flex-row">
        <div className="flex items-center gap-3">
          <CoachInMindLogo size={44} />
          <span className="text-sm font-bold tracking-wide">COACH IN MIND</span>
        </div>
        <p className="text-xs text-white/50">
          Matching coaches and clubs across Australia.
        </p>
        <p className="text-xs text-white/50">© 2026 Coach In Mind</p>
      </div>
    </div>
  );
}
