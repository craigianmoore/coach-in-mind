// A ready-to-paste email blurb introducing Coach In Mind, used by the
// "Share" button on both admin pages. Copies rich HTML (with the logo
// and a clickable link) alongside a plain-text fallback, so it lands
// nicely whether it's pasted into Gmail/Outlook or a plain-text field.
//
// `origin` is window.location.origin, passed in by the caller rather
// than read here, since this module may be imported into code that
// isn't guaranteed to run in the browser.
export function buildShareBlurb(origin: string) {
  const url = `${origin}/`;
  const logoUrl = `${origin}/coach-in-mind-logo.png`;

  const html = `
<div style="font-family: Arial, Helvetica, sans-serif; color: #2A2E3A; max-width: 540px; line-height: 1.55;">
  <p>Hi,</p>
  <p>I wanted to share <strong>Coach In Mind</strong> — an Australian platform that properly matches football clubs, coaches and mentors, instead of relying on group chats and word-of-mouth.</p>
  <ul style="padding-left: 20px; margin: 12px 0;">
    <li style="margin-bottom: 6px;"><strong>Club2Coach</strong> — clubs get matched with accredited coaches, scored on accreditation, competition level, age group and region.</li>
    <li><strong>Coach2Mentor</strong> — coaches connect directly with experienced mentors for guidance and development.</li>
  </ul>
  <p>Clubs get their first introduction free, and the first 60 coaches get a free founding credit — so it costs nothing to try.</p>
  <p>Have a look here: <a href="${url}" style="color: #191B41; font-weight: bold;">${url}</a></p>
  <p style="margin-top: 20px;">Kind regards,<br/>The Coach In Mind Team</p>
  <img src="${logoUrl}" alt="Coach In Mind" width="110" style="display:block; margin-top: 18px;" />
  <p style="margin-top: 18px; font-size: 12px; color: #6B7280;">Sent by Coach In Mind (${origin.replace(/^https?:\/\//, "")}). Not relevant to you? Just reply with "unsubscribe" and we won't contact you again.</p>
</div>`.trim();

  const text = [
    "Coach In Mind — an Australian platform that properly matches football clubs, coaches and mentors, instead of relying on group chats and word-of-mouth.",
    "",
    "- Club2Coach: clubs get matched with accredited coaches, scored on accreditation, competition level, age group and region.",
    "- Coach2Mentor: coaches connect directly with experienced mentors for guidance and development.",
    "",
    "Clubs get their first introduction free, and the first 60 coaches get a free founding credit — so it costs nothing to try.",
    "",
    `Have a look here: ${url}`,
    "",
    "Kind regards,",
    "The Coach In Mind Team",
    "",
    `Sent by Coach In Mind (${origin.replace(/^https?:\/\//, "")}). Not relevant to you? Just reply with "unsubscribe" and we won't contact you again.`,
  ].join("\n");

  return { html, text };
}

// Writes the blurb to the clipboard as both HTML and plain text where
// supported (Chrome/Edge/Safari), so pasting into an email client keeps
// the logo and formatting; falls back to plain text, then to a
// copyable prompt if the Clipboard API is blocked entirely.
export async function copyShareBlurbToClipboard(origin: string) {
  const { html, text } = buildShareBlurb(origin);
  try {
    if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return;
    }
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt("Copy this to share:", text);
  }
}

// Short text-message version with the sign-up link. On a phone this opens
// the native share sheet (Messages, WhatsApp, etc.); where that isn't
// available it falls back to a pre-filled SMS, then to copying the text.
export async function shareJoinByText(origin: string): Promise<"shared" | "sms" | "copied" | "cancelled"> {
  const url = `${origin}/signup`;
  const text = `Hi, have a look at Coach In Mind, which matches football clubs, coaches and mentors. The first 60 coaches get a free founding credit, so it costs nothing to try. Sign up free here: ${url}`;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ text });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
  }
  if (typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
    return "sms";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    window.prompt("Copy this to share:", text);
    return "copied";
  }
}
