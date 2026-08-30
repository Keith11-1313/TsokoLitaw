const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function getConfiguredSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required.");
  }

  const url = new URL(configured);
  if (url.protocol !== "https:" && !LOCAL_HOSTNAMES.has(url.hostname)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }

  return url.origin;
}

export function getTrustedRequestOrigin(requestUrl: URL) {
  if (process.env.NODE_ENV === "development") return requestUrl.origin;
  return getConfiguredSiteOrigin();
}
