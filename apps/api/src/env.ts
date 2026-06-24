/**
 * Minimal, dependency-free env loader. Loads repo-root .env.local (and apps/api/.env) if present,
 * without overriding already-set process.env. Imported for its side effect before anything else.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(here, "../../../.env.local"), // repo root
  path.resolve(here, "../.env.local"), // apps/api
  path.resolve(here, "../.env"),
];

for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf-8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2] ?? "";
    if (!key) continue;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
