import { clubPackPrice, clubPeakTopupPrice, CLUB2COACH_CLUB_PACKAGES, CLUB_PACK_SIZE, CLUB_PACK_DISCOUNT } from "@/lib/constants";

// States, wherever club prices are shown, that the price follows the month an introduction is MADE, not the month the
// club pays. Shown in both seasons so nobody is surprised.
export default function ClubPriceNotice({ className = "" }: { className?: string }) {
  const full = CLUB2COACH_CLUB_PACKAGES[CLUB_PACK_SIZE];
  const low = Math.round(full * (1 - CLUB_PACK_DISCOUNT));
  const { discounted } = clubPackPrice();
  return (
    <div className={`rounded-lg border border-brand-navy/30 bg-brand-navy/5 p-3 text-xs text-gray-800 ${className}`}>
      <p className="font-semibold text-brand-navy">The price depends on the month an introduction is made, not the month you pay.</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        <li>Introductions made 1 February – 31 July: {CLUB_PACK_SIZE} for ${low} (40% off). Aimed at community clubs, whose season and hiring happen in this window.</li>
        <li>Introductions made 1 August – 31 January: {CLUB_PACK_SIZE} for ${full}. Suited to NPL and VPL clubs recruiting higher-accredited coaches ahead of their season.</li>
      </ul>
      {discounted && (
        <p className="mt-1">
          A pack bought now at ${low} covers introductions made up to 31 July. From 1 August it covers 2 introductions; you can pay the ${clubPeakTopupPrice()}
          difference to keep all {CLUB_PACK_SIZE}, or leave it at 2. Introductions already made are never affected.
        </p>
      )}
    </div>
  );
}
