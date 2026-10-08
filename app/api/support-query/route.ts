import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  // Only signed-in users can trigger this email (the form itself already requires sign-in), and
  // each person is limited to a handful per hour so it can't be used to flood the support inbox.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Fails quietly from the person's point of view — their query is
    // already safely saved in support_queries regardless of whether
    // this notification step succeeds. Logged server-side so it shows
    // up in Vercel's function logs if it's ever misconfigured.
    console.error("RESEND_API_KEY is not set — support query saved but no email sent.");
    return NextResponse.json({ ok: false, error: "Email not configured" }, { status: 200 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Coach In Mind <hello@coachinmind.com.au>",
        to: "coachinmindcim@gmail.com",
        reply_to: email || undefined,
        subject: `Coach In Mind — new query from ${name || "someone"}`,
        text: `From: ${name || "Unknown"} <${email || "no email given"}>\n\n${message}\n\n---\nSubmitted via the in-app Report an Issue form.`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend API error:", detail);
      return NextResponse.json({ ok: false, error: "Email send failed" }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Support notification error:", err);
    return NextResponse.json({ ok: false, error: "Email send failed" }, { status: 200 });
  }
}
