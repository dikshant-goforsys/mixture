---
name: tdd
description: Test-driven development via red-green-refactor on vertical slices. Use when building a feature or fixing a bug where the desired behavior can be expressed as a failing test before implementation. Skip for pure refactors, config changes, or exploratory spikes.
license: MIT
---

# tdd — vertical-slice red-green-refactor

The practical form of kernel Principle 4: a failing test *is* the success criterion. Pattern from
`mattpocock/skills`. The trap is **horizontal slicing** — writing all tests, then all implementation —
which produces brittle tests coupled to a design you haven't validated yet.

## The loop
1. **Red** — write one failing test for the smallest end-to-end slice of behavior.
2. **Green** — minimum code to pass it (kernel Principle 2). Nothing speculative.
3. **Refactor** — clean up with the test as your safety net.
4. Repeat for the next slice.

## What makes a good test (survives refactor)
- Tests **behavior through the public interface**, not internals.
- **Never mocks internal collaborators** — mock only true boundaries (network, clock, fs).
- **Never queries the DB/internal state to verify** — assert on observable output.
- A test that breaks when you refactor without changing behavior is a bad test.

## Example

❌ **Horizontal slice, mocks internals:**
> Writes `userService.test.ts` with all 8 cases up front, mocks `userRepository` and `passwordHasher`,
> asserts `hasher.hash` was called. Then builds the service. Tests pass; a later refactor of the repo
> breaks all 8 even though behavior is unchanged.

✅ **Vertical slice, behavior-first:**
> Slice 1: `POST /signup with valid input → 201 and the user can then log in`. One failing test through
> the HTTP boundary, real (in-memory) repo. Make it pass. Refactor. Then slice 2: duplicate email → 409.

## Why this works
Vertical slices validate the design as you go and keep tests pinned to behavior, so refactoring stays
cheap. Hand off to `diagnose` if a slice fails for an unknown reason.
