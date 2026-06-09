# eval: write-a-skill

## Scenario
"Add a Mixture skill that helps write good commit messages."

## Without-skill failure (the thing it prevents)
Agent writes a 200-line SKILL.md with a vague `description: Helps with commits`, no examples, no eval,
and forgets to register it in plugin.json or any profile — silent catalog drift.

## Pass criteria (falsifiable)
- [ ] `description` follows the routing contract: what-it-does + "Use when [triggers]", ≤ 1024 chars,
      and names when NOT to use it if non-obvious.
- [ ] Body ≤ ~100 lines; deeper content split into `references/` one level deep.
- [ ] Includes at least one ❌/✅ example pair.
- [ ] Creates a matching `evals/<name>.eval.md`.
- [ ] Registers the skill in `plugin.json` and ≥ 1 install profile.
- [ ] Checks the cap (~30); if at the cap, names the skill it would deprecate.
- [ ] `node scripts/validate-frontmatter.mjs && node scripts/check-drift.mjs` both pass afterward.

## How to run
Run with `write-a-skill` enabled vs. disabled, then run the two gate scripts. Fail if either script
errors, or if the description/body/example/eval/registration criteria are unmet.
