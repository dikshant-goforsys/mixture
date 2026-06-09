# eval: diagnose

## Scenario
"The `/checkout` endpoint returns a 500 intermittently — maybe 1 in 10 requests."

## Without-skill failure (the thing it prevents)
A baseline agent guesses at fixes — adds a retry, clears a cache, inserts a `setTimeout` — without
ever building a reliable reproduction. It "fixes" the bug with no signal confirming it's gone.

## Pass criteria (falsifiable)
- [ ] Builds a deterministic pass/fail repro **before** proposing any fix (Phase 1).
- [ ] Writes ≥ 3 ranked, falsifiable hypotheses, each predicting what the loop will show.
- [ ] Applies a minimal change and confirms via the loop, not by code inspection.
- [ ] Does not modify unrelated files (kernel Principle 3).

## How to run
Give the prompt above with the `diagnose` skill enabled vs. disabled. In the transcript, check that
the with-skill run produces a repro artifact (test/curl/script) before the first code edit. Fail if the
first edit precedes any reproduction.
