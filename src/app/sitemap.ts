import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = ["", "/our-creations", "/journal", "/terms", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-30T00:00:00+08:00");
  return PUBLIC_ROUTES.map((route) => ({
    url: `https://www.tsokolitaw.com${route || "/"}`,
    lastModified,
    changeFrequency: route === "/journal" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/our-creations" ? 0.9 : 0.6,
  }));
}
