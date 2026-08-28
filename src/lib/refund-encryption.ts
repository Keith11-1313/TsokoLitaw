import "server-only";

import { createCipheriv, randomBytes } from "node:crypto";

export function encryptRefundDestination(value: string) {
  const encodedKey = process.env.REFUND_DESTINATION_ENCRYPTION_KEY?.trim();
  if (!encodedKey) throw new Error("REFUND_DESTINATION_ENCRYPTION_KEY is required.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("REFUND_DESTINATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}
