import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runClub2CoachMatchSweep, runCoach2MentorMatchSweep } from "@/lib/matching/sweep";
import { notifyApprovedShares } from "@/lib/server/notifyMatches";
import { notifyMentoringRequests } from "@/lib/server/notifyMentoring";

// Safety-net sweep: runs the same matching logic admin triggers by hand
// (opening the Matches tab, clicking "Re-run auto-match now") on a
// schedule, so new matches get computed even if nobody logs into Admin.
// The Stripe webhook (app/api/stripe/webhook/route.ts) also calls these
// sweep functions immediately after a payment, for the common case — this
// cron exists to catch anything that trigger misses (e.g. a listing that
// becomes eligible later without a new payment, such as a slot freeing up).
//
// Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET —
// Vercel automatically sends this as a Bearer token when the env var is
// set on the project.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("CRON_SECRET is not set — /api/cron/match-sweep is unprotected.");
  }

  const supabase = createServiceClient();

  const [club2coach, coach2mentor] = await Promise.all([
    runClub2CoachMatchSweep(supabase),
    runCoach2MentorMatchSweep(supabase),
  ]);

  await notifyApprovedShares(supabase);
  await notifyMentoringRequests(supabase);

  return NextResponse.json({
    ok: true,
    club2coachNew: club2coach.totalNew,
    coach2mentorNew: coach2mentor.totalNew,
  });
}
