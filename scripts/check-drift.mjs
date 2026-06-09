#!/usr/bin/env node
// Enforce-in-code the write-a-skill gate rules that prose can't guarantee (premortem #1, #3, #9):
//   - plugin.json, install-profiles.json parse as JSON
//   - every shipped skill exists on disk with a SKILL.md
//   - every non-hidden skill on disk is shipped (no orphans; hidden buckets are exempt)
//   - every shipped skill appears in >=1 install profile
//   - every shipped skill has an eval (evals/<name>.eval.md)
//   - every profile path exists on disk
//   - the catalog is under the cap (<= CAP)
// Exit 0 = clean, exit 2 = drift (so it works as a CI gate AND a strict PostToolUse hook).

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const CAP = 30;
const HIDDEN = new Set(["in-progress", "deprecated", "personal"]);
const errors = [];

function readJSON(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { errors.push(`cannot parse ${p}: ${e.message}`); return null; }
}
const norm = (p) => p.replace(/^\.\//, "").replace(/\/$/, "");

// Find every skill dir on disk (a dir containing SKILL.md) under skills/.
function findSkillDirs(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  if (entries.some((e) => e.isFile() && e.name === "SKILL.md")) acc.push(norm(dir));
  for (const e of entries) if (e.isDirectory()) findSkillDirs(join(dir, e.name), acc);
  return acc;
}

const plugin = readJSON("plugin.json".replace("plugin.json", ".claude-plugin/plugin.json"));
const profiles = readJSON("manifests/install-profiles.json");

if (plugin) {
  const shipped = (plugin.skills || []).map(norm);

  // cap
  if (shipped.length > CAP) errors.push(`catalog over cap: ${shipped.length} shipped skills > ${CAP}. Deprecate before adding.`);

  // shipped -> disk + SKILL.md + eval
  for (const s of shipped) {
    if (!existsSync(s)) { errors.push(`shipped skill missing on disk: ${s}`); continue; }
    if (!existsSync(join(s, "SKILL.md"))) errors.push(`shipped skill has no SKILL.md: ${s}`);
    const name = basename(s);
    const evalPath = join("evals", `${name}.eval.md`);
    if (!existsSync(evalPath)) errors.push(`shipped skill "${name}" has no eval (expected ${evalPath}) — the gate requires one`);
  }

  // shipped -> in a profile
  if (profiles) {
    const inAnyProfile = new Set(
      Object.values(profiles.profiles || {}).flatMap((p) => (p.skills || []).map(norm))
    );
    for (const s of shipped) {
      if (!inAnyProfile.has(s)) errors.push(`shipped skill not in any install profile: ${s}`);
    }
  }

  // disk -> shipped (orphans), excluding hidden buckets
  const onDisk = findSkillDirs("skills");
  const shippedSet = new Set(shipped);
  for (const d of onDisk) {
    const hidden = d.split("/").some((seg) => HIDDEN.has(seg));
    if (!hidden && !shippedSet.has(d)) {
      errors.push(`skill on disk not shipped (register it in plugin.json, or move to a hidden bucket): ${d}`);
    }
  }
}

// profile paths exist
if (profiles) {
  for (const [name, p] of Object.entries(profiles.profiles || {})) {
    for (const s of (p.skills || []).map(norm)) {
      if (!existsSync(s)) errors.push(`profile "${name}" references missing skill: ${s}`);
    }
  }
}

if (errors.length) {
  console.error(`✖ Mixture drift check failed (${errors.length}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(2);
}
const n = (plugin?.skills || []).length;
console.log(`✓ No drift. ${n}/${CAP} skills shipped, all registered + eval-backed + in a profile.`);
