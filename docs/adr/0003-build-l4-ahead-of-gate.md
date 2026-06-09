# ADR 0003 — Build L4 ahead of its fleet gate

- **Status:** Accepted (with recorded risk)
- **Date:** 2026-06-09

## Context
The L4 coordination plane was specified with an explicit gate: don't build it until L0–L3 are stable
**and** you're routinely running ≥~5 conflicting agents **and** a manual ledger has proven the workflow.
Only the first was met. Building L4 prematurely is premortem #2 — the documented #1 way this project dies
(grand orchestration outruns delivered value; wake/lock semantics churn).

The user reviewed this risk (surfaced via an explicit scope question offering a gate-compliant slice, a
protocol-only step, or the full runtime) and chose **the full runtime now**.

## Decision
Proceed with the full L4 build, but contain the risk structurally rather than just accepting it:
1. **Substrate before automation.** Build and *test* the ledger and all hard invariants first
   (`ledger.mjs` + `tests.mjs`, 20 cases) so the volatile part sits on a proven base.
2. **Invariants in code, not prose** (premortem #3): atomic single-assignee checkout, no-retry CONFLICT
   surfaced as a distinct exit code, budget hard-stop, circular-blocker rejection, DAG auto-resume,
   liveness recovery — all enforced by `ledger.mjs`, gated in CI.
3. **Automation layer documented as iterating** (`coordination/README.md`), and kept thin — it drives the
   tested substrate via Claude Code primitives (CronCreate / ScheduleWakeup / Agent), it doesn't reinvent a runtime.
4. **Removable by construction.** Nothing in L0–L3 depends on L4; the plane can be deleted without affecting
   the rest of the framework.

## Consequences
- **Positive:** the hardest-won correctness properties (paperclip's no-double-work / no-runaway-spend /
  liveness) exist and are tested today; the framework can coordinate real multi-agent work.
- **Negative / accepted risk:** the automation/wake semantics are unproven against a real fleet and will
  likely churn (the spec and premortem both predict this). We are paying maintenance cost ahead of demand.
- **Tripwire:** if the automation layer churns more than ~2 iterations without a real multi-agent use case
  driving it, freeze it and revert to the manual-ledger workflow until the fleet is real. That keeps the
  override from becoming the premortem-#2 death spiral.

## Alternatives rejected
- *Gate-compliant slice* (protocol skill + manual ledger, defer automation) — the disciplined default; not chosen.
- *Protocol skill only* — too small for the request.
