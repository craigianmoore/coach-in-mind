import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="bg-brand-navy pb-16 pt-8 text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center">
        <div className="rounded-xl bg-white p-4 shadow-lg">
          <Image
            src="/coach-in-mind-logo.png"
            alt="Coach In Mind — shaping coaches minds on & off the pitch"
            width={160}
            height={168}
            priority
          />
        </div>
        <h1 className="max-w-2xl text-4xl font-bold">
          Shaping coaches minds
          <br />
          on &amp; off the pitch
        </h1>
        <p className="max-w-xl text-white/80">
          Coach In Mind connects football coaches, clubs, and
          mentors — one login, two ways to find the right match.
        </p>

        <div className="mt-6 grid w-full grid-cols-1 gap-8 text-left sm:grid-cols-2">
          <Link
            href="/club2coach"
            className="flex min-h-[240px] flex-col justify-center rounded-2xl border-2 border-white/10 bg-brand-goldLight/95 p-8 text-brand-navy shadow-xl transition hover:scale-[1.02] hover:brightness-105"
          >
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Club <span className="text-white">2</span> Coach
            </h2>
            <p className="mt-3 text-center text-base">
              Clubs advertise coaching roles. Coaches list themselves as
              available. We match on accreditation, level, location, and
              more — then introduce you.
            </p>
          </Link>
          <Link
            href="/coach2mentor"
            className="flex min-h-[240px] flex-col justify-center rounded-2xl border-2 border-white/10 bg-[#ECEEF1] p-8 text-brand-navy shadow-xl transition hover:scale-[1.02] hover:brightness-105"
          >
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Coach <span className="text-orange-600">2</span> Mentor
            </h2>
            <p className="mt-3 text-center text-base">
              Find an experienced mentor to guide your coaching journey, or
              offer your own experience as a mentor to others.
            </p>
          </Link>
        </div>

        <div className="mt-6 flex gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-navy hover:bg-white/90"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Log in
          </Link>
        </div>

        <p className="mt-2 text-xs text-white/50">
          Currently serving Victoria, with other states to follow.
        </p>
      </div>
    </div>
  );
}
