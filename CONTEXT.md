# CONTEXT — Mixture domain glossary

> A glossary and nothing else. Not a spec, not a scratchpad, not implementation notes.
> Pattern borrowed from `mattpocock/skills`: a shared ubiquitous language between human and agent
> saves tokens every session. Update terms **inline as they resolve** — never batch.

## Language

- **Layer (L0–L4)** — an altitude of the framework. Each layer has one concern and one source-of-inspiration repo. Layers stack; lower layers never depend on higher ones.
- **Skill** — a directory under `skills/` containing a `SKILL.md` with `name` + `description` frontmatter, per Anthropic Agent Skills spec. The atomic unit of know-how.
- **Routing contract** — the `description` field. ≤1024 chars, sentence 1 = what it does, sentence 2 = "Use when [triggers]". The *only* thing the model sees when deciding to invoke a skill.
- **Behavioral kernel** — the single always-relevant L1 skill (`coding-behavior`) encoding how to write code. Gated so it does not fire on trivial tasks.
- **Quality gate** — the `write-a-skill` meta-skill. No skill enters the catalog without passing it.
- **The cap** — the hard limit of ~30 shipped skills. Volume is the failure mode, not the goal.
- **Hidden bucket** — `in-progress/`, `deprecated/`, `personal/`: present in the repo, absent from `plugin.json` and READMEs.
- **Eval** — a falsifiable test that a skill improves agent behavior. First-class; no skill ships without one.
- **Coordination plane (L4)** — the deferred multi-agent layer: heartbeat, atomic checkout, blocker DAG, budgets. Specified, not built.

## Relationships

- A **profile** (`install-profiles.json`) maps to a set of **skills** — decouples "what to install" from the catalog.
- A **hook** is governed by env vars (`MIXTURE_HOOK_PROFILE`), never by editing files.

## Flagged ambiguities

- _(none yet — add here when a term is contested before it resolves)_
