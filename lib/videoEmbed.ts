// Turns a YouTube/Loom/Vimeo link a mentor pastes into an embeddable
// player URL. Returns null for anything it doesn't recognise, so
// callers can fall back to a plain link instead of a broken iframe.
export function getEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  // youtube.com/watch?v=VIDEO_ID or youtube.com/embed/VIDEO_ID or /shorts/VIDEO_ID
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const embedMatch = url.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[2]}`;
    return null;
  }

  // vimeo.com/VIDEO_ID
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") {
    return url.href; // already an embed URL
  }

  // loom.com/share/VIDEO_ID
  if (host === "loom.com") {
    const shareMatch = url.pathname.match(/^\/share\/([^/]+)/);
    if (shareMatch) return `https://www.loom.com/embed/${shareMatch[1]}`;
    const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) return url.href;
    return null;
  }

  return null;
}
