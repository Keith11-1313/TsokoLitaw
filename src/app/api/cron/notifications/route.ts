import { NextResponse } from "next/server";
import { CRON_RESPONSE_HEADERS, isAuthorizedCronRequest } from "@/lib/cron-auth";
import { dispatchPendingNotifications } from "@/lib/server-notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CRON_RESPONSE_HEADERS });
  }

  try {
    return NextResponse.json(await dispatchPendingNotifications({ limit: 20 }), { headers: CRON_RESPONSE_HEADERS });
  } catch (error) {
    console.error("[notifications] Scheduled processing failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Unable to process transactional emails" },
      { status: 500, headers: CRON_RESPONSE_HEADERS },
    );
  }
}
