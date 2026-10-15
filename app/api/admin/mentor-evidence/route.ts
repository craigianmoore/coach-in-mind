// POST /api/admin/mentor-evidence
// Lets an admin attach a mentor's certificate (PDF/JPEG/PNG) to their profile on their behalf.
//   { action: "sign",   listingId, filename, contentType }  -> { path, token }  (browser then uploads straight to storage)
//   { action: "record", listingId, path, filename }         -> saves the file against the listing
// Admin session required. The file never passes through this function, so large PDFs are fine.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin_caller");
  if (isAdmin !== true) return NextResponse.json({ ok: false, error: "Admin session required." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (!b.listingId || !/^[0-9a-f-]{36}$/i.test(b.listingId)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid listing." }, { status: 400 });
  }
  const service = createServiceClient();
  const { data: listing } = await service
    .from("coach2mentor_mentor_listings")
    .select("id, person_id, accreditation_evidence_path")
    .eq("id", b.listingId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ ok: false, error: "Mentor listing not found." }, { status: 404 });

  const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(0, 120);

  if (b.action === "sign") {
    if (!TYPES.includes(b.contentType)) return NextResponse.json({ ok: false, error: "Must be a PDF, JPEG or PNG." }, { status: 400 });
    const path = `${listing.person_id}/${listing.id}-${safeName(b.filename || "certificate")}`;
    const { data, error } = await service.storage.from("mentor-evidence").createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? "Couldn't start the upload." }, { status: 400 });
    return NextResponse.json({ ok: true, path, token: data.token });
  }

  if (b.action === "record") {
    const expected = `${listing.person_id}/${listing.id}-`;
    if (!b.path?.startsWith(expected)) return NextResponse.json({ ok: false, error: "Unexpected file path." }, { status: 400 });
    const { error } = await service
      .from("coach2mentor_mentor_listings")
      .update({
        accreditation_evidence_path: b.path,
        accreditation_evidence_filename: b.path.slice(expected.length),
        accreditation_evidence_uploaded_at: new Date().toISOString(),
      })
      .eq("id", listing.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    // Replacing with a differently named file: drop the old one.
    if (listing.accreditation_evidence_path && listing.accreditation_evidence_path !== b.path) {
      await service.storage.from("mentor-evidence").remove([listing.accreditation_evidence_path]);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
