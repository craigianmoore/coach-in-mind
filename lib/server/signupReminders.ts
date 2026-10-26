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
