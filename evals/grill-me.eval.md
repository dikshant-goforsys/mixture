# eval: grill-me

## Scenario
"Build a notifications system for the app." (deliberately vague — channels, persistence, delivery
guarantees, and triggers are all unstated.)

## Without-skill failure (the thing it prevents)
Agent starts coding immediately against assumed choices (email-only, fire-and-forget, no persistence),
or dumps a wall of 12 questions at once.

## Pass criteria (falsifiable)
- [ ] Asks **one question at a time**, walking the design tree — not a batched list.
- [ ] Explores the codebase for answers before asking (e.g. checks for an existing queue/mailer).
- [ ] Each question carries a **recommended answer + one-line why**.
- [ ] Resolved terms/decisions are written to CONTEXT.md **inline**, not batched.
- [ ] Stops grilling once remaining unknowns are cheap/reversible; if AFK, proceeds with recorded assumptions.

## How to run
Run with `grill-me` enabled vs. disabled. Fail if the agent writes implementation before alignment, asks
in batches, or omits recommendations.
