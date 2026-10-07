import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_URL, sendEmail } from "./sendEmail";

// Emails both parties of every newly approved Club2Coach introduction
// exactly once. Each share is "claimed" by stamping participants_notified_at
// before sending (so concurrent callers can't double-send) and released
// again if both sends fail. Contact details are never put in the email —
// people sign in to see them.
export async function notifyApprovedShares(supabase: SupabaseClient): Promise<number> {
  const { data: shares } = await supabase
    .from("club2coach_shares")
    .select("id,coach_listing_id,club_vacancy_id")
    .eq("status", "approved")
    .is("participants_notified_at", null)
    .limit(50);
  let sent = 0;

  for (const s of shares ?? []) {
    const { data: claimed } = await supabase
      .from("club2coach_shares")
      .update({ participants_notified_at: new Date().toISOString() })
      .eq("id", s.id)
      .is("participants_notified_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const [{ data: listing }, { data: vacancy }] = await Promise.all([
      supabase.from("club2coach_coach_listings").select("person_id,role_sought").eq("id", s.coach_listing_id).maybeSingle(),
      supabase
        .from("club2coach_club_vacancies")
        .select("person_id,club_name,role_being_recruited,competition_level")
        .eq("id", s.club_vacancy_id)
        .maybeSingle(),
    ]);
    if (!listing || !vacancy) continue;
    const { data: ppl } = await supabase
      .from("people")
      .select("id,full_name,email")
      .in("id", [listing.person_id, vacancy.person_id]);
    const coach = ppl?.find((p) => p.id === listing.person_id);
    const club = ppl?.find((p) => p.id === vacancy.person_id);
    const first = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "there";

    let ok = false;
    if (coach?.email) {
      ok =
        (await sendEmail({
          to: coach.email,
          subject: `You've been matched with ${vacancy.club_name} — ${vacancy.role_being_recruited}`,
          text: `Hi ${first(coach.full_name)},\n\nGood news — we've matched you with ${vacancy.club_name} for their ${vacancy.role_being_recruited} vacancy (${vacancy.competition_level}).\n\nYour contact details have been shared with the club, and you can see theirs by signing in:\n${APP_URL}/club2coach/coach\n\nWe'd love to hear how it goes.`,
        })) || ok;
    }
    if (club?.email) {
      ok =
        (await sendEmail({
          to: club.email,
          subject: `You've been matched with a coach for ${vacancy.role_being_recruited}`,
          text: `Hi ${first(club.full_name)},\n\nGood news — we've matched ${vacancy.club_name}'s ${vacancy.role_being_recruited} vacancy with ${coach?.full_name ?? "a coach"}.\n\nTheir contact details have been shared with you, and yours with them. Sign in to see them:\n${APP_URL}/club2coach/club\n\nOnce you've spoken, please let us know in the app whether the role was filled, so we can offer your next introduction.`,
        })) || ok;
    }
    if (ok) sent += 1;
    else await supabase.from("club2coach_shares").update({ participants_notified_at: null }).eq("id", s.id);
  }
  return sent;
}
