#!/usr/bin/env node
// Persist durable facts. Two modes:
//
//   1. Explicit add (use during a session, or wire as a tiny tool):
//        node save.mjs --add "We chose Postgres over SQLite for multi-writer support" --type decision --pin
//
//   2. PreCompact hook (no add args): consolidate + dedupe the store in place before the context
//      window is compacted. Claude Code passes hook JSON on stdin; we ignore its shape safely and
//      just snapshot — extracting facts from a transcript needs an LLM and is out of scope here.
//
// Idempotent in both modes (content-hash keyed). Never throws on bad input — a session hook must not fail.

import { readStore, writeStore, upsert, VALID_TYPES } from "./lib.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}

const addText = arg("--add");
const type = arg("--type") || "fact";
const pinned = process.argv.includes("--pin");

const entries = readStore();

if (addText) {
  const { added } = upsert(entries, { text: addText, type, pinned });
  const saved = writeStore(entries);
  console.error(`${added ? "added" : "refreshed"} (${saved.length} total)`);
  process.exit(0);
}

// PreCompact / bulk mode: accept optional stdin JSON {entries:[{text,type,pinned}]}; otherwise snapshot.
let stdin = "";
try {
  if (!process.stdin.isTTY) stdin = await read(process.stdin);
} catch { /* ignore */ }

if (stdin.trim()) {
  try {
    const payload = JSON.parse(stdin);
    if (Array.isArray(payload?.entries)) {
      for (const e of payload.entries) {
        upsert(entries, { text: e.text, type: VALID_TYPES.has(e.type) ? e.type : "fact", pinned: !!e.pinned });
      }
    }
  } catch { /* not our format (e.g. a hook payload) — fall through to snapshot */ }
}

const saved = writeStore(entries); // dedupe + stable re-sort = idempotent consolidation
console.error(`consolidated (${saved.length} total)`);

function read(stream) {
  return new Promise((resolve, reject) => {
    let d = "";
    stream.setEncoding("utf8");
    stream.on("data", (c) => (d += c));
    stream.on("end", () => resolve(d));
    stream.on("error", reject);
  });
}
