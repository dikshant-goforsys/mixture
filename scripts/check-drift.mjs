#!/usr/bin/env node
// Enforce-in-code the write-a-skill gate rules that prose can't guarantee (premortem #1, #3, #9).
//
// Two severities, because incremental authoring legitimately passes through incomplete states
// (you must write SKILL.md BEFORE registering it, register BEFORE the eval exists, etc. — ADR-0002):
//
//   HARD = structural breakage that must never exist, even mid-edit:
//          broken JSON, a shipped skill or profile pointing at a missing path, cap exceeded.
//   SOFT = completeness gaps that are transient while authoring:
//          orphan on disk, shipped skill with no eval, shipped skill not in a profile.
//
// Modes:
//   default (at-your-side hook): HARD -> exit 2 (block real breakage); SOFT -> warn, exit 0.
//   --ci / MIXTURE_DRIFT_STRICT=1 (the enforcement boundary): ANY issue -> exit 2.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const CAP = 30;
const HIDDEN = new Set(["in-progress", "deprecated", "personal"]);
const CI = process.argv.includes("--ci") || process.env.MIXTURE_DRIFT_STRICT === "1";

const hard = [];
const soft = [];

function readJSON(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { hard.push(`cannot parse ${p}: ${e.message}`); return null; }
}
const norm = (p) => p.replace(/^\.\//, "").replace(/\/$/, "");

// Every skill dir on disk (a dir containing SKILL.md) under skills/.
function findSkillDirs(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  if (entries.some((e) => e.isFile() && e.name === "SKILL.md")) acc.push(norm(dir));
  for (const e of entries) if (e.isDirectory()) findSkillDirs(join(dir, e.name), acc);
  return acc;
}

const plugin = readJSON(".claude-plugin/plugin.json");
const profiles = readJSON("manifests/install-profiles.json");

if (plugin) {
  const shipped = (plugin.skills || []).map(norm);

  if (shipped.length > CAP) hard.push(`catalog over cap: ${shipped.length} > ${CAP}. Deprecate before adding.`);

  for (const s of shipped) {
    if (!existsSync(s)) { hard.push(`shipped skill missing on disk: ${s}`); continue; }
    if (!existsSync(join(s, "SKILL.md"))) hard.push(`shipped skill has no SKILL.md: ${s}`);
    const name = basename(s);
    if (!existsSync(join("evals", `${name}.eval.md`)))
      soft.push(`shipped skill "${name}" has no eval (expected evals/${name}.eval.md) — the gate requires one before merge`);
  }

  if (profiles) {
    const inAnyProfile = new Set(
      Object.values(profiles.profiles || {}).flatMap((p) => (p.skills || []).map(norm))
    );
    for (const s of shipped) {
      if (!inAnyProfile.has(s)) soft.push(`shipped skill not in any install profile: ${s}`);
    }
  }

  const shippedSet = new Set(shipped);
  for (const d of findSkillDirs("skills")) {
    const hidden = d.split("/").some((seg) => HIDDEN.has(seg));
    if (!hidden && !shippedSet.has(d))
      soft.push(`skill on disk not yet shipped (register it in plugin.json, or move to a hidden bucket): ${d}`);
  }
}

if (profiles) {
  for (const [name, p] of Object.entries(profiles.profiles || {})) {
    for (const s of (p.skills || []).map(norm)) {
      if (!existsSync(s)) hard.push(`profile "${name}" references missing skill: ${s}`);
    }
  }
}

// Report.
for (const w of soft) console.error(`${CI ? "✖" : "⚠"} ${w}`);
for (const e of hard) console.error(`✖ ${e}`);

const fatal = CI ? hard.length + soft.length : hard.length;
if (fatal > 0) {
  console.error(`✖ drift check failed (${hard.length} structural${CI ? `, ${soft.length} completeness` : ""}).`);
  process.exit(2);
}
const n = (plugin?.skills || []).length;
const note = soft.length ? ` (${soft.length} completeness warning${soft.length > 1 ? "s" : ""} — fatal in CI)` : "";
console.log(`✓ No structural drift. ${n}/${CAP} skills shipped${note}.`);
