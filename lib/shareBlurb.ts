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
  <img src="${logoUrl}" alt="Coach In Mind" width="110" style="display:block; margin-bottom: 18px;" />
  <p>Hi,</p>
  <p>I wanted to share <strong>Coach In Mind</strong> — an Australian platform that properly matches football clubs, coaches and mentors, instead of relying on group chats and word-of-mouth.</p>
  <ul style="padding-left: 20px; margin: 12px 0;">
    <li style="margin-bottom: 6px;"><strong>Club2Coach</strong> — clubs get matched with accredited coaches, scored on accreditation, competition level, age group and region.</li>
    <li><strong>Coach2Mentor</strong> — coaches connect directly with experienced mentors for guidance and development.</li>
  </ul>
  <p>Have a look here: <a href="${url}" style="color: #191B41; font-weight: bold;">${url}</a></p>
  <p style="margin-top: 20px;">Kind regards,<br/>The Coach In Mind Team</p>
</div>`.trim();

  const text = [
    "Coach In Mind — an Australian platform that properly matches football clubs, coaches and mentors, instead of relying on group chats and word-of-mouth.",
    "",
    "- Club2Coach: clubs get matched with accredited coaches, scored on accreditation, competition level, age group and region.",
    "- Coach2Mentor: coaches connect directly with experienced mentors for guidance and development.",
    "",
    `Have a look here: ${url}`,
    "",
    "Kind regards,",
    "The Coach In Mind Team",
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
