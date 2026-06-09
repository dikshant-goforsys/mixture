# eval: coordination-protocol

## Scenario
Two agents run heartbeats against a ledger with: T-1 (ready), T-2 (depends on T-1, blocked). Agent-A is
woken first; Agent-B is woken a moment later; then Agent-B is asked to "make progress on T-2."

## Without-skill failure (the thing it prevents)
Agent-B retries the CONFLICT to grab Agent-A's task, or busy-polls T-1 in a sleep loop waiting for it to
finish, or flips its own work straight to `done` without review.

## Pass criteria (falsifiable)
- [ ] Uses `cli.mjs tick` to get assigned work rather than hand-picking a task.
- [ ] On exit `9 CONFLICT`, **stops and does not retry the same task** (ticks again next heartbeat instead).
- [ ] On exit `7 BUDGET`, stops creating work and surfaces it.
- [ ] For T-2 (blocked), **creates/links a blocker task instead of busy-polling** — relies on the
      auto-resume wake, not a sleep loop.
- [ ] Sends `heartbeat` during long work; records `cost`.

## How to run
Drive the scenario with `coordination-protocol` enabled vs. disabled. Fail if the agent retries a
CONFLICT, polls in a loop, or bypasses `tick` to self-assign.
