// Wraps a plain-text email body in a simple branded HTML layout (logo
// header). The plain text is still sent alongside as the fallback.
const LOGO_URL = "https://www.coachinmind.com.au/coach-in-mind-logo.png";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderEmailHtml(text: string): string {
  const body = text
    .split(/\n{2,}/)
    .map((para) => {
      const html = esc(para)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1d4ed8">$1</a>')
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 14px;line-height:1.5">${html}</p>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f1e6">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:#1f2937">
<div style="text-align:center;padding-bottom:16px"><img src="${LOGO_URL}" alt="Coach In Mind" height="120" style="height:120px;width:auto;border:0"></div>
<div style="background:#ffffff;border-radius:12px;padding:24px">${body}</div>
</div></body></html>`;
}
