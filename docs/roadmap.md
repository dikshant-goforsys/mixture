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
- [ ] Dogfood on a real task; record an ADR per non-obvious decision

## Phase 2 — L3 governance
- [x] Implement `memory-persistence/{load,save,clean}.mjs` against the contract (idempotent, bounded, pin-safe)
- [x] Wire `MIXTURE_HOOK_PROFILE` env governance (`resolve-hooks.mjs`: off/standard/strict + `MIXTURE_DISABLED_HOOKS`)
- [x] CI (`.github/workflows/ci.yml`): `validate-frontmatter` + `check-drift` (registration/eval/cap) + `resolve-hooks --check`
- [x] Add the prompt-defense preamble + cost-aware model-routing reference (`references/`)

**Phase 2 complete.**

## Phase 3 — L4 coordination (only when the gate in the spec is met)
- [ ] Manual task ledger proves the workflow first
- [ ] `coordination-protocol` skill (the injected heartbeat contract)
- [ ] Atomic checkout + budget hard-stop **in code**
- [ ] Blocker DAG + auto-resume wake (cron/hook)
- [ ] Liveness/recovery (every owned task has a wake path)

## Distribution (any time after Phase 1 is eval-backed)
- [ ] `marketplace.json` + versioned releases
- [ ] Install via profiles; `setup` skill for per-repo config (issue tracker, domain, labels)

## The cap, restated
Adding a skill in any phase may require deprecating one. The catalog stays ≤ ~30. Forever.
