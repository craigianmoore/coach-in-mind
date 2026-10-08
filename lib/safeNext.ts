// Only allow same-site relative redirects (e.g. "/profile"), never "//evil.com" or "https://...".
export function safeNext(raw: string | null | undefined, fallback: string | null = null): string | null {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
