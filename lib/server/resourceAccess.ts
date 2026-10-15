// Who may open the member resources. "Paid" means real money: a free founding credit, the free first
// introduction and gifted adverts (price $0) do NOT count. Admins can open everything.
//   checklist (Interviewing a Coach): a club with a live vacancy it has paid money for
//   manual (Navigating Difficult Conversations): a coach who has paid money for a listing, or a paying club
import { createClient } from "@/lib/supabase/server";

export type ResourceKey = "checklist" | "manual";

export async function resourceAccess(): Promise<Record<ResourceKey, boolean>> {
  const none = { checklist: false, manual: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return none;
  const { data: isAdmin } = await supabase.rpc("is_admin_caller");
  if (isAdmin === true) return { checklist: true, manual: true };
  const { data: me } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
  if (!me) return none;

  // Paid club with a live advert (a credit returned after a real payment also counts as paid).
  const { data: vac } = await supabase
    .from("club2coach_club_vacancies")
    .select("id, price_aud, from_recredit")
    .eq("person_id", me.id)
    .eq("paid", true)
    .eq("status", "active")
    .is("deleted_at", null)
    .is("refunded_at", null);
  const clubPaid = (vac ?? []).some((v) => Number(v.price_aud ?? 0) > 0 || v.from_recredit === true);

  // Coach who has paid for a listing (credits bought, not just the free one).
  let coachPaid = false;
  for (const table of ["club2coach_coach_listings", "coach2mentor_coach_listings"] as const) {
    const { data } = await supabase
      .from(table)
      .select("id")
      .eq("person_id", me.id)
      .eq("paid", true)
      .gt("price_aud", 0)
      .is("deleted_at", null)
      .is("refunded_at", null)
      .neq("status", "refunded")
      .limit(1);
    if (data?.length) { coachPaid = true; break; }
  }

  return { checklist: clubPaid, manual: clubPaid || coachPaid };
}
