import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
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
if (process.argv.includes("--prepare-staff-snapshot")) {
  // Explicit preparation only. Never run SQL or rewrite applied migrations.
  if (policy.version !== "2026-10-20-staff-rbac") throw new Error("Unexpected policy version");
  const target = new URL("supabase/migrations/20261020030000_staff_policy.sql", root);
  if (existsSync(target)) throw new Error("Refusing to overwrite a prepared migration");
  const hash = createHash("md5").update(content).digest("hex");
  const snapshot = `-- Archive the new Staff/Admin policy without rewriting accepted history.\ndo $guard$ begin\n if exists(select 1 from public.terms_versions where version='${policy.version}' and md5(content)<>'${hash}') then raise exception 'Policy version content differs'; end if;\nend $guard$;\nupdate public.terms_versions set is_current=false where is_current and version<>'${policy.version}';\ninsert into public.terms_versions(version,content,effective_at,is_current) values ('${policy.version}',$policy$${content}$policy$,'${policy.effectiveAt}'::timestamptz,true) on conflict(version) do update set is_current=true;\n`;
  writeFileSync(target, snapshot);
  const seed = new URL("supabase/seed.sql", root);
  const previous = readFileSync(seed, "utf8");
  if (!previous.includes(`'${policy.version}'`)) writeFileSync(seed, previous + "\n" + snapshot);
  console.log("Prepared new policy migration and seed; no SQL executed.");
} else if (process.argv.includes("--print")) {
  process.stdout.write(content);
} else {
  const migrationPaths = readdirSync(new URL("supabase/migrations/", root))
    .filter((path) => path.endsWith(".sql"))
    .map((path) => `supabase/migrations/${path}`);
  const matching = migrationPaths.filter((path) =>
    readFileSync(new URL(path, root), "utf8")
      .replaceAll("\r\n", "\n")
      .includes(`$policy$${content}$policy$`),
  );
  if (!matching.length) throw new Error("Current policy is absent from migration history");
  for (const path of ["supabase/seed.sql", ...matching]) {
    const sql = readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
    if (!sql.includes(`$policy$${content}$policy$`) || !sql.includes(`'${policy.version}'`)) {
      throw new Error(`Policy snapshot is out of sync: ${fileURLToPath(new URL(path, root))}`);
    }
  }
  console.log(`Policy ${policy.version}: displayed and SQL snapshot content match.`);
}
