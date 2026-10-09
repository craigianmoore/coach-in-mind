import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { APP_URL, sendEmail } from "@/lib/server/sendEmail";

// Called by the admin page right after it verifies a mentor. Admin-only. The caller supplies only a
// listing id; the recipient and the content come from our own database, never from the request.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin_caller");
  if (isAdmin !== true) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { listingId } = await req.json().catch(() => ({}));
  if (typeof listingId !== "string" || !listingId) return NextResponse.json({ ok: false, error: "Missing listingId" }, { status: 400 });

  const service = createServiceClient();
  const { data: listing } = await service
    .from("coach2mentor_mentor_listings")
    .select("person_id, verified_at, paid")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing?.verified_at) return NextResponse.json({ ok: false, error: "Not verified" }, { status: 400 });

  const { data: p } = await service.from("people").select("full_name,email").eq("id", listing.person_id).maybeSingle();
  if (!p?.email) return NextResponse.json({ ok: false, error: "No email on file" }, { status: 200 });

  const first = p.full_name?.trim().split(/\s+/)[0] || "there";
  const ok = await sendEmail({
    to: p.email,
    subject: "You're verified as a Coach In Mind mentor",
    text: `Hi ${first},\n\nThanks — we've checked your accreditation and you're now verified as a mentor.${
      listing.paid ? "" : " The next step is to choose how many mentee places you'd like and pay by card from your mentor page. Your profile goes live as soon as that's done."
    }\n${APP_URL}/coach2mentor/mentor\n\nWe only list mentors we've checked, so coaches can trust who they're being introduced to.`,
  });
  return NextResponse.json({ ok });
}
