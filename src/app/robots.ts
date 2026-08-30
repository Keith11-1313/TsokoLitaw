import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/our-creations", "/journal", "/terms", "/privacy"],
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/cart",
        "/checkout",
        "/login",
        "/orders/",
        "/payment/",
        "/profile",
        "/boneyard-preview",
      ],
    },
    sitemap: "https://tsokolitaw.com/sitemap.xml",
    host: "https://tsokolitaw.com",
  };
}
