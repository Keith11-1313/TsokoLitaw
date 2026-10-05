import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import policy from "@/content/policies.json";
import { getPolicyContent, POLICY_VERSION } from "./policy-content";

describe("checkout policy snapshot", () => {
  it("archives every displayed Terms and Privacy paragraph verbatim", () => {
    const content = getPolicyContent();
    expect(POLICY_VERSION).toBe(policy.version);
    for (const section of [...policy.terms, ...policy.privacy]) {
      expect(content).toContain(section.heading);
      for (const paragraph of section.paragraphs) expect(content).toContain(paragraph);
    }
    expect(content).not.toContain("window and grace period");
  });

  it("matches the reviewed migration and clean seed exactly", () => {
    for (const path of [
      "supabase/seed.sql",
      "supabase/migrations/20260911010000_pre_v1_baseline.sql",
    ]) {
      const sql = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
      expect(sql).toContain(`$policy$${getPolicyContent()}$policy$`);
      expect(sql).toContain(`\x27${POLICY_VERSION}\x27`);
    }
  });
});
