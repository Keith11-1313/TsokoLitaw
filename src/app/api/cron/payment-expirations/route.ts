import { NextResponse } from "next/server";
import { CRON_RESPONSE_HEADERS, isAuthorizedCronRequest } from "@/lib/cron-auth";
import { expireDuePayMongoCheckouts } from "@/lib/server-payment";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CRON_RESPONSE_HEADERS });
  }

  try {
    return NextResponse.json(await expireDuePayMongoCheckouts(), { headers: CRON_RESPONSE_HEADERS });
  } catch (error) {
    console.error("[paymongo-expirations] Scheduled processing failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Unable to process payment expirations" },
      { status: 500, headers: CRON_RESPONSE_HEADERS },
    );
  }
}
