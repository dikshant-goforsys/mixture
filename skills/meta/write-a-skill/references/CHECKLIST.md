# Skill authoring checklist

Run before opening a PR. Machine-checkable items (★) are enforced by `scripts/validate-frontmatter.mjs`.

## Frontmatter
- [ ] ★ `name` present, kebab-case, matches the directory name.
- [ ] ★ `description` present and ≤ 1024 chars.
- [ ] `description` sentence 1 says *what*; sentence 2 starts with "Use when".
- [ ] `description` names when NOT to use it, if non-obvious.

## Body
- [ ] ≤ ~100 lines. Longer content split into `references/*.md`.
- [ ] References go one level deep only.
- [ ] At least one ❌/✅ example pair.
- [ ] `scripts/` (if any) are deterministic and token-saving, not prose dressed as code.

## Catalog hygiene
- [ ] Earns its context (prevents a specific failure the kernel/existing skills don't).
- [ ] Under the cap (~30). If at the cap, names the skill it replaces.
- [ ] Correct bucket.
- [ ] Added to `plugin.json` `skills[]`.
- [ ] Added to at least one profile in `manifests/install-profiles.json`.

## Evidence
- [ ] Has an `evals/` entry with a falsifiable pass/fail.
- [ ] Dogfooded at least once on a real task.
