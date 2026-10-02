import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = [
  "",
  "/our-creations",
  "/journal",
  "/faq",
  "/install",
  "/terms",
  "/privacy",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `https://www.tsokolitaw.com${route || "/"}`,
    changeFrequency: route === "/journal" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/our-creations" ? 0.9 : 0.6,
  }));
}
