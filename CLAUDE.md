# CLAUDE.md — repo rules for agents

Read `CONTEXT.md` for the domain glossary and `docs/architecture.md` for the design.

## Release rule: versions stay in sync

Whenever the version in `package.json` is bumped, bump `"version"` in
`.claude-plugin/plugin.json` to the **same value** in the same commit.
`scripts/check-drift.mjs` warns on mismatch (fatal in CI via `npm run ci`,
which also gates `npm publish` through `prepublishOnly`).

## The standing gates

- Every dev task follows the `dev-loop` skill: tdd → full gate (`npm run ci`) → code-review
  verdict, looped until the greenzone.
- **Model Usage Policy** (`references/model-routing.md`): discovery is Haiku's job. Before
  implementation, spawn the `context-reader` subagent (`.claude/agents/context-reader.md`) to read
  the relevant files and wait for its structured handoff, then proceed under the dev-loop gate.
  Sonnet implements and runs everyday code review; Opus handles architecture and security-critical
  review. Higher tiers read files directly only on ambiguity, architecture/security, an actual
  review pass, or explicit request — and skip the round-trip for trivial/in-window changes.
- Every new/edited skill passes the `write-a-skill` quality gate: routing-contract description,
  ≤ ~100-line body, ❌/✅ examples, an eval in `evals/`, registration in `plugin.json` + a profile.
- The catalog cap is ~30 shipped skills. Adding one may mean deprecating one.
