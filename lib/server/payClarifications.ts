import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_URL, sendEmail } from "./sendEmail";

type Due = { clarify_person_id: string; clarify_side: "coach" | "club" };

// One-off: asks people whose indicative pay looks like a weekly/hourly rate to update it or confirm it is a season
// total. The database picks and stamps who is due (once each); a failed send releases the stamp for the next run.
export async function sendPayClarifications(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("pay_clarifications_due");
  if (error) {
    console.error("cron match-sweep: pay_clarifications_due failed", error.message);
    return 0;
  }
  let sent = 0;
  for (const row of (data as Due[] | null) ?? []) {
    const { data: p } = await supabase.from("people").select("full_name,email").eq("id", row.clarify_person_id).maybeSingle();
    let ok = false;
    if (p?.email) {
      const first = (p.full_name ?? "").trim().split(/\s+/)[0] || "there";
      const club = row.clarify_side === "club";
      ok = await sendEmail({
        to: p.email,
        subject: club ? "Quick check on the pay figure in your Coach In Mind advert" : "Quick check on the pay figure in your Coach In Mind listing",
        text: club
          ? `Hi ${first},\n\nThanks for advertising with Coach In Mind.\n\nThe indicative pay on your advert looks like it may not be a season total. We're asking everyone to enter the total for the whole season (the yearly figure), for example 6000 to 9000, so your advert can be compared properly with what coaches enter. With the current figure, we may be scoring good coaches as a poor pay match.\n\nCould you please sign in, open your advert and either update the figure or confirm it's right?\n${APP_URL}/club2coach/club\n\nAs a reminder, this figure is only indicative. It isn't an offer or a contract, and any agreement is made directly between you and the coach.\n\nThanks for your help,\nThe Coach In Mind Team`
          : `Hi ${first},\n\nThanks for setting up your coaching listing on Coach In Mind.\n\nWe've noticed the indicative pay figure on your listing looks like it may be a weekly or hourly rate. To make matching fair, we're asking everyone to enter the total for the whole season (the yearly figure), for example 6000 to 9000. That way your figure can be compared properly with what clubs enter.\n\nCould you please sign in, open your listing and either update the figure or confirm it's already a season total?\n${APP_URL}/club2coach/coach\n\nAs a reminder, this figure is only indicative. It isn't an offer or a contract, and any agreement is made directly between you and the club.\n\nThanks for your help,\nThe Coach In Mind Team`,
      });
    }
    if (ok) sent += 1;
    else await supabase.from("signup_reminders").delete().eq("person_id", row.clarify_person_id).eq("kind", "pay_clarify");
  }
  return sent;
}
