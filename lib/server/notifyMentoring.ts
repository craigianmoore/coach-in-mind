import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_URL, sendEmail } from "./sendEmail";

const first = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "there";

// Emails for Coach2Mentor requests, each sent exactly once (claimed by
// stamping a *_notified_at column first, released if every send fails):
//  - request now pending  -> the mentor is told a coach would like their help
//  - request accepted     -> both sides are told they're matched
// Contact details are never in the email; people sign in to see them.
export async function notifyMentoringRequests(supabase: SupabaseClient): Promise<number> {
  let sent = 0;

  async function load(requestId: string) {
    const { data: r } = await supabase
      .from("coach2mentor_requests")
      .select("coach_listing_id,mentor_listing_id")
      .eq("id", requestId)
      .maybeSingle();
    if (!r) return null;
    const [{ data: cl }, { data: ml }] = await Promise.all([
      supabase.from("coach2mentor_coach_listings").select("person_id").eq("id", r.coach_listing_id).maybeSingle(),
      supabase.from("coach2mentor_mentor_listings").select("person_id").eq("id", r.mentor_listing_id).maybeSingle(),
    ]);
    if (!cl || !ml) return null;
    const { data: ppl } = await supabase
      .from("people")
      .select("id,full_name,email")
      .in("id", [cl.person_id, ml.person_id]);
    return {
      coach: ppl?.find((p) => p.id === cl.person_id),
      mentor: ppl?.find((p) => p.id === ml.person_id),
    };
  }

  async function claim(id: string, col: "pending_notified_at" | "accepted_notified_at") {
    const { data } = await supabase
      .from("coach2mentor_requests")
      .update({ [col]: new Date().toISOString() })
      .eq("id", id)
      .is(col, null)
      .select("id");
    return !!data && data.length > 0;
  }
  const release = (id: string, col: string) =>
    supabase.from("coach2mentor_requests").update({ [col]: null }).eq("id", id);

  // 1. Pending → tell the mentor.
  const { data: pending } = await supabase
    .from("coach2mentor_requests")
    .select("id")
    .eq("status", "pending")
    .is("pending_notified_at", null)
    .limit(50);
  for (const r of pending ?? []) {
    if (!(await claim(r.id, "pending_notified_at"))) continue;
    const p = await load(r.id);
    let ok = false;
    if (p?.mentor?.email) {
      ok = await sendEmail({
        to: p.mentor.email,
        subject: "A coach would like your mentoring",
        text: `Hi ${first(p.mentor.full_name)},\n\nA coach has been matched with you and would like your help as a mentor.\n\nSign in to see their goals and to accept or decline:\n${APP_URL}/coach2mentor/mentor\n\nContact details are shared with both of you only once you accept.`,
      });
    }
    if (ok) sent += 1;
    else await release(r.id, "pending_notified_at");
  }

  // 2. Accepted → tell both.
  const { data: accepted } = await supabase
    .from("coach2mentor_requests")
    .select("id")
    .eq("status", "accepted")
    .is("accepted_notified_at", null)
    .limit(50);
  for (const r of accepted ?? []) {
    if (!(await claim(r.id, "accepted_notified_at"))) continue;
    const p = await load(r.id);
    let ok = false;
    if (p?.coach?.email) {
      ok =
        (await sendEmail({
          to: p.coach.email,
          subject: `You've been matched with a mentor — ${p.mentor?.full_name ?? "your mentor"}`,
          text: `Hi ${first(p.coach.full_name)},\n\nGood news — ${p.mentor?.full_name ?? "a mentor"} has accepted your mentoring request.\n\nYour contact details have been shared with them, and you can see theirs by signing in:\n${APP_URL}/coach2mentor/coach\n\nWe'd love to hear how it goes.`,
        })) || ok;
    }
    if (p?.mentor?.email) {
      ok =
        (await sendEmail({
          to: p.mentor.email,
          subject: `You've been matched with a coach — ${p.coach?.full_name ?? "your mentee"}`,
          text: `Hi ${first(p.mentor.full_name)},\n\nThanks for accepting — you're now matched with ${p.coach?.full_name ?? "a coach"}.\n\nTheir contact details have been shared with you, and yours with them. Sign in to see them:\n${APP_URL}/coach2mentor/mentor`,
        })) || ok;
    }
    if (ok) sent += 1;
    else await release(r.id, "accepted_notified_at");
  }
  return sent;
}
