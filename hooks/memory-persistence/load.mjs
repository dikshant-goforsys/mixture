#!/usr/bin/env node
// SessionStart hook: restore prior durable context by printing a markdown digest to stdout
// (Claude Code injects a SessionStart hook's stdout into the session context).
// Read-only. Pinned facts first, then most-recent, capped so we never flood the window.

import { readStore, sortEntries } from "./lib.mjs";

const rawLimit = Number(process.env.MIXTURE_MEMORY_LOAD_LIMIT);
const LIMIT = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50; // NaN -> slice(0, NaN) = [] would silently restore nothing
const entries = readStore().sort(sortEntries).slice(0, LIMIT);

if (entries.length === 0) process.exit(0); // nothing to restore; stay silent

const byType = {};
for (const e of entries) (byType[e.type] ||= []).push(e);

const lines = ["## Restored memory (Mixture)", ""];
for (const type of ["goal", "decision", "constraint", "glossary", "fact"]) {
  const items = byType[type];
  if (!items?.length) continue;
  lines.push(`### ${type[0].toUpperCase() + type.slice(1)}`);
  for (const e of items) lines.push(`- ${e.pinned ? "📌 " : ""}${e.text}`);
  lines.push("");
}
process.stdout.write(lines.join("\n"));
