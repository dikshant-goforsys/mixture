#!/usr/bin/env node
// SessionEnd hook: enforce the bound. Evict so the store can't grow unbounded.
//   - Drop non-pinned entries older than TTL (default 90 days).
//   - Then cap total to --max (default 200), evicting oldest non-pinned first.
// Pinned entries are never evicted. Idempotent: running twice changes nothing the second time.

import { readStore, writeStore, sortEntries } from "./lib.mjs";

// A NaN bound is catastrophic here: `ts >= NaN` is false for every entry, so an invalid
// --ttl-days or env var would silently evict the entire non-pinned store. Validate each
// source and fall back to the default, loudly.
function num(name, envVal, def) {
  const i = process.argv.indexOf(name);
  const raw = i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : envVal;
  if (raw == null || raw === "") return def;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  console.error(`! ignoring invalid ${name.replace(/^--/, "")} value "${raw}" — using default ${def}`);
  return def;
}

const MAX = num("--max", process.env.MIXTURE_MEMORY_MAX, 200);
const TTL_DAYS = num("--ttl-days", process.env.MIXTURE_MEMORY_TTL_DAYS, 90);
const cutoff = Date.now() - TTL_DAYS * 86_400_000;

let entries = readStore();
const before = entries.length;

// 1. TTL: keep pinned, and non-pinned newer than cutoff.
entries = entries.filter((e) => e.pinned || (e.ts || 0) >= cutoff);

// 2. Cap: keep all pinned; fill remaining slots with newest non-pinned.
const pinned = entries.filter((e) => e.pinned);
const rest = entries.filter((e) => !e.pinned).sort(sortEntries);
const room = Math.max(0, MAX - pinned.length);
entries = [...pinned, ...rest.slice(0, room)];

const saved = writeStore(entries);
console.error(`cleaned ${before} -> ${saved.length} (max=${MAX}, ttl=${TTL_DAYS}d, pinned kept=${pinned.length})`);
