# Premortem — why Mixture might fail, and the guardrail for each

It is 12 months out and Mixture failed. Each failure mode below is a pathology observed directly in
one of the source repos. The guardrail is the design decision that prevents it.

| # | Failure mode | Source | Guardrail (in this repo) |
|---|---|---|---|
| 1 | **Bloat.** 15 tight skills become 250+ untested ones; the model can't pick; context explodes. | ECC | ~30-skill cap; `write-a-skill` gate; one eval per skill; deprecation lane; "earn your context" test. |
| 2 | **Vision exceeds delivery.** Grand L4 control plane built first; wake/lock semantics churn; coding value never ships. | paperclip | Bottom-up sequencing; L4 is **spec-only** until a real fleet exists (`roadmap.md`). |
| 3 | **Prose-as-correctness.** Invariants live in Markdown the model ignores; weak models break them silently. | all four | Enforce in code: `validate-frontmatter.mjs`, no-drift check, hook profiles. Prose ≠ guarantee. |
| 4 | **Duplication/drift.** Same content in CLAUDE.md / SKILL.md / .cursor needs manual re-sync. | karpathy | Single source of truth; no multi-target wrappers (Claude Code-only pin removes the need). |
| 5 | **Cargo-culting stars.** Patterns adopted because a repo "has 200k stars" — numbers that are implausible. | all four | Adopt on merit + own evals only. Stars are explicitly distrusted. |
| 6 | **Caution kills throughput.** "Stop and ask" + grilling fire on trivial tasks; autonomous loops stall. | karpathy, mattpocock | Kernel gates itself out of trivial work; explicit AFK rule in kernel + grill-me. |
| 7 | **Taste lock-in.** One person's stack hardcoded; generalizes to nobody. | mattpocock, ECC | Domain specifics go in config (setup pattern), never in skills. |
| 8 | **Spec/harness drift.** The skills spec changes; cross-harness parity breaks. | ECC | Target the official Anthropic spec; pin to one harness; adapters only when proven. |
| 9 | **No evals → silent rot.** Can't tell if a skill helps; catalog decays invisibly. | all four | Evals are first-class and mandatory (`evals/`). |
| 10 | **Meta-work eats real work.** The framework out-competes the work it serves. | — | Dogfood ruthlessly (CONTEXT.md + ADRs applied to this repo); cut anything not used daily. |

## The two that will actually kill it
If Mixture dies, it dies of **#1 (bloat)** or **#2 (premature L4)**. Everything else is recoverable.
The cap and the bottom-up sequencing are therefore not negotiable — they are the project's spine.
