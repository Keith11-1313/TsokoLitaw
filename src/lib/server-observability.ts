import "server-only";

const SLOW_OPERATION_MS = 500;
const PRODUCTION_SAMPLE_RATE = 0.1;

function shouldLog(durationMs: number, failed: boolean) {
  return process.env.NODE_ENV !== "production"
    || failed
    || durationMs >= SLOW_OPERATION_MS
    || Math.random() < PRODUCTION_SAMPLE_RATE;
}

export async function measureServerOperation<T>(
  operation: string,
  run: () => PromiseLike<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await run();
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    if (shouldLog(durationMs, false)) {
      console.info("[performance]", {
        operation,
        durationMs,
        outcome: "success",
      });
    }
    return result;
  } catch (error) {
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    if (shouldLog(durationMs, true)) {
      console.error("[performance]", {
        operation,
        durationMs,
        outcome: "error",
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    }
    throw error;
  }
}
