// Shared store for the memory-persistence lifecycle (L3).
// Contract: durable facts only, stored OUTSIDE the context window, idempotent, bounded.
// Dependency-free (node builtins only). The store is local state — gitignored.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const DIR = process.env.MIXTURE_MEMORY_DIR || join(process.cwd(), ".mixture", "memory");
const STORE = join(DIR, "store.json");

export const VALID_TYPES = new Set(["decision", "goal", "glossary", "constraint", "fact"]);

// Idempotency: identity is the hash of the normalized text. Re-adding the same fact is a no-op
// (it refreshes ts and merges flags), so save can run twice with the same result.
export function keyOf(text) {
  const norm = String(text).trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(norm).digest("hex").slice(0, 16);
}

export function readStore() {
  if (!existsSync(STORE)) return [];
  try {
    const data = JSON.parse(readFileSync(STORE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return []; // corrupt store must not crash a session hook
  }
}

export function writeStore(entries) {
  mkdirSync(DIR, { recursive: true });
  // Stable order on disk: pinned first, then newest — keeps diffs/readability sane.
  const sorted = [...entries].sort(sortEntries);
  writeFileSync(STORE, JSON.stringify(sorted, null, 2) + "\n");
  return sorted;
}

export function sortEntries(a, b) {
  if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
  return (b.ts || 0) - (a.ts || 0);
}

// Idempotent upsert keyed by content hash. Returns {entries, added:boolean}.
export function upsert(entries, { text, type = "fact", pinned = false, ts = Date.now() }) {
  if (!text || !String(text).trim()) return { entries, added: false };
  const t = VALID_TYPES.has(type) ? type : "fact";
  const id = keyOf(text);
  const existing = entries.find((e) => e.id === id);
  if (existing) {
    existing.ts = ts;                         // refresh recency
    existing.pinned = existing.pinned || pinned; // pin is sticky
    if (VALID_TYPES.has(type)) existing.type = t;
    return { entries, added: false };
  }
  entries.push({ id, text: String(text).trim(), type: t, pinned: !!pinned, ts });
  return { entries, added: true };
}

export { STORE, DIR };
