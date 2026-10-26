import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_URL, sendEmail } from "./sendEmail";
import { introCapFor } from "@/lib/coachPool";

// One coach credit = 30 days of being shown to clubs, up to 3 introductions (5 for activations before 13 Oct 2026): once a coach has
// reached the cap in their current activation, close it (listing leaves matching) and withdraw their other pending
// suggestions. Runs after every approval and at the start of each cron sweep. Service-role client only.
export async function closeUsedActivations(supabase: SupabaseClient): Promise<number> {
  const { data: live } = await supabase
    .from("club2coach_coach_listings")
    .select("id,activated_at")
    .eq("status", "active")
    .gt("active_until", new Date().toISOString())
    .not("activated_at", "is", null);
  let closed = 0;
  for (const l of live ?? []) {
    // Suggestions left over from an earlier activation must never become this activation's introduction.
    await supabase.from("club2coach_shares").delete().eq("coach_listing_id", l.id).eq("status", "suggested").lt("shared_at", l.activated_at);
    const { data: used } = await supabase
      .from("club2coach_shares")
      .select("id")
      .eq("coach_listing_id", l.id)
      .eq("status", "approved")
      .gte("shared_at", l.activated_at)
      .limit(introCapFor(l.activated_at));
    if (!used || used.length < introCapFor(l.activated_at)) continue;
    const { data: upd, error: updErr } = await supabase
      .from("club2coach_coach_listings")
      .update({ status: "expired", active_until: new Date().toISOString() })
      .eq("id", l.id)
      .eq("status", "active")
      .eq("activated_at", l.activated_at)
      .select("id");
    if (updErr || !upd || upd.length === 0) continue;
    await supabase.from("club2coach_shares").delete().eq("coach_listing_id", l.id).eq("status", "suggested");
    closed += 1;
  }
  return closed;
}

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
  await closeUsedActivations(supabase);
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

// A week after an introduction, asks the coach whether they took the role (the answer appears in the app and in
// admin). Each share is emailed once: claimed by stamping coach_check_sent_at before sending, released if it fails.
export async function sendCoachIntroChecks(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: shares } = await supabase
    .from("club2coach_shares")
    .select("id,coach_listing_id,club_vacancy_id")
    .eq("status", "approved")
    .is("coach_response", null)
    .is("coach_check_sent_at", null)
    .lt("shared_at", cutoff)
    .limit(50);
  let sent = 0;
  for (const s of shares ?? []) {
    const { data: claimed } = await supabase
      .from("club2coach_shares")
      .update({ coach_check_sent_at: new Date().toISOString() })
      .eq("id", s.id)
      .is("coach_check_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;
    const { data: listing } = await supabase.from("club2coach_coach_listings").select("person_id").eq("id", s.coach_listing_id).single();
    const { data: vacancy } = await supabase.from("club2coach_club_vacancies").select("club_name,role_being_recruited").eq("id", s.club_vacancy_id).single();
    const { data: coach } = listing ? await supabase.from("people").select("full_name,email").eq("id", listing.person_id).single() : { data: null };
    let ok = false;
    if (coach?.email && vacancy) {
      const first = (coach.full_name ?? "").trim().split(/\s+/)[0] || "there";
      ok = await sendEmail({
        to: coach.email,
        subject: `Did you take the ${vacancy.role_being_recruited} role at ${vacancy.club_name}?`,
        text: `Hi ${first},\n\nIt's been a week since we introduced you to ${vacancy.club_name} for their ${vacancy.role_being_recruited} vacancy. Did you take the role? It takes one tap to let us know:\n${APP_URL}/club2coach/coach\n\nIf it didn't work out, no problem — we'll keep looking for the right fit.`,
      });
    }
    if (ok) sent += 1;
    else await supabase.from("club2coach_shares").update({ coach_check_sent_at: null }).eq("id", s.id);
  }
  return sent;
}

// A week after an introduction, nudges the club by email if it hasn't yet said whether the role was filled (the app
// also asks, and holds back further introductions until it does). Each share is emailed once.
export async function sendClubOutcomeNudges(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: shares } = await supabase
    .from("club2coach_shares")
    .select("id,coach_listing_id,club_vacancy_id")
    .eq("status", "approved")
    .eq("outcome", "pending")
    .is("club_check_sent_at", null)
    .lt("shared_at", cutoff)
    .limit(50);
  let sent = 0;
  for (const s of shares ?? []) {
    const { data: claimed } = await supabase
      .from("club2coach_shares")
      .update({ club_check_sent_at: new Date().toISOString() })
      .eq("id", s.id)
      .is("club_check_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;
    const { data: vacancy } = await supabase.from("club2coach_club_vacancies").select("club_name,role_being_recruited,person_id").eq("id", s.club_vacancy_id).single();
    const { data: person } = vacancy ? await supabase.from("people").select("full_name,email").eq("id", vacancy.person_id).single() : { data: null };
    let ok = false;
    if (person?.email && vacancy) {
      const first = (person.full_name ?? "").trim().split(/\s+/)[0] || "there";
      ok = await sendEmail({
        to: person.email,
        subject: `Did you fill the ${vacancy.role_being_recruited} role at ${vacancy.club_name}?`,
        text: `Hi ${first},\n\nIt's been a week since we introduced a coach for ${vacancy.club_name}'s ${vacancy.role_being_recruited} vacancy. Did you appoint them? It takes one tap to let us know:\n${APP_URL}/club2coach/club\n\nWe ask so we can stop sending coaches once the role is filled, or find you a fresh match if it didn't work out. Honest answers keep the platform fair for every club and coach.\n\nThe Coach In Mind team`,
      });
    }
    if (ok) sent += 1;
    else await supabase.from("club2coach_shares").update({ club_check_sent_at: null }).eq("id", s.id);
  }
  return sent;
}
