---
name: context
description: Maintain the project's CONTEXT.md domain glossary — a shared ubiquitous language between human and agent. Use when a new domain term, entity, or resolved decision surfaces during work, or when communication feels verbose or ambiguous. Not for specs, scratchpads, or implementation notes.
license: MIT
---

# context — the domain glossary as a token-efficiency tool

Pattern from `mattpocock/skills`, applying DDD's ubiquitous language to human↔agent communication. A
shared glossary means a one-word term replaces a paragraph of re-explanation **every session**.

## Rules (these are strict)
- `CONTEXT.md` is **a glossary and nothing else** — totally devoid of implementation detail. Not a
  spec, not a scratchpad, not a TODO list.
- **Update inline as terms resolve. Never batch.** The moment a term's meaning is settled, write it.
- If a term can be answered by reading the codebase, read the codebase — don't invent a definition.
- Three sections only: **Language** (term → meaning), **Relationships** (how terms connect),
  **Flagged ambiguities** (contested terms not yet resolved).

## Example

❌ **Spec creep / batching:**
> Glossary entry: "Materialization — the process where, after the cron job at 02:00 UTC runs
> `rebuildProjections()` in `jobs/materialize.ts`, we... (3 paragraphs of how it's implemented)."

✅ **Glossary-only, inline:**
> **Language**
> - **Materialization** — turning raw events into a queryable read model. (impl lives in code, not here)
> **Flagged ambiguities**
> - "Projection" — used for both the read model and the rebuild step; pick one before we build on it.

## Why this works
Concision compounds. Each resolved term saves tokens and prevents the agent from re-deriving meaning,
session after session. Pairs naturally with `grill-me`, which resolves terms during alignment.
