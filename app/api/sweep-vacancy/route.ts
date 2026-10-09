import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runClub2CoachMatchSweep } from "@/lib/matching/sweep";
import { notifyApprovedShares } from "@/lib/server/notifyMatches";
import { isRateLimited } from "@/lib/server/rateLimit";

// Called right after a club applies a returned credit, so its vacancy is matched
// straight away (same as after a card payment). The caller must own the vacancy
// (checked through RLS) and the vacancy must actually be live and paid.
export async function POST(req: Request) {
  const { vacancyId } = (await req.json().catch(() => ({}))) as { vacancyId?: string };
  if (!vacancyId) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = await createClient();
  if (await isRateLimited(supabase, "sweep-vacancy", 20, 3600)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const { data: v } = await supabase
    .from("club2coach_club_vacancies")
    .select("id, paid, status")
    .eq("id", vacancyId)
    .maybeSingle();
  if (!v || !v.paid || v.status !== "active") return NextResponse.json({ ok: false }, { status: 403 });
  const service = createServiceClient();
  await runClub2CoachMatchSweep(service, { vacancyIds: [vacancyId] });
  await notifyApprovedShares(service);
  return NextResponse.json({ ok: true });
}
