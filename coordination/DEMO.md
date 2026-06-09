# L4 dispatch demo — run record

First real multi-agent dispatch (2026-06-09). Two `general-purpose` subagents (`alpha`, `beta`) ran the
`coordination-protocol` heartbeat **concurrently** against one shared ledger (`/tmp/coord-live`). This is
the first step of retroactively closing the fleet gate we overrode in ADR-0003.

## Setup
4 tasks, one dependency (`T-2` → blocked by `T-1`), budget cap 100000:
- T-1 (p1) write `schema.sql` · T-2 (p1, blocked) write `api.md` · T-3 (p2) write `notes.md` · T-4 (p2) write `glossary.md`

## What happened (verified from the ledger, not self-report)
| Task | Worker | Notes |
|------|--------|-------|
| T-1 | alpha | claimed first (top priority, unblocked) |
| T-3 | beta  | beta's first tick — T-1 was already owned, so it got the next ready task |
| T-2 | alpha | **auto-resumed** after T-1 done (`blockers_resolved` wake), then picked up |
| T-4 | beta  | |

- **Zero CONFLICTs** reported by either worker — the lock + `getReady` partitioned work so they didn't
  collide (each `tick` atomically handed out a different task).
- **Dependency respected:** `api.md` was produced only after `schema.sql` existed; T-2 was unworkable
  while blocked and became ready only via the auto-resume wake.
- **End state:** all 4 `done`, each with exactly one (now-cleared) assignee; budget `spent: 2000`.
- **Artifacts:** `schema.sql`, `api.md`, `notes.md`, `glossary.md` all written to disk.

## What this proves
The substrate's guarantees hold under real concurrent agents: atomic single-assignee checkout, the
blocker DAG + auto-resume, and budget accounting. What it does **not** yet prove: behavior under genuine
contention (here the two agents never raced for the *same* task) or at fleet scale. Next: a higher-
contention run (more agents than ready tasks) to exercise the CONFLICT/no-retry path live.
