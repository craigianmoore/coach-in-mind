import Image from "next/image";
import Link from "next/link";
import {
  CALM_STEPS,
  MANUAL_SECTIONS,
  QUICK_REFERENCE_CHECKLIST,
  SECTION_ICON_PATH,
} from "@/lib/content/coachInfluenceManual";

export const metadata = {
  title: "Navigating Difficult Conversations & Scenarios — Coach In Mind",
};

export default function ManualPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/help"
        className="inline-flex items-center gap-1 rounded-full bg-brand-goldLight/40 px-4 py-1.5 text-base font-semibold text-brand-navy transition hover:bg-brand-gold hover:text-white"
      >
        ← Back to Help &amp; Resources
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-brand-navy">
        Navigating Difficult Conversations &amp; Scenarios
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Covering parents, players, committees, sponsors, coaches, weather, rules, club
        expectations and family. Jump straight to a topic below, or read it end to end.
      </p>
      <a
        href="/coach-influence-manual.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-navy underline"
      >
        Download the full guide as a PDF ↓
      </a>

      {/* JUMP-TO-SECTION MENU */}
      <nav className="mt-6 rounded-xl border bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Jump to a topic</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MANUAL_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-goldLight/20 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-brand-navy transition hover:bg-brand-gold hover:text-white"
            >
              <Image
                src={SECTION_ICON_PATH(section.id)}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 flex-shrink-0"
              />
              {section.number}. {section.title}
            </a>
          ))}
          <a
            href="#quick-reference"
            className="flex items-center gap-2 rounded-full border border-brand-silver/40 bg-brand-silverLight/30 py-1.5 pl-3.5 pr-3.5 text-sm font-medium text-brand-navy transition hover:bg-brand-silver hover:text-white"
          >
            Quick reference checklist
          </a>
        </div>
      </nav>

      {/* WELCOME + CALM APPROACH */}
      <section className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-brand-navy">Welcome</h2>
        <p className="mt-2 text-sm text-gray-600">
          Whatever brought you here — a tricky conversation this week or just wanting to feel a
          bit more prepared — you&rsquo;re in the right place. Coaching is rarely just about the
          session plan. Most of the pressure coaches feel comes from everything around it — a
          frustrated parent, a tense committee meeting, a call from an opposition coach, or trying
          to fit training around a family dinner. This guide collects the situations coaches most
          commonly face away from the whiteboard, and offers a straightforward, supportive way to
          handle each one.
        </p>
        <p className="mt-3 text-sm text-gray-600">
          Think of it like a first-aid kit rather than a rulebook. You won&rsquo;t need every page
          every week, but when something flares up, the right entry should get you back on your
          feet quickly — calm, clear, and consistent with how the club wants to operate. Every
          coach, at every stage, faces moments like these — you&rsquo;re not alone in it.
        </p>

        <h3 className="mt-5 font-semibold text-brand-navy">The CALM approach</h3>
        <p className="mt-1 text-sm text-gray-600">
          Nearly every scenario in this guide can be worked through with the same four-step
          approach, in the same way a pilot runs the same checklist regardless of which airport
          they&rsquo;re landing at:
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {CALM_STEPS.map((step) => (
            <div key={step.step} className="rounded-lg bg-brand-goldLight/15 p-3 text-sm">
              <p className="font-semibold text-brand-navy">{step.step}</p>
              <p className="mt-0.5 text-gray-600">{step.meaning}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Each scenario below follows the same layout: the situation, then a short &lsquo;how to
          handle it&rsquo; box with practical steps and a line you can genuinely use out loud.
        </p>
      </section>

      {/* SECTIONS */}
      <div className="mt-8 flex flex-col gap-8">
        {MANUAL_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-6 rounded-xl border bg-white p-6"
          >
            <h2 className="flex items-center gap-3 text-xl font-bold text-brand-navy">
              <Image
                src={SECTION_ICON_PATH(section.id)}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 flex-shrink-0"
              />
              {section.number}. {section.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{section.intro}</p>

            <div className="mt-5 flex flex-col gap-5">
              {section.scenarios.map((scenario) => (
                <div
                  key={scenario.title}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <p className="font-medium text-gray-800">{scenario.title}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold text-brand-navy">The situation: </span>
                    {scenario.situation}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-brand-navy">How to handle it</p>
                  <ul className="mt-1 flex flex-col gap-1.5 text-sm text-gray-600">
                    {scenario.tips.map((tip) => (
                      <li key={tip} className="flex gap-2">
                        <span className="text-brand-gold">●</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 rounded-lg bg-brand-goldLight/15 p-3 text-sm italic text-gray-700">
                    Try saying: &ldquo;{scenario.saying}&rdquo;
                  </p>
                </div>
              ))}
            </div>

            {section.footnote && (
              <p className="mt-5 text-sm text-gray-600">{section.footnote.text}</p>
            )}
          </section>
        ))}
      </div>

      {/* QUICK REFERENCE CHECKLIST */}
      <section
        id="quick-reference"
        className="mt-8 scroll-mt-6 rounded-xl border border-brand-silver/40 bg-brand-silverLight/20 p-6"
      >
        <h2 className="text-xl font-bold text-brand-navy">Quick Reference Checklist</h2>
        <p className="mt-2 text-sm text-gray-600">
          Before a difficult conversation, run through this short checklist — like checking your
          mirrors before pulling out, it takes seconds and prevents most avoidable collisions.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-gray-700">
          {QUICK_REFERENCE_CHECKLIST.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-brand-navy">●</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gray-600">
          This guide is a living resource — add your own scenarios and scripts as they come up and
          adapt the language to your own voice. The framework matters more than the exact words.
          Thank you for coaching — you make a real difference.
        </p>
        <p className="mt-3 text-sm text-gray-500">
          For further support contact CIM —{" "}
          <a href="mailto:coachinmindcim@gmail.com" className="underline">
            coachinmindcim@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
