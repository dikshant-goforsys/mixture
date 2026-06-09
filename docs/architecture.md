# Mixture architecture

## The core insight
The four source repos are **not competitors** — they sit at four altitudes of one stack. Mixture
assembles them as layers, governed by a single constraint.

## The governing constraint (from mattpocock/skills)
**Small, composable, model-agnostic, hackable, anti-framework.** Every idea from every source is
admitted only if it survives this. The ~30-skill cap is the enforcement mechanism.

## What was taken from each — and what was rejected

### L1 — andrej-karpathy-skills → `skills/kernel/coding-behavior`
**Taken:** the imperative→declarative goal-transformation table; falsifiable self-checks; the
orphan-cleanup ownership rule; "how to know it's working" observable signals.
**Rejected:** the one-prompt-in-three-wrappers packaging (drift hazard); always-on firing.
**Added:** an explicit resolution of karpathy's own ask-vs-loop contradiction + an AFK rule.

### L2 — mattpocock/skills → the authoring standard + exemplars
**Taken:** description-as-routing-contract; progressive disclosure (≤100 lines, refs one level deep);
buckets + hidden buckets; examples-as-docs; `write-a-skill` as a gate; grill-me / diagnose / CONTEXT.md.
**Rejected:** TypeScript-specific skills (migrate-to-shoehorn, scaffold-exercises) — config, not catalog.

### L3 — affaan-m/ECC → `manifests/`, `hooks/` (scoped to ~1/10th)
**Taken:** profile-based selective install; cost-aware model routing (`references/model-routing.md`);
prompt-defense preamble (`references/prompt-defense.md`); env-var hook governance; memory-persistence
lifecycle (SessionStart/PreCompact/SessionEnd).
**Rejected, emphatically:** the 261-skill / 64-agent sprawl; the 50KB hooks.json; the cross-harness
dotfolders; inflated stats as proof. ECC is the cautionary tale that justifies the cap.

### L4 — paperclipai/paperclip → `docs/coordination-plane.spec.md` (deferred)
**Taken (as spec):** heartbeat execution primitive; atomic checkout / no-retry-409; blocker DAG with
auto-resume; typed idempotent human-in-the-loop gates; budget hard-stops; runtime-injected behavioral contract.
**Rejected:** building it before there's a fleet to coordinate; the GDP-of-nations vision; prose-only
invariants the runtime can't enforce.

## Dependency rule
Lower layers never depend on higher ones. The kernel works alone. Skills work with just the kernel.
Governance is optional. Coordination sits entirely on top and is removable.

## Why Claude Code-only is the right pin
ECC's cross-harness promise was its least-delivered part. Pinning to Claude Code means L4 maps onto
**real primitives that already exist** (cron, hooks, subagents, scheduled wakeups, the Task tools)
instead of a bespoke control-plane runtime. See the spec.

## Enforce-in-code vs. prose
Premortem #3 is that all four encode invariants in Markdown the model may ignore. Mixture pushes every
checkable invariant into code, all wired into CI (`.github/workflows/ci.yml`) and exiting `2` on failure
so they double as Claude Code hooks:
- `scripts/validate-frontmatter.mjs` — the routing contract (name kebab-case + matches dir; description ≤1024 + has "Use when").
- `scripts/check-drift.mjs` — the `write-a-skill` gate's machine-checkable rules: shipped⇄disk parity,
  every shipped skill in ≥1 profile, **every shipped skill has an eval** (premortem #9), and the **~30 cap** (premortem #1).
- `scripts/resolve-hooks.mjs` — L3 governance: resolves the annotated `hooks.json` by `MIXTURE_HOOK_PROFILE`
  (off/standard/strict) and `MIXTURE_DISABLED_HOOKS`, so behavior is tuned by env, never by editing files.

Prose is guidance; code is the guarantee.
