#!/usr/bin/env node
/**
 * Idempotently merge KEY=VALUE lines from a patch file into a target .env.
 * Existing keys are replaced (value updated); missing keys are appended.
 * Values are treated literally (no shell interpolation).
 *
 * Usage:
 *   node scripts/merge-env.mjs <patchFile> [targetEnv]
 *   node scripts/merge-env.mjs /tmp/patch.env /opt/studio-neeklo/backend/.env
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const patchPath = process.argv[2];
const targetPath = process.argv[3] ?? ".env";

if (!patchPath) {
  console.error("Usage: node scripts/merge-env.mjs <patchFile> [targetEnv]");
  process.exit(1);
}

const parse = (text) => {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    map.set(line.slice(0, eq).trim(), line.slice(eq + 1));
  }
  return map;
};

const patch = parse(readFileSync(patchPath, "utf8"));
const existingText = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
const lines = existingText.split(/\r?\n/);

const seen = new Set();
const out = lines.map((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return line;
  const eq = t.indexOf("=");
  if (eq === -1) return line;
  const key = t.slice(0, eq).trim();
  if (patch.has(key)) {
    seen.add(key);
    return `${key}=${patch.get(key)}`;
  }
  return line;
});

for (const [key, value] of patch) {
  if (!seen.has(key)) out.push(`${key}=${value}`);
}

writeFileSync(targetPath, out.join("\n").replace(/\n{3,}/g, "\n\n"));
console.log(`Merged ${patch.size} key(s) into ${targetPath}: ${[...patch.keys()].join(", ")}`);
