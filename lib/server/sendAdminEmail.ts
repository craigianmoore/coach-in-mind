// Server-only helper for emailing the Coach In Mind admin inbox via
// Resend. Used directly by server code that already runs on the
// server (the refund-reminder cron job) so it doesn't need to make a
// self-referential HTTP call to /api/notify; that route now delegates
// to this same function for the client-triggered notifications.
import { renderEmailHtml } from "./emailHtml";
import { recordEmailFailure } from "./emailFailures";

const ADMIN_INBOX = "coachinmindcim@gmail.com";

// opts.record: false for the retry job (it manages the queue itself). opts.rawSubject: the subject
// is already complete (used when retrying). opts.replyTo: e.g. the person who submitted a query.
export async function sendAdminEmail(
  subject: string,
  text: string,
  opts: { record?: boolean; rawSubject?: boolean; replyTo?: string } = {}
): Promise<{ ok: boolean; error?: string; transient?: boolean }> {
  const record = opts.record !== false;
  const fullSubject = opts.rawSubject ? subject : `Coach In Mind — ${subject}`;
  const mail = (transient: boolean) => ({ to: ADMIN_INBOX, subject: fullSubject, text, replyTo: opts.replyTo, kind: "admin" as const, transient });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — admin email not sent.");
    if (record) await recordEmailFailure(null, "RESEND_API_KEY is not set", mail(true));
    return { ok: false, error: "Email not configured", transient: true };
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
        to: ADMIN_INBOX,
        reply_to: opts.replyTo || ADMIN_INBOX,
        subject: fullSubject,
        text,
        html: renderEmailHtml(text),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend API error:", detail);
      const transient = res.status === 429 || res.status >= 500;
      if (record) await recordEmailFailure(res.status, detail, mail(transient));
      return { ok: false, error: "Email send failed", transient };
    }

    return { ok: true };
  } catch (err) {
    console.error("Admin email error:", err);
    if (record) await recordEmailFailure(null, String(err), mail(true));
    return { ok: false, error: "Email send failed", transient: true };
  }
}
