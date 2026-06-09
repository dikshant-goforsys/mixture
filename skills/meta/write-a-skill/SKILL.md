---
name: write-a-skill
description: The authoring quality gate for Mixture skills. Use when creating, editing, or reviewing any SKILL.md — it enforces the routing-contract format, progressive disclosure, the skill cap, and the mandatory eval. No skill enters the catalog without passing this.
license: MIT
---

# write-a-skill — the quality gate

A skill is admitted only if it passes every check here. This is the constraint that keeps Mixture
small. Pattern adapted from `mattpocock/skills`'s `write-a-skill`; the cap and eval requirement are
Mixture's defenses against `ECC`-style bloat.

## 1. The routing contract (the `description`)
The model sees **only** the description when deciding to invoke. It must:
- be ≤ 1024 characters, third person;
- sentence 1 = *what it does*; sentence 2 = *"Use when [specific triggers]"*;
- name when **not** to use it, if the boundary is non-obvious.

❌ `description: Helps with testing.`
✅ `description: Test-driven development via red-green-refactor on vertical slices. Use when building a feature or fixing a bug where behavior can be expressed as a failing test; skip for pure refactors.`

## 2. Progressive disclosure
- `SKILL.md` body ≤ ~100 lines. If longer, split into `references/*.md` loaded **one level deep**.
- Add `scripts/` only for **deterministic** operations that save tokens (parsing, validation) — not for prose.
- UPPERCASE filenames for templates/formats (`CHECKLIST.md`), lowercase for reference docs.

## 3. Earn your context
Before writing, answer: *what specific failure does this prevent that the kernel + existing skills don't already?*
If you can't, don't write it. **The cap is ~30 shipped skills.** Adding one may mean deprecating one.

## 4. Examples-as-docs
Teach with paired ❌/✅ examples, not rules alone. Show a realistic wrong output and the corrected one.

## 5. Mandatory eval
Every skill ships with an entry in `evals/` — a falsifiable check that it improves behavior.
A skill with no eval is a guess. See `evals/README.md`.

## 6. Bucket & manifest hygiene
- Place under the right bucket: `kernel/`, `engineering/`, `productivity/`, `meta/`.
- Work-in-progress goes in `in-progress/` (a hidden bucket, absent from `plugin.json`).
- Shipping a skill = add it to `plugin.json` `skills[]` **and** a profile in `manifests/install-profiles.json`.

## Final checklist
See `references/CHECKLIST.md` — run through it before opening the PR. `validate-frontmatter.mjs` enforces
the machine-checkable subset; you enforce the rest.
