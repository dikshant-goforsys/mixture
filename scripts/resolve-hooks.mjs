#!/usr/bin/env node
// L3 hook governance: resolve the annotated hooks/hooks.json into a Claude Code-consumable
// settings fragment, filtered by env — never by editing the source file (premortem #3).
//
//   MIXTURE_HOOK_PROFILE   off | standard | strict   (default: standard)
//   MIXTURE_DISABLED_HOOKS comma-separated _name list (default: none)
//
// Usage:
//   node scripts/resolve-hooks.mjs            # print the resolved {hooks:...} for the active profile
//   node scripts/resolve-hooks.mjs --explain  # + per-hook active/skipped trace on stderr
//   node scripts/resolve-hooks.mjs --check     # validate ALL profiles resolve cleanly (CI gate)

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RANK = { off: 0, standard: 1, strict: 2 };
const SRC = process.env.MIXTURE_HOOKS_FILE || join(process.cwd(), "hooks", "hooks.json");

function fail(msg) { console.error("✖ resolve-hooks: " + msg); process.exit(2); }

function loadSource() {
  let src;
  try { src = JSON.parse(readFileSync(SRC, "utf8")); }
  catch (e) { fail(`cannot parse ${SRC}: ${e.message}`); }
  if (!src.hooks || typeof src.hooks !== "object") fail(`${SRC} has no "hooks" object`);
  return src;
}

// Returns { hooks, trace }. Validates structure; calls fail() on any malformed entry.
function resolve(profileName, disabled) {
  if (!(profileName in RANK)) fail(`invalid profile "${profileName}" (off|standard|strict)`);
  const active = RANK[profileName];
  const src = loadSource();
  const out = {};
  const trace = [];
  for (const [event, entries] of Object.entries(src.hooks)) {
    if (!Array.isArray(entries)) fail(`event "${event}" must be an array`);
    for (const entry of entries) {
      const name = entry._name || "(unnamed)";
      const prof = entry._profile || "standard";
      if (!(prof in RANK)) fail(`hook "${name}" has invalid _profile "${prof}"`);
      if (!entry.command) fail(`hook "${name}" is missing "command"`);
      const isDisabled = disabled.includes(name);
      const inProfile = active > 0 && RANK[prof] <= active;
      if (!inProfile || isDisabled) {
        trace.push(`  skip  ${event}/${name} — ${isDisabled ? "disabled" : active === 0 ? "profile=off" : `needs ${prof}`}`);
        continue;
      }
      const cmd = { type: "command", command: entry.command };
      const wrapper = entry.matcher ? { matcher: entry.matcher, hooks: [cmd] } : { hooks: [cmd] };
      (out[event] ||= []).push(wrapper);
      trace.push(`  on    ${event}/${name} (${prof})`);
    }
  }
  return { hooks: out, trace };
}

const disabled = (process.env.MIXTURE_DISABLED_HOOKS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

if (process.argv.includes("--check")) {
  for (const p of ["off", "standard", "strict"]) {
    const { hooks } = resolve(p, disabled);
    const count = Object.values(hooks).reduce((n, a) => n + a.length, 0);
    console.error(`✓ profile "${p}" resolves (${count} active hooks)`);
  }
  process.exit(0);
}

const profile = process.env.MIXTURE_HOOK_PROFILE || "standard";
const { hooks, trace } = resolve(profile, disabled);
if (process.argv.includes("--explain")) {
  console.error(`profile=${profile} disabled=[${disabled.join(",")}]`);
  console.error(trace.join("\n"));
}
process.stdout.write(JSON.stringify({ hooks }, null, 2) + "\n");
