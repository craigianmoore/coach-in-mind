import { NextResponse } from "next/server";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  // Only signed-in users can trigger this email (the form itself already requires sign-in), and
  // each person is limited to a handful per hour so it can't be used to flood the support inbox.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (await isRateLimited(supabase, "support-query", 5, 3600)) {
    return NextResponse.json({ ok: false, error: "Too many messages — please try again later." }, { status: 429 });
  }
  const { count } = await supabase
    .from("support_queries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) > 5) return NextResponse.json({ ok: false, error: "Too many messages — please try again later." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.slice(0, 5000) : "";

  if (!message) {
    return NextResponse.json({ ok: false, error: "Missing message" }, { status: 400 });
  }

  // Goes through the shared admin sender so a refused email is queued, retried and shown on the admin banner.
  // The query itself is already saved in support_queries either way.
  const sent = await sendAdminEmail(
    `new query from ${name || "someone"}`,
    `From: ${name || "Unknown"} <${email || "no email given"}>\n\n${message}\n\n---\nSubmitted via the in-app Report an Issue form.`,
    { replyTo: email || undefined }
  );
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error ?? "Email send failed" }, { status: 200 });
  return NextResponse.json({ ok: true });
}
