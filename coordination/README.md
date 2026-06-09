# L4 Coordination plane — runtime

Multi-agent coordination on Claude Code's native primitives. The substrate (ledger + invariants) is
code-enforced and tested; the automation layer drives heartbeats and dispatch.

> **Status:** built ahead of the spec's fleet gate by explicit request (ADR-0003). Expect the
> automation/wake semantics to iterate — the substrate invariants are stable and tested.

## Pieces
- `ledger.mjs` — the store + every hard invariant (atomic checkout, budget stop, cycle reject, DAG
  auto-resume, liveness recovery). Tested in `tests.mjs` (run `node coordination/tests.mjs`).
- `cli.mjs` — operations with **machine-detectable exit codes**: `0 ok · 2 usage · 6 cycle · 7 budget ·
  8 blocked · 9 conflict`. So `coordination-protocol` obeys "never retry a CONFLICT" without parsing prose.
- `skills/coordination/coordination-protocol/SKILL.md` — the behavioral contract a woken agent follows.

## The execution model
An agent doesn't run forever. It **wakes, ticks, works, exits** — paperclip's heartbeat, on Claude Code:

```
tick  ──► cli.mjs tick --agent A --run R   (recover stale ▸ pick by priority ▸ atomic checkout)
work  ──► do the task under the kernel/engineering skills; cli heartbeat + cost periodically
finish──► cli done   (auto-resumes dependents, queues their wakes)
```

### Wiring the heartbeat (pick one)
- **Scheduled (cron):** a routine that fires every N minutes and launches an agent running
  `coordination-protocol`. Create with `CronCreate` (a Mixture routine), e.g. prompt:
  *"Run the coordination-protocol heartbeat: tick as agent `cron-1`, execute any assigned task, update status."*
- **Self-paced loop:** an agent uses `ScheduleWakeup` to re-fire after each tick (good for a burst of work,
  then back off). The `/loop` skill is the manual equivalent.
- **Event wakes:** `done`/`scan` push entries onto `ledger.wakes`; the next `tick` consumes the matching
  one via the scoped-wake fast path. (A future enhancement: a hook that fires a wake immediately.)

### Dispatch (one agent → many)
For parallel execution, a driver fans out one subagent per ready task with the `Agent` tool (or a
`Workflow` for deterministic pipelines). Each subagent gets its own `--agent`/`--run` id and an isolated
worktree, so atomic checkout guarantees no two touch the same task.

## The no-retry contract (why exit codes matter)
`9 CONFLICT` is the optimistic-lock loser. The protocol **must not retry the same task** — it ticks again
and the ledger hands it different work. This is the single hardest-won lesson copied from paperclip; the
exit code makes it enforceable, not aspirational.

## Try it
```bash
export MIXTURE_COORD_DIR=/tmp/coord
node coordination/cli.mjs create --title "Design schema" --priority 1
node coordination/cli.mjs create --title "Build API" --priority 1
node coordination/cli.mjs block --id T-2 --by T-1     # API waits on schema
node coordination/cli.mjs tick --agent a1 --run r1     # claims T-1
node coordination/cli.mjs done --id T-1                # T-2 auto-resumes
node coordination/cli.mjs tick --agent a1 --run r2     # now claims T-2
```
