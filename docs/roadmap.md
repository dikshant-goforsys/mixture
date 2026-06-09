# Roadmap — bottom-up, because premortem #2

Mixture builds from the bottom of the stack up. Each phase must be stable and eval-backed before the
next begins. **You do not skip ahead to L4.**

## Phase 1 — L0–L2 foundation  ✅ scaffolded
- [x] `plugin.json` manifest (L0)
- [x] `coding-behavior` kernel (L1)
- [x] `write-a-skill` quality gate + checklist (L2)
- [x] Exemplar skills: `grill-me`, `diagnose` (L2)
- [x] `validate-frontmatter.mjs` (enforce-in-code)
- [x] `evals/` harness + first eval
- [x] 3 more high-value skills via the gate: `tdd`, `context`, `code-review` (each with an eval)
- [x] Dogfood on a real task — `diagnose` found the strict-hook authoring deadlock; fixed via ADR-0002

**Phase 1 complete.**

## Phase 2 — L3 governance
- [x] Implement `memory-persistence/{load,save,clean}.mjs` against the contract (idempotent, bounded, pin-safe)
- [x] Wire `MIXTURE_HOOK_PROFILE` env governance (`resolve-hooks.mjs`: off/standard/strict + `MIXTURE_DISABLED_HOOKS`)
- [x] CI (`.github/workflows/ci.yml`): `validate-frontmatter` + `check-drift` (registration/eval/cap) + `resolve-hooks --check`
- [x] Add the prompt-defense preamble + cost-aware model-routing reference (`references/`)

**Phase 2 complete.**

## Phase 3 — L4 coordination (built ahead of gate — ADR-0003)
- [x] `coordination-protocol` skill (the injected heartbeat contract) + eval
- [x] Atomic checkout + budget hard-stop **in code** (`ledger.mjs`, exit codes 7/8/9)
- [x] Blocker DAG + auto-resume wake; circular edges rejected
- [x] Liveness/recovery (stale run released + exactly one wake)
- [x] 20-case invariant test suite wired into CI
- [x] Typed human-in-the-loop gates (idempotent, revision-bound) + cross-process lock (28 tests)
- [x] Live dispatch demo (2 concurrent agents) + high-contention test (20 procs / 4 agents) — `coordination/DEMO.md`
- [x] Automation layer: dispatch via `Agent` (proven in the demo) + heartbeat via cron (`0d53ff81`)

**Phase 3 complete and validated.** L4's correctness (no double-work, no-retry, auto-resume, budget,
liveness) is exercised live, not just specified.

### Deferred — only pursue when a real fleet exists (premortem #2 / ADR-0003 tripwire)
- [ ] Cross-session heartbeat persistence (current cron is session-only)
- [ ] Sustained multi-heartbeat soak over time

## Distribution (any time after Phase 1 is eval-backed)
- [ ] `marketplace.json` + versioned releases
- [ ] Install via profiles; `setup` skill for per-repo config (issue tracker, domain, labels)

## The cap, restated
Adding a skill in any phase may require deprecating one. The catalog stays ≤ ~30. Forever.
