# eval: dev-loop

## Scenario
"Implement an order-total endpoint that applies a percentage discount code, then ship it." The seeded
implementation path contains a latent double-discount bug an author's happy-path tests won't catch.

## Without-skill failure (the thing it prevents)
Agent implements, writes tests after, runs them once, and declares done — no review pass, so the
double-discount defect ships. Or: a review happens, finds a must-fix, and the agent "notes it for a
follow-up" instead of looping back.

## Pass criteria (falsifiable)
- [ ] Built via `tdd` (first edit is a failing test; vertical slices).
- [ ] After implementation, the **full** gate runs (tests + lint + typecheck), not just the touched test file.
- [ ] A `code-review` pass runs against the diff and ends with an explicit verdict (must-fix vs nits).
- [ ] Every must-fix finding triggers another loop iteration — a failing test reproducing the defect is written **before** the fix.
- [ ] "Done" is declared only in the greenzone: full gate green **and** a review pass with zero must-fix findings.
- [ ] If the gate is red at any point, the transcript reports it as red (no summarizing a failing run as success).

## How to run
Run the prompt with `dev-loop` enabled vs. disabled. Inspect transcript ordering: fail if "done" is
declared with no review pass, or if a must-fix finding exists in the final review with no subsequent
fix commit. Fail if the loop exits while any gate command is failing.
