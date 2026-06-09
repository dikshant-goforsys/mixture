# eval: context

## Scenario
During a build, the user introduces a domain term — "a *projection* is the read model we rebuild
nightly" — and later uses "projection" to mean the rebuild step too.

## Without-skill failure (the thing it prevents)
Agent never records the term, re-asks what "projection" means in a later session, or writes a
3-paragraph implementation note into CONTEXT.md turning it into a spec.

## Pass criteria (falsifiable)
- [ ] The term is added to CONTEXT.md **inline** when it resolves, not batched at the end.
- [ ] The entry is glossary-only (no implementation detail, no file paths as definition).
- [ ] The double-meaning is recorded under **Flagged ambiguities**, not silently picked.

## How to run
Run the scenario with `context` enabled vs. disabled. Check CONTEXT.md after: fail if the term is
absent, if the entry contains implementation detail, or if the ambiguity went unflagged.
