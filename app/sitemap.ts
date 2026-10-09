import type { MetadataRoute } from "next";

const base = "https://www.coachinmind.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/club2coach", "/coach2mentor", "/help", "/support", "/terms", "/privacy", "/signup", "/login"].map(
    (path) => ({ url: base + path })
  );
}
