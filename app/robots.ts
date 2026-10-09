import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/profile", "/club2coach/admin", "/coach2mentor/admin"] }],
    sitemap: "https://www.coachinmind.com.au/sitemap.xml",
  };
}
