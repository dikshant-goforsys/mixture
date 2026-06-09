# L4 Coordination plane — SPEC (deferred build)

> **Status: specified, not implemented.** Building this before a real fleet of agents exists is
> premortem #2 — the documented #1 way this project dies. This spec exists so that *when* it's earned,
> the design is already pinned. Do not write this code until you are actually running ≥ ~5 agents that
> step on each other.

## The bet that makes L4 cheap
Because Mixture is pinned to **Claude Code**, paperclip's bespoke control-plane primitives map onto
tools that **already exist in the harness**. We do not build a runtime; we orchestrate native tools.

| paperclip primitive | Claude Code native mapping |
|---|---|
| **Heartbeat** (agent wakes on cron/event, acts, exits) | `CronCreate` for scheduled wakes; `ScheduleWakeup` for self-paced loops; hooks for event wakes. |
| **Runtime-injected SKILL.md behavioral contract** | The skill *is* the contract — `coordination-protocol/SKILL.md` injected into every worker agent. |
| **Atomic checkout / never-retry-409** | A task store (`TaskCreate`/`TaskUpdate` or a JSON ledger) with optimistic status transitions: `todo → in_progress` only if currently `todo`; conflict = stop. |
| **Blocker DAG with auto-resume** | Task dependency edges; a hook/cron that wakes a dependent when all blockers reach `done`. No busy-polling. |
| **Typed idempotent human gates** | `AskUserQuestion` for structured asks; idempotency keys stored in the task ledger to make resumes safe. |
| **Budget hard-stops** | A token ledger updated per run; a PreToolUse hook that blocks (exit 2) past the cap. |
| **Delegation** | The `Agent` tool / subagents; a `Workflow` script for deterministic fan-out. |

## The coordination protocol (the L4 skill, when built)
A single `SKILL.md` injected into every worker, encoding the heartbeat procedure:
1. **Identity & wake reason** — why was I woken (cron / blocker-resolved / mention)?
2. **Scoped-wake fast path** — if woken for a specific task, skip discovery; go straight to it (token saving).
3. **Get assignments** — read the task ledger.
4. **Pick work** — strict priority `in_progress → in_review → todo`; skip `blocked`.
5. **Atomic checkout** — claim the task or stop on conflict. **Never retry a conflict.**
6. **Do the work** — under the kernel + relevant L2 skills, inside an isolated worktree.
7. **Update status & delegate** — prefer creating child tasks over polling.

## Invariants that MUST be enforced in code (not prose — premortem #3)
- Single-assignee checkout is atomic (compare-and-set on status).
- A conflict is never retried (the loser stops).
- Budget overrun blocks new runs (hard stop, not a warning).
- Circular blocker edges are rejected at creation.
- Every agent-owned task has at least one liveness path (active run / queued wake / monitor), else a
  recovery wake is auto-queued — paperclip's hardest-won lesson, and the part most worth copying exactly.

## Explicit non-goals
- No "autonomous company" org-chart metaphor. Tasks and dependencies, not titles and reporting lines.
- No multi-company isolation, no trust presets, no plugin runtime. That is paperclip's scope, not ours.
- No remote git assumptions — the worktree is the persistence boundary (paperclip's no-git-push contract).

## Gate to start building L4
All true before any L4 code is written:
- [ ] L0–L3 stable and eval-backed.
- [ ] You are routinely running ≥ ~5 concurrent agents that conflict or wait on each other.
- [ ] A manual task ledger has proven the workflow before automation.
