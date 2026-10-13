// Server-only generic transactional email via Resend. Used for emails
// to coaches and clubs (submission confirmations, "you've been matched").
// Sender is the verified coachinmind.com.au address; replies go to the
// Coach In Mind inbox. Never throws.
import { renderEmailHtml } from "./emailHtml";
import { recordEmailFailure } from "./emailFailures";

export const APP_URL = "https://www.coachinmind.com.au";

export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<boolean> {
  return (await sendEmailDetailed(opts)).ok;
}

// Same as sendEmail but also says whether a failure was temporary (quota, rate limit, Resend down,
// network) so callers can pause and retry later. By default a failure is saved to the retry queue
// (record: false for callers that manage their own retries, such as the invitation sender, and
// for the retry job itself).
export async function sendEmailDetailed(
  opts: { to: string; subject: string; text: string },
  o: { record?: boolean } = {}
): Promise<{ ok: boolean; transient: boolean }> {
  const record = o.record !== false;
  const mail = (transient: boolean) => ({ to: opts.to, subject: opts.subject, text: opts.text, kind: "user" as const, transient });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — email not sent.");
    if (record) await recordEmailFailure(null, "RESEND_API_KEY is not set", mail(true));
    return { ok: false, transient: true };
  }
  const full = `${opts.text}\n\n—\nThe Coach In Mind team\n${APP_URL}\nQuestions? Just reply to this email.`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Coach In Mind <hello@coachinmind.com.au>",
        to: opts.to,
        reply_to: "coachinmindcim@gmail.com",
        subject: opts.subject,
        text: full,
        html: renderEmailHtml(full),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend API error:", detail);
      const transient = res.status === 429 || res.status >= 500;
      if (record) await recordEmailFailure(res.status, detail, mail(transient));
      return { ok: false, transient };
    }
    return { ok: true, transient: false };
  } catch (err) {
    console.error("sendEmail error:", err);
    if (record) await recordEmailFailure(null, String(err), mail(true));
    return { ok: false, transient: true };
  }
}
