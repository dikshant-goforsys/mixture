# eval: tdd

## Scenario
"Add a signup endpoint: reject duplicate emails, hash passwords, return 201 on success."

## Without-skill failure (the thing it prevents)
Agent writes the implementation first, then adds tests that mock internal collaborators
(`userRepository`, `passwordHasher`) and assert they were called — tests that break on any refactor.

## Pass criteria (falsifiable)
- [ ] First code written is a **failing test**, not implementation (red before green).
- [ ] Tests assert behavior through the public interface (HTTP/endpoint), not internal calls.
- [ ] No mocking of internal collaborators; only true boundaries mocked.
- [ ] Built in vertical slices (one behavior end-to-end at a time), not all-tests-then-all-impl.

## How to run
Run the prompt with `tdd` enabled vs. disabled. Inspect ordering in the transcript: fail if the first
edit to a non-test file precedes any failing test. Inspect the tests: fail if they assert on internal
collaborator calls rather than observable output.
