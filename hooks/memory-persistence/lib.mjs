// Shared store for the memory-persistence lifecycle (L3).
// Contract: durable facts only, stored OUTSIDE the context window, idempotent, bounded.
// Dependency-free. Pluggable backend via MIXTURE_MEMORY_BACKEND:
//   json   (default) — a single JSON file; works on Node >=18.
//   sqlite           — a local SQLite db via the BUILT-IN node:sqlite; needs Node >=22, still zero-dep.
// load/save/clean call readStore()/writeStore() and don't care which backend is active.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash, } from "node:crypto";
import { createRequire } from "node:module";

const DIR = process.env.MIXTURE_MEMORY_DIR || join(process.cwd(), ".mixture", "memory");
const BACKEND = (process.env.MIXTURE_MEMORY_BACKEND || "json").toLowerCase();
const STORE_JSON = join(DIR, "store.json");
const STORE_DB = join(DIR, "store.db");

export const VALID_TYPES = new Set(["decision", "goal", "glossary", "constraint", "fact"]);

// Idempotency: identity is the hash of the normalized text. Re-adding the same fact is a no-op
// (it refreshes ts and merges flags), so save can run twice with the same result.
export function keyOf(text) {
  const norm = String(text).trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(norm).digest("hex").slice(0, 16);
}

export function sortEntries(a, b) {
  if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
  return (b.ts || 0) - (a.ts || 0);
}

// --- backend dispatch ------------------------------------------------------
export function readStore() {
  return BACKEND === "sqlite" ? sqliteRead() : jsonRead();
}
export function writeStore(entries) {
  const sorted = [...entries].sort(sortEntries); // stable order: pinned first, then newest
  return BACKEND === "sqlite" ? sqliteWrite(sorted) : jsonWrite(sorted);
}
export const storePath = () => (BACKEND === "sqlite" ? STORE_DB : STORE_JSON);

// --- json backend ----------------------------------------------------------
function jsonRead() {
  if (!existsSync(STORE_JSON)) return [];
  try {
    const data = JSON.parse(readFileSync(STORE_JSON, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return []; // corrupt store must not crash a session hook
  }
}
function jsonWrite(sorted) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(STORE_JSON, JSON.stringify(sorted, null, 2) + "\n");
  return sorted;
}

// --- sqlite backend (built-in node:sqlite, lazy-loaded so json works on Node 18) ---
let _sqlite;
function sqliteMod() {
  if (_sqlite) return _sqlite;
  try { _sqlite = createRequire(import.meta.url)("node:sqlite"); return _sqlite; }
  catch {
    throw new Error("MIXTURE_MEMORY_BACKEND=sqlite requires Node >=22.13 (node:sqlite is flagged --experimental-sqlite on 22.5–22.12). Use the json backend or upgrade Node.");
  }
}
function withDb(fn) {
  const { DatabaseSync } = sqliteMod();
  mkdirSync(DIR, { recursive: true });
  const db = new DatabaseSync(STORE_DB);
  db.exec("CREATE TABLE IF NOT EXISTS memory (id TEXT PRIMARY KEY, text TEXT NOT NULL, type TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL)");
  try { return fn(db); } finally { db.close(); }
}
function sqliteRead() {
  return withDb((db) =>
    db.prepare("SELECT id, text, type, pinned, ts FROM memory").all()
      .map((r) => ({ id: r.id, text: r.text, type: r.type, pinned: !!r.pinned, ts: r.ts })));
}
function sqliteWrite(sorted) {
  return withDb((db) => {
    db.exec("BEGIN");
    db.exec("DELETE FROM memory");
    const ins = db.prepare("INSERT INTO memory (id, text, type, pinned, ts) VALUES (?, ?, ?, ?, ?)");
    for (const e of sorted) ins.run(e.id, e.text, e.type, e.pinned ? 1 : 0, e.ts);
    db.exec("COMMIT");
    return sorted;
  });
}

// Idempotent upsert keyed by content hash. Returns {entries, added:boolean}.
export function upsert(entries, { text, type = "fact", pinned = false, ts = Date.now() }) {
  if (!text || !String(text).trim()) return { entries, added: false };
  const t = VALID_TYPES.has(type) ? type : "fact";
  const id = keyOf(text);
  const existing = entries.find((e) => e.id === id);
  if (existing) {
    existing.ts = ts;                            // refresh recency
    existing.pinned = existing.pinned || pinned; // pin is sticky
    if (VALID_TYPES.has(type)) existing.type = t;
    return { entries, added: false };
  }
  entries.push({ id, text: String(text).trim(), type: t, pinned: !!pinned, ts });
  return { entries, added: true };
}

export { DIR, BACKEND };
