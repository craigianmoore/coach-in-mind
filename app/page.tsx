import FoundingBanner from "@/components/FoundingBanner";
import Link from "next/link";
import CoachInMindLogo from "@/components/CoachInMindLogo";

// Flip to true once there is a real placement story to show; the
// section markup further down is kept ready to go.
const SHOW_SUCCESS_STORIES = false;

// Solutions section: each pain is paired with its fix, per audience.
const SOLUTIONS = [
  {
    who: "Clubs",
    tone: "text-[#7A5420]",
    pairs: [
      {
        pain: "Weeks of chasing names and waiting on replies",
        fix: "We match your vacancy against coaches who are actively looking, so introductions come to you.",
      },
      {
        pain: "Settling for someone who isn\u2019t quite what you hoped",
        fix: "Every match is scored on accreditation, level, age group and region, and reviewed by our team before you see it.",
      },
      {
        pain: "Starting again from scratch",
        fix: "If no coach is introduced in 90 days, your credit is returned automatically.",
      },
    ],
  },
  {
    who: "Coaches",
    tone: "text-[#3F4753]",
    pairs: [
      {
        pain: "Roles filled through someone\u2019s mate before you ever see them",
        fix: "Clubs bring their vacancies to us. We introduce you to the best fits for your accreditation, level and region.",
      },
      {
        pain: "Sending applications into the void",
        fix: "Your accreditation is up front, and contact details are only shared once a match is approved \u2014 you\u2019re introduced as a fit, not another name in a pile.",
      },
      {
        pain: "Working it out on your own",
        fix: "Coach2Mentor offers a chance to pair you with a verified mentor on specialism and career stage. They accept, then you connect.",
      },
    ],
  },
  {
    who: "Mentors",
    tone: "text-brand-navy",
    pairs: [
      {
        pain: "Good coaches who never think to ask",
        fix: "Coaches who want a mentor are matched to you on specialism and availability \u2014 requests land on your own dashboard.",
      },
      {
        pain: "Giving more time than you meant to",
        fix: "You set the number of mentee places and accept or decline each request. You stay in control.",
      },
    ],
  },
];

function Pairs({ pairs }: { pairs: { pain: string; fix: string }[] }) {
  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 pt-5 text-left">
      {pairs.map((pr) => (
        <div key={pr.pain}>
          <p className="text-sm font-semibold text-gray-700 line-through decoration-red-500 decoration-1">
            {pr.pain}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-navy">
            <span className="font-bold text-emerald-700">The fix: </span>
            {pr.fix}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <div className="bg-navy-gradient pb-24 pt-12 text-white shadow-lg sm:pt-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center">
          <CoachInMindLogo size={130} />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-goldLight">
            Australian football clubs & coaches, matched properly
          </p>
          <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl md:text-5xl">
            Stop relying on group chats to fill a coaching role
          </h1>
          <p className="max-w-xl text-white/80">
            Coach In Mind matches football coaches with clubs
            <br />— no scrambling, no missed opportunities.
          </p>
          <FoundingBanner variant="hero" className="mt-2" />
        </div>
      </div>

      {/* PAIN / CTA CARDS — overlaps the hero */}
      <div className="mx-auto -mt-14 grid max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-2">
        <Link
          href="/club2coach"
          className="flex flex-col gap-4 rounded-2xl bg-white p-8 text-left shadow-xl ring-1 ring-black/5 transition hover:-translate-y-2 hover:shadow-2xl"
        >
          <span className="flex h-[88px] w-[88px] self-center items-center justify-center rounded-2xl border-[3px] border-[#A87C3A] bg-[#EBD6A8] shadow-md">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#7A5420" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V7a2 2 0 0 1 2-2h4l2-2h2l2 2h4a2 2 0 0 1 2 2v14" /><path d="M3 21h18" /><path d="M9 21v-6h6v6" /></svg>
          </span>
          <span className="self-center text-xl font-extrabold uppercase tracking-wider text-[#7A5420]">
            For clubs
          </span>
          <h2 className="text-center text-2xl font-bold leading-snug text-brand-navy">
            Every season and
            <br />
            the same scramble
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            A coach decides not to coach the next season. Your committee
            spends weeks chasing word-of-mouth leads and posting in
            Facebook groups — and it&rsquo;s hard to know who&rsquo;s
            right for the level. Trials and the season creep closer.
          </p>
          <div className="flex-grow">
            <Pairs pairs={SOLUTIONS[0].pairs} />
          </div>
          <span className="mt-1 self-center rounded-lg bg-brand-navy px-6 py-3 text-sm font-bold text-white">
            Find a coach for my club
          </span>
        </Link>

        <Link
          href="/club2coach/coach"
          className="flex flex-col gap-4 rounded-2xl bg-white p-8 text-left shadow-xl ring-1 ring-black/5 transition hover:-translate-y-2 hover:shadow-2xl"
        >
          <span className="flex h-[88px] w-[88px] self-center items-center justify-center rounded-2xl border-[3px] border-[#6B7482] bg-[#CBD1DA] shadow-md">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#3F4753" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><g transform="rotate(90 12 12)"><rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="1.5" /><g strokeWidth="0.9"><path d="M12 4v16" /><path d="M2 9.5h3v5H2M22 9.5h-3v5h3" /><path d="M5.8 6.8l2.8 2.8M8.6 6.8 5.8 9.6" /><circle cx="16.4" cy="15.6" r="1.6" /><path d="M7.4 16.4c1.6-.2 3.4-1.8 3.8-3.6" /></g></g></svg>
          </span>
          <span className="self-center text-xl font-extrabold uppercase tracking-wider text-[#3F4753]">
            For coaches
          </span>
          <h2 className="text-center text-2xl font-bold leading-snug text-brand-navy">
            The roles are out there. You just can&rsquo;t see them
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Many vacancies never get advertised publicly — they&rsquo;re
            filled through someone&rsquo;s mate, or a committee
            member&rsquo;s phone contacts. Meanwhile you&rsquo;re sitting
            on a licence and season after season of experience, ready to
            coach.
          </p>
          <div className="flex-grow">
            <Pairs pairs={SOLUTIONS[1].pairs} />
          </div>
          <span className="mt-1 self-center rounded-lg bg-brand-navy px-6 py-3 text-sm font-bold text-white">
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
              A club receives the introduction to a coach, or a coach is
              introduced to a mentor once the mentor accepts — no chasing
              group chats.
            </p>
          </div>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div className="mt-20 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 bg-[#F3EFE6] px-4 py-6 text-center">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          Coaches list their accreditation up front
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11Z" /></svg>
          Built around Australia&rsquo;s coaching accreditation levels
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          Sign-up required — no public browsing
        </span>
      </div>

      {/* MENTORS + INVESTMENT */}
      <div className="mx-auto max-w-5xl px-4 pb-24 text-center">
        <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5">
          <span className="flex h-[88px] w-[88px] self-center items-center justify-center rounded-2xl border-[3px] border-[#2B3358] bg-[#C9CDE6] shadow-md">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#191B41" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /><path d="M22 10v6" /></svg>
          </span>
          <span className="self-center text-xl font-extrabold uppercase tracking-wider text-brand-navy">
            For mentors
          </span>
          <h2 className="text-center text-2xl font-bold leading-snug text-brand-navy">
            Share what you know, on your terms
          </h2>
          <Pairs pairs={SOLUTIONS[2].pairs} />
          <Link
            href="/coach2mentor/mentor"
            className="mt-1 self-center rounded-lg bg-brand-navy px-6 py-3 text-sm font-bold text-white hover:bg-brand-navyLight"
          >
            Become a mentor
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-xs text-gray-500">
          We make introductions &mdash; we can&rsquo;t guarantee a placement or a mentor match.
        </p>

        <p className="mt-16 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
          Investment
        </p>
        <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
          What is your time worth?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600">
          Coach In Mind does the legwork so you don&rsquo;t have to.
        </p>

        <details className="group mt-6">
          <summary className="mx-auto w-fit cursor-pointer list-none rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-gray-50">
            See the investment <span className="ml-1 text-gray-400 group-open:hidden">▾</span>
            <span className="ml-1 hidden text-gray-400 group-open:inline">▴</span>
          </summary>
          <p className="mx-auto mt-4 max-w-xl text-sm text-gray-500">
            Creating an account and building your profile is free. You only
            pay to activate. All prices are in AUD and include GST.
          </p>
        <div className="mt-8 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h3 className="text-lg font-bold text-brand-navy">Coaches</h3>
            <p className="mt-1 text-sm text-gray-600">Club2Coach introductions</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              <li>1 credit — $20</li>
              <li>2 credits — $35</li>
              <li>3 credits — $50</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              A credit keeps your profile in front of clubs for 30 days or
              up to 5 introductions, whichever comes first. Unused credits
              don&rsquo;t expire. Looking for a mentor? A Coach2Mentor
              credit is $20 for 60 days.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h3 className="text-lg font-bold text-brand-navy">Clubs</h3>
            <p className="mt-1 text-sm text-gray-600">Coaching vacancy adverts</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              <li>1 introduction — $75</li>
              <li>2 introductions — $150</li>
              <li>3 introductions — $225</li>
              <li>4 introductions — $300</li>
              <li>5 introductions — $350</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Your advert runs for 90 days. If no coach is introduced in
              that time, your credit is returned automatically.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h3 className="text-lg font-bold text-brand-navy">Mentors</h3>
            <p className="mt-1 text-sm text-gray-600">Mentee places</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              <li>1 place — $100</li>
              <li>2 places — $200</li>
              <li>3 places — $300</li>
              <li>5 places — $400</li>
              <li>10 places — $750</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Mentors are checked by our team before they can buy places or
              be matched.
            </p>
          </div>
        </div>
        </details>
      </div>

      {/* SUCCESS STORIES — hidden until there is a real story to show.
          Set SHOW_SUCCESS_STORIES to true and replace the copy below. */}
      {SHOW_SUCCESS_STORIES && (
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
      )}

      {/* FOOTER */}
      <div className="bg-brand-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/help" className="flex items-center gap-3 hover:text-brand-goldLight">
            <CoachInMindLogo size={44} />
            <span className="text-sm font-bold tracking-wide">COACH IN MIND (Resources)</span>
          </Link>
          <p className="text-base font-semibold text-brand-gold">
            Matching coaches and clubs across Australia
          </p>
        </div>
        <nav className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
          <Link href="/terms" className="hover:text-brand-goldLight">Terms</Link>
          <Link href="/privacy" className="hover:text-brand-goldLight">Privacy</Link>
          <Link href="/help" className="hover:text-brand-goldLight">Help</Link>
          <Link href="/support" className="hover:text-brand-goldLight">Support</Link>
          <a href="mailto:coachinmindcim@gmail.com" className="hover:text-brand-goldLight">
            coachinmindcim@gmail.com
          </a>
        </nav>
        <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-white/50">
          © 2026 Coach In Mind · ABN 29 781 187 181
        </p>
      </div>
    </div>
  );
}
