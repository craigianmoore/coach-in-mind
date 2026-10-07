import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyApprovedShares } from "@/lib/server/notifyMatches";

// Called by the admin page after approving / auto-approving introductions.
// Only a signed-in admin (valid PIN session) can trigger it; it takes no
// input, so a caller can't choose recipients or content.
export async function POST() {
  const supabase = createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin_caller");
  if (isAdmin !== true) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const sent = await notifyApprovedShares(createServiceClient());
  return NextResponse.json({ ok: true, sent });
}
