import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";

// Admin alert emails. Only signed-in users can trigger one (all callers
// are signed-in pages), and lengths are capped, so the endpoint can't be
// used by strangers to flood the Coach In Mind inbox.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { subject, text } = await req.json().catch(() => ({}));
  if (typeof subject !== "string" || typeof text !== "string" || !subject || !text) {
    return NextResponse.json({ ok: false, error: "Missing subject or text" }, { status: 400 });
  }

  const result = await sendAdminEmail(subject.slice(0, 200), text.slice(0, 5000));
  return NextResponse.json(result, { status: 200 });
}
