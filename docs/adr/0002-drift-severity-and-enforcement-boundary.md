# ADR 0002 — Drift severity split; CI is the enforcement boundary

- **Status:** Accepted
- **Date:** 2026-06-09
- **Found via:** dogfooding `diagnose` on Mixture itself (first real-task dogfood).

## Context
Phase 2 added a `strict`-profile PostToolUse hook running `check-drift.mjs` after every `Write`/`Edit`,
and `check-drift` treated *every* finding as fatal (exit 2). Dogfooding surfaced a contradiction with our
own `write-a-skill` flow: authoring a skill **requires** passing through incomplete states — you write
`SKILL.md` before registering it in `plugin.json`, and register before the eval exists. A deterministic
repro (author a new `SKILL.md`, run the strict hook) confirmed the hook hard-fails on exactly that
intermediate state, nagging the author on every subsequent edit until the skill is fully complete. The
gate was fighting the workflow it exists to support.

Three hypotheses were considered: (1) split severity so transient gaps warn but structural breakage
blocks; (2) make the hook fully advisory (loses in-editor enforcement of real breakage); (3) authoring
guidance only (doesn't fix the deadlock — drift still nags before registration). (1) dominated.

## Decision
1. **`check-drift` classifies two severities.**
   - **HARD** (structural breakage that must never exist, even mid-edit): broken JSON; a shipped skill or
     a profile that points at a missing path; the ~30 cap exceeded.
   - **SOFT** (completeness gaps that are legitimately transient while authoring): orphan skill on disk,
     a shipped skill with no eval, a shipped skill not in any profile.
2. **CI is the enforcement boundary.** `--ci` (or `MIXTURE_DRIFT_STRICT=1`) makes **any** finding fatal.
   The default/at-your-side mode (the strict PostToolUse hook) hard-fails only on HARD findings and prints
   SOFT findings as warnings (exit 0).
3. `npm run ci` and the GitHub Actions gate use `--ci`; the strict hook uses the advisory default.

## Consequences
- **Positive:** incremental authoring no longer deadlocks; real breakage is still blocked instantly in the
  editor; completeness is still guaranteed at the merge boundary where it belongs. Verified against the
  repro: orphan → warn(hook)/fail(CI); broken profile reference → fail in both.
- **Negative:** a forgotten eval or registration can survive locally until CI catches it — acceptable,
  because CI is mandatory and the warning is visible in-editor.
- **Principle reinforced:** enforce-in-code, but enforce at the right *boundary*. A gate that fires at the
  wrong moment trains people to disable it — the exact failure (#6, caution kills throughput) the premortem warns about.

## Also cleaned up (dogfooding `simplify`)
Removed a `"plugin.json".replace("plugin.json", ".claude-plugin/plugin.json")` wart in `check-drift.mjs`,
now a direct path literal.
