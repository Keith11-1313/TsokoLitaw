import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireDuePayMongoCheckouts } from "@/lib/server-payment";

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
    return NextResponse.json(await expireDuePayMongoCheckouts());
  } catch (error) {
    console.error("[paymongo-expirations] Scheduled processing failed", error);
    return NextResponse.json(
      { error: "Unable to process payment expirations" },
      { status: 500 },
    );
  }
}
