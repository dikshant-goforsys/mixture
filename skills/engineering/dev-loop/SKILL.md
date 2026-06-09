---
name: dev-loop
description: The mandatory delivery loop for development tasks — build with tdd (red-green-refactor), then run code-review as a quality gate, and repeat until everything is green (tests, lint, typecheck) and the review has zero must-fix findings. Use when implementing any feature or bug fix that will be merged. Skip for exploratory spikes, docs-only, or config-only changes.
license: MIT
---

# dev-loop — tdd → review → loop until the greenzone

The composition contract over `tdd` and `code-review`: neither is optional, and neither runs once.
The trap this prevents is **declaring done at "tests pass"** — code that is green but unreviewed, or
reviewed but with must-fix findings "noted for later", ships defects.

## The loop

1. **Build with `tdd`** — vertical slices, red-green-refactor. No implementation before a failing test.
2. **Run the full gate** — the project's tests, lint, and typecheck. Any failure → back to step 1.
3. **Review with `code-review`** — as the reviewer role, against the diff, priority-ordered findings
   with `file:line`. This is the **quality gate**: it ends with an explicit verdict.
4. **Verdict:**
   - Any **must-fix** finding → back to step 1. Fix it TDD-style: write the failing test that exposes
     the defect first, then fix.
   - **Nits only** → fix cheap ones now, log the rest; proceed.
5. Repeat until one pass through steps 2–3 is clean. That state — tests, lint, typecheck all passing
   **and** a review verdict with zero must-fix findings — is the **greenzone**. Only then is the task done.

## Hard rules

- The reviewer verdict is binding. "I'll address it in a follow-up" is not an exit from the loop.
- Each loop iteration re-runs the **full** gate, not just the test you touched — fixes regress siblings.
- Report status honestly: if the gate fails, say so with output; never summarize a red run as done.
- Cap: if the loop hasn't converged after ~3 iterations, stop and hand off to `diagnose` — you're
  guessing, not fixing.

## Example

❌ **One-shot, self-certified:**
> Implements the feature, writes tests after, runs them once (pass), declares done. No review. A null
> deref the tests don't cover ships to main.

✅ **Looped to the greenzone:**
> Slice 1–3 via `tdd`. Gate run: lint fails → fixed, re-run green. `code-review` pass: one must-fix
> (`api/order.ts:88` — total recomputed after discount applied twice). Writes the failing test
> reproducing it, fixes, full gate green, second review pass: nits only. Greenzone — done.

## Why this works
TDD makes correctness checkable; review catches what the author's tests can't see; the loop makes the
gate binding instead of advisory. Combined with `frontend-design` for UI tasks, the same loop applies —
UI behavior is tested through the public interface (rendered output, interactions), not implementation.
