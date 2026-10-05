import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const policy = JSON.parse(readFileSync(new URL("src/content/policies.json", root), "utf8"));
const content = [
  `TsokoLitaw checkout policies — version ${policy.version}`,
  `Last updated: ${policy.lastUpdated}`,
  ...[
    { title: "Terms & Conditions", sections: policy.terms },
    { title: "Privacy Policy", sections: policy.privacy },
  ].flatMap(({ title, sections }) => [
    title,
    ...sections.flatMap(({ heading, paragraphs }) => [heading, ...paragraphs]),
  ]),
].join("\n\n");

// Print only for preparing a reviewed migration/seed update, never run SQL.
if (process.argv.includes("--print")) {
  process.stdout.write(content);
} else {
  for (const path of [
    "supabase/seed.sql",
    "supabase/migrations/20261005010000_review_privacy_and_policy.sql",
  ]) {
    const sql = readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
    if (!sql.includes(`$policy$${content}$policy$`) || !sql.includes(`'${policy.version}'`)) {
      throw new Error(`Policy snapshot is out of sync: ${fileURLToPath(new URL(path, root))}`);
    }
  }
  console.log(`Policy ${policy.version}: displayed and SQL snapshot content match.`);
}
