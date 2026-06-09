# Evals — first-class, not optional

The single most important thing none of the four source repos had: **a way to tell whether a skill
helps or hurts.** Without it, a catalog rots silently (premortem #9). In Mixture, **no skill ships
without an eval.**

## What an eval is
A falsifiable check that an agent *with* the skill behaves better than one *without* it, on a task the
skill claims to improve. It is not a unit test of code — it's a behavioral A/B with a pass/fail rubric.

## Format
One file per skill: `evals/<skill-name>.eval.md`

```markdown
# eval: <skill-name>
## Scenario
A concrete task that should trigger the skill.
## Without-skill failure (the thing it prevents)
What a baseline agent does wrong here.
## Pass criteria (falsifiable)
- [ ] Observable behavior 1 the skill should produce
- [ ] Observable behavior 2
## How to run
The prompt to give, and what to look for in the transcript.
```

## Example — `evals/diagnose.eval.md`
> **Scenario:** "The /checkout endpoint returns 500 intermittently."
> **Without-skill failure:** agent guesses fixes (adds retries, clears cache) without reproducing.
> **Pass criteria:** (1) builds a deterministic repro before theorizing; (2) writes ≥3 ranked
> hypotheses; (3) confirms the fix via the loop, not by inspection.

## Running
Phase 2 wires these into a harness (a workflow that runs each scenario with/without the skill and
scores the transcript against the rubric). For now they are executable-by-hand specs — which is still
infinitely more signal than the zero evals the source repos shipped with.
