import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runClub2CoachMatchSweep, runCoach2MentorMatchSweep } from "@/lib/matching/sweep";
import { closeUsedActivations, notifyApprovedShares } from "@/lib/server/notifyMatches";
import { notifyMentoringRequests } from "@/lib/server/notifyMentoring";
import { APP_URL, sendEmail } from "@/lib/server/sendEmail";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";

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
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: without CRON_SECRET nobody (including Vercel Cron) can run this.
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Coach activations: remind a week before the window ends, then expire ended
  // ones (BEFORE matching, so an expired listing isn't matched).
  const linkFor = (prod: string) => `${APP_URL}/${prod === "coach2mentor" ? "coach2mentor" : "club2coach"}/coach`;
  const nameFor = (prod: string) => (prod === "coach2mentor" ? "Coach 2 Mentor" : "Club 2 Coach");
  const emailFor = async (personId: string) => {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", personId).maybeSingle();
    return p?.email ? { email: p.email, first: p.full_name?.trim().split(/\s+/)[0] || "there" } : null;
  };

  const logErr = (what: string, error: { message: string } | null) => {
    if (error) console.error(`cron match-sweep: ${what} failed`, error.message);
  };
  const send = async (args: Parameters<typeof sendEmail>[0], what = args.subject) => {
    const ok = await sendEmail(args);
    if (!ok) console.error(`cron match-sweep: email not sent (${what}) to ${args.to}`);
    return ok;
  };

  await closeUsedActivations(supabase); // coaches whose credit was used by an introduction leave matching quietly

  const { data: reminders, error: remindersError } = await supabase.rpc("coach_expiry_reminders_due");
  logErr("coach_expiry_reminders_due", remindersError);
  for (const row of (reminders as { reminder_person_id: string; reminder_product: string; reminder_expires_at: string }[] | null) ?? []) {
    const who = await emailFor(row.reminder_person_id);
    if (!who) continue;
    const when = new Date(row.reminder_expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    await send({
      to: who.email,
      subject: `Your ${nameFor(row.reminder_product)} listing ends in a week`,
      text: `Hi ${who.first},\n\nYour ${nameFor(row.reminder_product)} listing is in matching until ${when}, then it ends and that credit is used up. There's nothing to do while it runs — we're looking for your match. If you'd still like to be looked at after that date, you can activate it again with another credit from your listing page:\n${linkFor(row.reminder_product)}`,
    });
  }

  const { data: expired, error: expiredError } = await supabase.rpc("expire_coach_activations");
  logErr("expire_coach_activations", expiredError);
  for (const row of (expired as { expired_person_id: string; expired_product: string }[] | null) ?? []) {
    const who = await emailFor(row.expired_person_id);
    if (!who) continue;
    await send({
      to: who.email,
      subject: `Your ${nameFor(row.expired_product)} listing has ended`,
      text: `Hi ${who.first},\n\nYour ${nameFor(row.expired_product)} listing has reached the end of its period, so it's no longer in matching and that credit has been used. Any introductions already made are unaffected. If you paid for this credit and no introduction was made, you can ask for a refund through the Support page once 90 days have passed since you pressed Activate, and for up to 45 days after that (this doesn't limit your rights under the Australian Consumer Law). A free founding credit isn't refundable.\n\nIf you're still looking, activate it again with another credit (buy one if you need to) from your listing page:\n${linkFor(row.expired_product)}`,
    });
  }

  // Day 90 after Activate with no introduction: tell the coach their refund window has opened
  // (once per activation), and send the admin inbox one digest.
  const { data: refundNotices, error: noticesError } = await supabase.rpc("coach_refund_notices_due");
  logErr("coach_refund_notices_due", noticesError);
  const digest: string[] = [];
  for (const row of (refundNotices as { notice_person_id: string; notice_product: string; notice_activated_at: string }[] | null) ?? []) {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", row.notice_person_id).maybeSingle();
    digest.push(`${p?.full_name ?? "A coach"} (${p?.email ?? "no email"}) — ${nameFor(row.notice_product)}`);
    if (!p?.email) continue;
    const first = p.full_name?.trim().split(/\s+/)[0] || "there";
    const until = new Date(new Date(row.notice_activated_at).getTime() + 135 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    await send({
      to: p.email,
      subject: `Your ${nameFor(row.notice_product)} refund window has opened`,
      text: `Hi ${first},\n\nIt's been 90 days since you pressed Activate on your ${nameFor(row.notice_product)} listing and no introduction has been made. If you'd like a full refund of that package, you can request it through the Support page until ${until}:\n${APP_URL}/support\n\nOr you can activate again with another credit from your listing page:\n${linkFor(row.notice_product)}\n\nThis doesn't limit any rights you have under the Australian Consumer Law.`,
    });
  }
  if (digest.length > 0) {
    await sendAdminEmail("Coach refund windows opened today", `These coaches have reached day 90 with no introduction:\n\n${digest.join("\n")}`);
  }

  // Club adverts run 90 days. Past that they end; with no introduction made, the credit is returned.
  const { data: endedAdverts, error: advertsError } = await supabase.rpc("expire_club_vacancies");
  logErr("expire_club_vacancies", advertsError);
  for (const row of (endedAdverts as { expired_person_id: string; expired_club: string; expired_role: string; was_recredited: boolean }[] | null) ?? []) {
    const who = await emailFor(row.expired_person_id);
    if (!who) continue;
    const link = `${APP_URL}/club2coach/club`;
    await send({
      to: who.email,
      subject: row.was_recredited ? "Your advert has ended — your credit has been returned" : "Your advert has ended",
      text: row.was_recredited
        ? `Hi ${who.first},\n\nYour advert for ${row.expired_role} at ${row.expired_club} has run its 90 days and no coach was introduced, so we've returned your credit. Repost the vacancy from your club page and choose "Use my returned credit" to run it for another 90 days at no charge:\n${link}\n\nYour returned credit doesn't expire. If you'd rather have a refund of that package than the credit, reply to this email or use the Support page within 45 days of today. This doesn't limit any rights you have under the Australian Consumer Law.`
        : `Hi ${who.first},\n\nYour advert for ${row.expired_role} at ${row.expired_club} has run its 90 days and has now ended. If the role is still open you can repost it from your club page:\n${link}`,
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
