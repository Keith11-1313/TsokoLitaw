export type PayMongoMode = "test" | "live";

export function getPayMongoMode(): PayMongoMode {
  const value = process.env.PAYMONGO_MODE?.trim().toLowerCase();
  if (!value) return "test";
  if (value === "test" || value === "live") return value;
  throw new Error("PAYMONGO_MODE must be either test or live.");
}

export function requirePayMongoSecretKey(mode = getPayMongoMode()) {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim();
  const expectedPrefix = mode === "live" ? "sk_live_" : "sk_test_";
  if (!key?.startsWith(expectedPrefix)) {
    throw new Error(
      `PAYMONGO_SECRET_KEY must be a PayMongo ${mode} secret key when PAYMONGO_MODE=${mode}.`,
    );
  }
  return key;
}
