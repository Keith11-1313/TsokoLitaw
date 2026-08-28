import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { measureServerOperation } from "@/lib/server-observability";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface RateLimitRow {
  allowed: boolean;
  retry_after_seconds: number;
  remaining_requests: number;
}

export class MutationRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests. Please wait before trying again.");
    this.name = "MutationRateLimitError";
  }
}

function hashBucket(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function getRequestAddress() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-vercel-forwarded-for")
    ?? requestHeaders.get("x-forwarded-for")
    ?? requestHeaders.get("x-real-ip");
  const address = forwarded?.split(",")[0]?.trim();
  return address && address.length <= 100 ? address : null;
}

export async function enforceMutationRateLimit(input: {
  scope: string;
  userId: string;
  maximumRequests: number;
  windowSeconds: number;
}) {
  const address = await getRequestAddress();
  const bucketHashes = [hashBucket(`${input.scope}:user:${input.userId}`)];
  if (address) bucketHashes.push(hashBucket(`${input.scope}:ip:${address}`));

  const supabase = createAdminSupabaseClient();
  const { data, error } = await measureServerOperation("security.mutation-rate-limit", () => supabase.rpc(
    "consume_mutation_rate_limit",
    {
      bucket_key_hashes: bucketHashes,
      maximum_requests: input.maximumRequests,
      window_seconds: input.windowSeconds,
    },
  ));

  if (error) {
    throw new Error("Request protection is temporarily unavailable.", { cause: error });
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
  if (!row) throw new Error("Request protection did not return a decision.");
  if (!row.allowed) throw new MutationRateLimitError(Math.max(row.retry_after_seconds, 1));
}
