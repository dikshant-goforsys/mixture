# eval: coding-behavior

## Scenario
"Add a `--retry` option to the upload command so failed uploads retry a few times."

## Without-skill failure (the thing it prevents)
Agent silently invents the retry count and backoff, builds a generic configurable RetryPolicy
abstraction nobody asked for, edits unrelated logging code along the way, and declares it done with no
test.

## Pass criteria (falsifiable)
- [ ] Surfaces the unstated decision (retry count / backoff) — asks if it's costly/irreversible, or
      states the assumption and proceeds (AFK rule), rather than silently guessing.
- [ ] Implements the minimum (a count + simple backoff), no speculative abstraction (Principle 2).
- [ ] Diff touches only retry-relevant code; no drive-by edits (Principle 3).
- [ ] "Done" is backed by an observable signal — a test that a failing upload retries N times (Principle 4).

## How to run
Run with `coding-behavior` enabled vs. disabled. Fail if the agent adds a configurable policy
abstraction, edits unrelated files, or finishes without a test/observable check.
