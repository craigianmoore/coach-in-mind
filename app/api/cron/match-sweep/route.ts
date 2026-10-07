import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runClub2CoachMatchSweep, runCoach2MentorMatchSweep } from "@/lib/matching/sweep";
import { notifyApprovedShares } from "@/lib/server/notifyMatches";
import { notifyMentoringRequests } from "@/lib/server/notifyMentoring";
import { APP_URL, sendEmail } from "@/lib/server/sendEmail";

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

  // Founding introductions: remind a week before expiry, then expire unused
  // ones (BEFORE matching, so an expired listing isn't matched).
  const linkFor = (prod: string) => `${APP_URL}/${prod === "coach2mentor" ? "coach2mentor" : "club2coach"}/coach`;
  const emailFor = async (personId: string) => {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", personId).maybeSingle();
    return p?.email ? { email: p.email, first: p.full_name?.trim().split(/\s+/)[0] || "there" } : null;
  };

  const { data: reminders } = await supabase.rpc("founding_reminders_due");
  for (const row of (reminders as { reminder_person_id: string; reminder_product: string; reminder_expires_at: string }[] | null) ?? []) {
    const who = await emailFor(row.reminder_person_id);
    if (!who) continue;
    const when = new Date(row.reminder_expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    await sendEmail({
      to: who.email,
      subject: "Your free founding introduction expires in a week",
      text: `Hi ${who.first},\n\nYour free founding introduction hasn't been used yet and expires on ${when}.\n\nIt's already active and in matching, so there's nothing to do — we're looking for your match. If it expires unused you can still choose a package from your listing page:\n${linkFor(row.reminder_product)}`,
    });
  }

  const { data: expired } = await supabase.rpc("expire_founding_introductions");
  for (const row of (expired as { expired_person_id: string; expired_product: string }[] | null) ?? []) {
    const who = await emailFor(row.expired_person_id);
    if (!who) continue;
    await sendEmail({
      to: who.email,
      subject: "Your free founding introduction has expired",
      text: `Hi ${who.first},\n\nYour free founding introduction was valid for 60 days and wasn't used, so it has now expired and your listing is no longer in matching.\n\nIf you're still looking, you can choose an introduction package from your listing page and you'll be back in matching straight away:\n${linkFor(row.expired_product)}`,
    });
  }

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
