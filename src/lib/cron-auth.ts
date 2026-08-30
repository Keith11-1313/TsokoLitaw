import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const CRON_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
} as const;
