// Server-only helper for emailing the Coach In Mind admin inbox via
// Resend. Used directly by server code that already runs on the
// server (the refund-reminder cron job) so it doesn't need to make a
// self-referential HTTP call to /api/notify; that route now delegates
// to this same function for the client-triggered notifications.
export async function sendAdminEmail(subject: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — admin email not sent.");
    return { ok: false, error: "Email not configured" };
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
      return { ok: false, error: "Email send failed" };
    }

    return { ok: true };
  } catch (err) {
    console.error("Admin email error:", err);
    return { ok: false, error: "Email send failed" };
  }
}
