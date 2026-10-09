// POST /api/admin/erase-person  { personId }
// Master-PIN admins only. Deletes a person with no payment history, or
// anonymises one who has paid (the payments ledger is kept). Also removes
// their stored mentor-evidence files and handles their login:
//   deleted     -> the auth user is deleted
//   anonymised  -> the auth user's email is replaced and the login is banned
// (the people row must survive for the ledger, so the auth user can't be
// deleted — it would cascade into the payments).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: isMaster } = await supabase.rpc("am_i_master_admin");
  if (isMaster !== true) return NextResponse.json({ ok: false, error: "Master admin session required." }, { status: 403 });

  const { personId } = (await req.json().catch(() => ({}))) as { personId?: string };
  if (!personId || !/^[0-9a-f-]{36}$/i.test(personId)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid personId." }, { status: 400 });
  }

  const service = createServiceClient();

  // Gather what we need BEFORE the database rows are changed.
  const { data: person } = await service.from("people").select("id, user_id").eq("id", personId).maybeSingle();
  if (!person) return NextResponse.json({ ok: false, error: "Person not found." }, { status: 404 });
  const { data: mentorRows } = await service
    .from("coach2mentor_mentor_listings")
    .select("accreditation_evidence_path")
    .eq("person_id", personId);
  const paths = (mentorRows ?? []).map((r) => r.accreditation_evidence_path).filter((p): p is string => !!p);

  // The database function re-checks master status itself, using the caller's session.
  const { data: outcome, error } = await supabase.rpc("admin_erase_person", { target_person_id: personId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const problems: string[] = [];

  if (paths.length) {
    const { error: rmErr } = await service.storage.from("mentor-evidence").remove(paths);
    if (rmErr) problems.push(`evidence files not removed: ${rmErr.message}`);
  }

  if (outcome === "deleted") {
    const { error: delErr } = await service.auth.admin.deleteUser(person.user_id);
    if (delErr) problems.push(`login not deleted: ${delErr.message}`);
  } else {
    const { error: updErr } = await service.auth.admin.updateUserById(person.user_id, {
      email: `deleted-${personId}@deleted.invalid`,
      ban_duration: "876000h",
    });
    if (updErr) problems.push(`login not blocked: ${updErr.message}`);
  }

  return NextResponse.json({ ok: true, outcome, problems });
}
