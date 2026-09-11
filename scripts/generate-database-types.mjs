import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const isLocal = args.length === 0 || (args.length === 1 && args[0] === "--local");
const isProject = args.length === 2 && args[0] === "--project-id" && /^[a-z]{20}$/.test(args[1]);
if (!isLocal && !isProject) {
  throw new Error("Use npm run db:types, or npm run db:types -- --project-id <project-ref>.");
}

// Use the installed CLI's Node entry point without a shell. Generate completely
// before replacing the checked-in file; no credentials are accepted here.
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url)),
    "gen",
    "types",
    "typescript",
    ...(isLocal ? ["--local"] : args),
    "--schema",
    "public",
  ],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
  },
);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (
  !result.stdout.startsWith("export type Json") ||
  !result.stdout.includes("export type Database")
) {
  throw new Error("Unexpected type-generator output; the existing file was not changed.");
}
writeFileSync(
  new URL("../src/types/database.generated.ts", import.meta.url),
  "// Generated public schema. Do not edit; regenerate with npm run db:types.\n" +
    result.stdout.trimEnd() +
    "\n",
);
console.log("Updated src/types/database.generated.ts. Run npm run typecheck next.");
