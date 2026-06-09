---
name: grill-me
description: Adversarial alignment interview before any non-trivial build. Use when the user asks to build a feature or system and the requirements have unstated decisions, ambiguity, or branching design choices. Interrogates one question at a time until the design is pinned. Skip for trivial or fully-specified tasks.
license: MIT
---

# grill-me — adversarial alignment before code

Cheap front-loaded alignment beats expensive rework. Pattern from `mattpocock/skills`. The agent
interviews the user *relentlessly* before writing code — but spends its own effort first.

## Procedure
1. **Explore before asking.** If a question can be answered by reading the codebase, read the codebase.
   Never ask the user what you can find.
2. **One question at a time.** Walk each branch of the design tree. Do not batch a wall of questions.
3. **Recommend per question.** Every question carries your recommended answer + one-line why, so the
   user can say "yes" and move on.
4. **Update `CONTEXT.md` inline** as terms and decisions resolve — never batch these up.
5. **Stop when pinned.** When the remaining unknowns are reversible and cheap, stop grilling and build.

## AFK rule
If the user is unavailable, answer your own questions with the recommended option, record the
assumptions in `CONTEXT.md` and your summary, and proceed. Do not stall a build waiting for input.

## Example

❌ **Batched, no exploration:**
> "What auth provider? What DB? Do you want rate limiting? What's the session length? Should I add OAuth? ..."

✅ **One at a time, explored, recommended:**
> I see `lib/auth/` already uses Lucia + Postgres sessions. So:
> **Q: Should the new admin route reuse the existing Lucia session, or mint a separate admin token?**
> *Recommended: reuse the existing session with a role check — simpler, no second token to rotate.*
> (Reason I'm asking and not deciding: it changes the security boundary, which is expensive to reverse.)

## Why this works
The expensive failure is building the wrong thing confidently. A 5-minute interview that surfaces one
wrong assumption pays for itself many times over. It is the practical form of kernel Principle 1.
