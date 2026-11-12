import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_URL, sendEmail } from "./sendEmail";

type Due = { reminder_person_id: string; reminder_kind: "no_profile" | "not_live"; reminder_product: string };

// One reminder (per kind, per person) for people who can't be matched yet: either they never started a coach / club /
// mentor profile, or they saved one but it isn't live. The database picks and stamps who is due (so nobody is emailed
// twice); if an email fails we release the stamp so the next hourly run tries again.
export async function sendSignupReminders(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("signup_reminders_due", { max_rows: 40 });
  if (error) {
    console.error("cron match-sweep: signup_reminders_due failed", error.message);
    return 0;
  }
  let sent = 0;
  for (const row of (data as Due[] | null) ?? []) {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", row.reminder_person_id).maybeSingle();
    let ok = false;
    if (p?.email) {
      const first = (p.full_name ?? "").trim().split(/\s+/)[0] || "there";
      let subject: string;
      let text: string;
      if (row.reminder_kind === "no_profile") {
        subject = "One more step — finish setting up so you can be matched";
        text = `Hi ${first},\n\nThanks for signing up to Coach In Mind. Your details are saved, but we can't match you with anyone yet, because you haven't set up a coach, club or mentor profile. Until you do, you won't be put forward for anything.\n\nIt only takes a few minutes. Pick the one that fits you:\n- Looking for a coaching role: ${APP_URL}/club2coach/coach\n- Advertising a vacancy for your club: ${APP_URL}/club2coach/club\n- Looking for a mentor: ${APP_URL}/coach2mentor/coach\n- Offering to mentor: ${APP_URL}/coach2mentor/mentor\n\nThis is a one-off reminder, we won't send another.\n\nThe Coach In Mind team`;
      } else if (row.reminder_product === "club") {
        subject = "Your vacancy is saved but not live yet";
        text = `Hi ${first},\n\nYou've saved a vacancy on Coach In Mind, but it isn't live yet, so no coaches can be matched to it. Finish it from your club page:\n${APP_URL}/club2coach/club\n\nThis is a one-off reminder, we won't send another.\n\nThe Coach In Mind team`;
      } else if (row.reminder_product === "mentor") {
        subject = "You're verified — buy your mentee introductions to go live";
        text = `Hi ${first},\n\nYour mentor profile has been verified, but it isn't live yet, so coaches can't be matched to you. To go live, choose your mentee introductions from your mentor page:\n${APP_URL}/coach2mentor/mentor\n\nThis is a one-off reminder, we won't send another.\n\nThe Coach In Mind team`;
      } else {
        subject = "Your coaching listing is saved but not in matching yet";
        text = `Hi ${first},\n\nYou've saved a coaching listing on Coach In Mind, but it isn't in matching yet, so clubs and mentors can't be matched with you. Press Activate on your listing page (your free founding credit is added automatically while founding places last):\n${APP_URL}/club2coach/coach\n\nThis is a one-off reminder, we won't send another.\n\nThe Coach In Mind team`;
      }
      ok = await sendEmail({ to: p.email, subject, text });
    }
    if (ok) sent += 1;
    else await supabase.from("signup_reminders").delete().eq("person_id", row.reminder_person_id).eq("kind", row.reminder_kind);
  }
  return sent;
}

// A second, one-off nudge to people who already had the "finish your profile" reminder and still have no profile. It
// answers the usual hesitations (can't change it, it's shared straight away, didn't realise it was needed).
export async function sendSignupFollowups(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("signup_followups_due", { max_rows: 40 });
  if (error) {
    console.error("cron match-sweep: signup_followups_due failed", error.message);
    return 0;
  }
  let sent = 0;
  for (const row of (data as { reminder_person_id: string }[] | null) ?? []) {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", row.reminder_person_id).maybeSingle();
    let ok = false;
    if (p?.email) {
      const first = (p.full_name ?? "").trim().split(/\s+/)[0] || "there";
      const text = `Hi ${first},\n\nYou signed up to Coach In Mind, but your profile isn't set up yet, and without one we can't match you with a club, coach or mentor. It takes about five minutes.\n\nA few things people often wonder about:\n\n- You can change it any time. Nothing you enter is locked in.\n- Nothing goes live until you activate it. Your time and your live profile only start then, and completing your profile doesn't use your credit. Even when it's live, your contact details stay private until we've approved an introduction.\n\nFinish your profile here: ${APP_URL}/profile\n\nIf you've decided it's not for you, just reply "no thanks" and we'll leave you alone.`;
      ok = await sendEmail({ to: p.email, subject: "Quick question about your Coach In Mind profile", text });
    }
    if (ok) sent += 1;
    else await supabase.from("signup_reminders").delete().eq("person_id", row.reminder_person_id).eq("kind", "no_profile_2");
  }
  return sent;
}

export const PROFILE_NUDGE_SUBJECT = "Clubs are looking: finish your profile so we can match you";

export function profileNudgeText(firstName: string) {
  const first = firstName.trim() || "there";
  return `Hi ${first},

Clubs are using Coach In Mind right now to find coaches, and we're matching them with coaches as they come in.

You've signed up, but you haven't completed a profile yet, and without one we can't match you with anyone. Until you do, you won't be put forward for any club.

It takes about five minutes. Pick the one that fits you:
- Looking for a coaching role: ${APP_URL}/club2coach/coach
- Advertising a vacancy for your club: ${APP_URL}/club2coach/club
- Looking for a mentor: ${APP_URL}/coach2mentor/coach
- Offering to mentor: ${APP_URL}/coach2mentor/mentor

Nothing goes live until you activate it, completing your profile doesn't use your credit, and your contact details stay private until we've approved an introduction.

If you've decided it's not for you, just reply "no thanks" and we'll leave you alone.`;
}

// How many people would get the profile nudge right now.
export async function profileNudgeCount(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("signup_nudge3_count");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

// Admin-triggered: sends the nudge to the next `n` people who still have no profile. The database claims each person
// first (so nobody is emailed twice, even if two clicks overlap); a failed email releases the claim so it can be retried.
export async function sendProfileNudges(supabase: SupabaseClient, n: number): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.rpc("signup_nudge3_due", { max_rows: n });
  if (error) throw new Error(error.message);
  let sent = 0;
  let failed = 0;
  for (const row of (data as { reminder_person_id: string }[] | null) ?? []) {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", row.reminder_person_id).maybeSingle();
    let ok = false;
    if (p?.email) ok = await sendEmail({ to: p.email, subject: PROFILE_NUDGE_SUBJECT, text: profileNudgeText((p.full_name ?? "").trim().split(/\s+/)[0] ?? "") });
    if (ok) sent++;
    else {
      failed++;
      await supabase.from("signup_reminders").delete().eq("person_id", row.reminder_person_id).eq("kind", "no_profile_3");
    }
    await new Promise((res) => setTimeout(res, 600)); // stay under Resend's request rate limit
  }
  return { sent, failed };
}
