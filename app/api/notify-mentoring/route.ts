import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyMentoringRequests } from "@/lib/server/notifyMentoring";
import { isRateLimited } from "@/lib/server/rateLimit";

// Any signed-in user can trigger this (a mentor accepting, an admin
// approving). It takes no input, so callers can't choose recipients or
// content, and each email is only ever sent once.
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (await isRateLimited(supabase, "notify-mentoring", 30, 3600)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const sent = await notifyMentoringRequests(createServiceClient());
  return NextResponse.json({ ok: true, sent });
}
