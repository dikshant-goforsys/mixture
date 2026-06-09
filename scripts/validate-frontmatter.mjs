#!/usr/bin/env node
// Enforce-in-code the machine-checkable subset of the routing contract (premortem #3:
// prose can't guarantee invariants; code can). Walks skills/, validates every SKILL.md.
// Exit 0 = all valid, exit 2 = violations (so it can gate a PreToolUse hook).

import { readdir, readFile } from "node:fs/promises";
import { join, basename, dirname } from "node:path";

const SKILLS_DIR = "skills";
const MAX_DESC = 1024;
const errors = [];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name === "SKILL.md") yield p;
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

for await (const file of walk(SKILLS_DIR)) {
  const text = await readFile(file, "utf8");
  const fm = parseFrontmatter(text);
  const skillDir = basename(dirname(file));
  const where = file;

  if (!fm) { errors.push(`${where}: missing YAML frontmatter`); continue; }
  if (!fm.name) errors.push(`${where}: missing 'name'`);
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name))
    errors.push(`${where}: 'name' must be kebab-case (got "${fm.name}")`);
  else if (fm.name !== skillDir)
    errors.push(`${where}: 'name' ("${fm.name}") must match directory ("${skillDir}")`);

  if (!fm.description) errors.push(`${where}: missing 'description' (the routing contract)`);
  else {
    if (fm.description.length > MAX_DESC)
      errors.push(`${where}: description ${fm.description.length} chars > ${MAX_DESC}`);
    if (!/use when/i.test(fm.description))
      errors.push(`${where}: description should contain "Use when [triggers]" so the model can route to it`);
  }

  // Optional fields (Agent Skills spec): validate only when present.
  if (fm["disable-model-invocation"] !== undefined && !/^(true|false)$/.test(fm["disable-model-invocation"]))
    errors.push(`${where}: 'disable-model-invocation' must be true or false (got "${fm["disable-model-invocation"]}")`);
  if (fm["allowed-tools"] !== undefined && fm["allowed-tools"] === "")
    errors.push(`${where}: 'allowed-tools' is present but empty — remove it or list tools`);
}

if (errors.length) {
  console.error(`✖ Mixture frontmatter validation failed (${errors.length}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(2);
}
console.log("✓ All SKILL.md routing contracts valid.");
