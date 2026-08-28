import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, message } = await req.json();

  if (!message || typeof message !== "string") {
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
        from: "Coach In Mind <onboarding@resend.dev>",
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
