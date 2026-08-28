import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { subject, text } = await req.json();

  if (!subject || !text) {
    return NextResponse.json({ ok: false, error: "Missing subject or text" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — notification not sent.");
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
        subject: `Coach In Mind — ${subject}`,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend API error:", detail);
      return NextResponse.json({ ok: false, error: "Email send failed" }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notification error:", err);
    return NextResponse.json({ ok: false, error: "Email send failed" }, { status: 200 });
  }
}
