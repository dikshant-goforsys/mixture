# Memory persistence — a hook lifecycle contract

Pattern from `ECC`, isolated here and decoupled from `hooks.json`. Three lifecycle points:

| Event | Script | Responsibility |
|------|--------|----------------|
| `SessionStart` | `load.mjs` | Restore prior context (open tasks, decisions, CONTEXT.md deltas) into the session. |
| `PreCompact` | `save.mjs` | Persist durable state **before** the context window is compacted and detail is lost. |
| `SessionEnd` | `clean.mjs` | Trim stale/expired memory so the store doesn't grow unbounded. |

## Design rules
- **Store outside the context window** — a small JSON/markdown file under `.mixture/memory/`, not chat history.
- **Durable facts only** — decisions, goals, glossary deltas. Not transcripts.
- **Idempotent** — running `save` twice produces the same state.
- **Bounded** — `clean` enforces a size cap; oldest non-pinned entries evicted first.

## Usage
```bash
# add a durable fact during a session (or wire as a tiny tool the agent can call)
node hooks/memory-persistence/save.mjs --add "Chose Postgres over SQLite for multi-writer support" --type decision --pin

node hooks/memory-persistence/load.mjs    # SessionStart: prints the digest for injection
node hooks/memory-persistence/save.mjs    # PreCompact: consolidate + dedupe (idempotent)
node hooks/memory-persistence/clean.mjs   # SessionEnd: enforce TTL + max bound
```
Entry types: `goal | decision | constraint | glossary | fact`. Tunables:
`MIXTURE_MEMORY_{DIR,LOAD_LIMIT,MAX,TTL_DAYS}`.

**Backends** (`MIXTURE_MEMORY_BACKEND`): `json` (default, `store.json`, Node ≥18) or `sqlite`
(`store.db` via the built-in `node:sqlite`, zero extra deps, Node ≥22). `load`/`save`/`clean` are
backend-agnostic — same behavior, same idempotency and bound, either way.

> **Implemented (Phase 2).** `lib.mjs` is the dependency-free store; the three scripts realize the
> lifecycle. Writing the contract first paid off: idempotency and the bound are enforced in *code*, the
> part prose instructions can't guarantee (premortem #3). Automatic fact-extraction from a transcript
> is intentionally out of scope — that needs an LLM; the agent adds facts explicitly via `--add`.
