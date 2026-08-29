import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchPendingNotifications } from "@/lib/server-notifications";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await dispatchPendingNotifications({ limit: 20 }));
  } catch (error) {
    console.error("[notifications] Scheduled processing failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Unable to process transactional emails" },
      { status: 500 },
    );
  }
}
