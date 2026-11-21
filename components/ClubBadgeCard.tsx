"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BADGE_CRITERIA, BADGE_DESCRIPTION, BADGE_NAME, badgeEarned, type BadgeStatus } from "@/lib/clubBadge";

// Draws the badge as a PNG the club can download and use on its own channels.
async function badgePng(): Promise<string> {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 300;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0f2a4a";
  ctx.fillRect(0, 0, c.width, c.height);
  try {
    const logo = new Image();
    logo.src = "/coach-in-mind-logo.png";
    await logo.decode();
    const s = Math.min(220 / logo.naturalWidth, 220 / logo.naturalHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(40, 40, 220, 220);
    ctx.drawImage(logo, 40 + (220 - logo.naturalWidth * s) / 2, 40 + (220 - logo.naturalHeight * s) / 2, logo.naturalWidth * s, logo.naturalHeight * s);
  } catch {}
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText("Recruits through", 300, 125);
  ctx.fillText("Coach In Mind", 300, 185);
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("coachinmind.com.au", 300, 235);
  return c.toDataURL("image/png");
}

export default function ClubBadgeCard({ vacancyId }: { vacancyId: string }) {
  const supabase = createClient();
  const [s, setS] = useState<BadgeStatus | null>(null);

  useEffect(() => {
    supabase.rpc("get_my_vacancy_badge", { vac_id: vacancyId }).then(({ data }) => setS((data as BadgeStatus) ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancyId]);

  if (!s) return null;
  const earned = badgeEarned(s);

  async function download() {
    const a = document.createElement("a");
    a.href = await badgePng();
    a.download = "recruits-through-coach-in-mind.png";
    a.click();
  }

  return (
    <div className={`mt-4 rounded-lg border p-4 text-sm ${earned ? "border-green-300 bg-green-50 text-green-900" : "border-gray-200 bg-white text-gray-800"}`}>
      <h2 className="font-semibold">{earned ? `✓ ${BADGE_NAME}` : `${BADGE_NAME}: not yet earned`}</h2>
      <p className="mt-1 text-xs text-gray-600">
        Coaches see this badge on your introductions. It reflects process only (how you recruit), not the quality of your club. It can be paused or removed at any time.
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {BADGE_CRITERIA.map((c) => (
          <li key={c.key}>
            {s[c.key] ? "✓" : "○"} <span className="font-medium">{c.label}</span>
            {!s[c.key] && <span className="block pl-5 text-xs text-gray-600">{c.fix}</span>}
          </li>
        ))}
      </ul>
      {earned && (
        <div className="mt-3">
          <p className="text-xs text-gray-700">{BADGE_DESCRIPTION}</p>
          <button type="button" onClick={download} className="mt-2 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white">
            Download badge image
          </button>
        </div>
      )}
    </div>
  );
}
