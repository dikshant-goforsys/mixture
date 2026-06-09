# ADR 0001 — Four sources as four layers, governed by curation

- **Status:** Accepted
- **Date:** 2026-06-09

## Context
We were asked to build "the best of" four skills/agent repos: andrej-karpathy-skills, mattpocock/skills,
ECC, and paperclip. The naive reading is "merge them." Deep research showed they operate at four
different altitudes (behavior / authoring / governance / coordination) with very different maturity and
very different failure modes — and that their headline popularity metrics are not credible.

## Decision
Assemble them as a **layered stack (L0–L4)**, not a merge. Adopt `mattpocock/skills`'s curation
philosophy (small, composable, anti-framework) as the **governing constraint** on every layer, enforced
by a hard ~30-skill cap. Build **bottom-up**; specify L4 (paperclip's coordination plane) but do not
implement it until a real fleet exists. Pin to **Claude Code only**, so L4 maps onto native primitives
rather than a bespoke runtime.

## Consequences
- **Positive:** each layer is independently useful and removable; the cap prevents ECC-style bloat;
  bottom-up sequencing prevents paperclip-style vision-debt; the Claude Code pin removes the
  cross-harness maintenance tax that hurt ECC.
- **Negative:** rejecting volume means saying no to many plausible skills; the framework's value is
  judgment, which is harder to demonstrate than a big catalog.
- **Enforced in code:** the routing contract (`validate-frontmatter.mjs`); not left to prose.

## Alternatives rejected
- *Flat merge of all four* — produces ECC again (bloat, drift, no evals).
- *Lead with the orchestration platform* — produces paperclip's vision-exceeds-delivery risk.
- *Cross-harness from day one* — ECC's least-delivered promise; deferred behind proof.
