---
name: diagnose
description: Feedback-loop-first debugging. Use when investigating a bug, failure, flaky test, or "it doesn't work" report where the cause is unknown. Builds a fast deterministic pass/fail signal first, then tests ranked hypotheses against it. Skip when the fix is already known.
license: MIT
---

# diagnose — build the feedback loop first

The mistake is guessing at fixes with no signal. Pattern from `mattpocock/skills`. **Phase 1 is
non-negotiable: construct a fast, deterministic, agent-runnable pass/fail signal before theorizing.**

## Phase 1 — Build the loop
Pick the fastest deterministic signal available, ranked best-to-worst:
1. A failing unit test that reproduces it
2. A `curl` / API call with a known-bad response
3. A CLI snapshot / golden-output diff
4. A headless-browser script
5. A trace replay
6. A throwaway harness script
7. Fuzzing / property test
8. `git bisect`
9. A differential test (working vs. broken build)
10. Human-in-the-loop bash — **last resort only**

Treat the loop as a product: make it faster, sharper, more deterministic before using it.

## Phase 2 — Hypotheses
Write **3–5 falsifiable, ranked hypotheses** before touching code. Each must predict what the loop
will show if it's true. Then run the loop against the top hypothesis.

## Phase 3 — Fix & verify
Apply the minimal change (kernel Principle 3). Confirm via the loop, not by inspection. Then hand off
to a refactor/architecture pass if the fix exposed deeper rot.

## Example

❌ **Guess-and-check:**
> "Maybe it's a race condition. Let me add a `setTimeout`... still broken. Maybe it's the cache. Let me clear it..."

✅ **Loop-first:**
> Phase 1: wrote `repro.test.ts` that fails reliably in 200ms.
> Phase 2 hypotheses (ranked): (1) stale cache key omits `userId`; (2) async write not awaited; (3) tz offset.
> Phase 3: H1 predicted two users would collide — the test confirms it. One-line key fix. Loop green.

## Why this works
A deterministic loop converts debugging from narrative guessing into falsification. It is the practical
form of kernel Principle 4 (an observable signal defines "done").
