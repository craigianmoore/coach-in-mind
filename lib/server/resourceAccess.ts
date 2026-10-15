// Who may open the club resources (the difficult-conversations guide and the interviewing checklist):
// admins, and any club with a paid (activated, not refunded) vacancy. Everyone else sees them locked.
import { createClient } from "@/lib/supabase/server";

export async function canAccessResources(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: isAdmin } = await supabase.rpc("is_admin_caller");
  if (isAdmin === true) return true;
  const { data: me } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
  if (!me) return false;
  const { data } = await supabase
    .from("club2coach_club_vacancies")
    .select("id")
    .eq("person_id", me.id)
    .eq("paid", true)
    .is("deleted_at", null)
    .neq("status", "refunded")
    .limit(1);
  return (data?.length ?? 0) > 0;
}
