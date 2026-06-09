# Cost-aware model routing

Match the task class to the cheapest model tier that can do it well; escalate on uncertainty or failure.
Pattern from `affaan-m/ECC`. The goal is not "always use the strongest model" — it's spending capability
where a wrong answer is expensive and saving it where it isn't.

## Tier → task mapping (Claude family)

| Tier | Model id | Use for |
|------|----------|---------|
| **Haiku** | `claude-haiku-4-5` | Classification, extraction, formatting, boilerplate, simple lookups, high-volume / low-stakes steps. |
| **Sonnet** | `claude-sonnet-4-6` | The default workhorse: implementation, refactors, most coding, code review, summarization. |
| **Opus** | `claude-opus-4-8` | Architecture, root-cause analysis spanning multi-file invariants, ambiguous design, security-critical reasoning — anywhere a wrong answer is costly. |

## Routing heuristics
- **Start cheap, escalate on signal.** Begin at the lowest tier that can plausibly succeed; promote when
  the task proves harder than expected (repeated failures, high ambiguity, cross-cutting reasoning).
- **Pin the model when the class is known.** In an agent's frontmatter (`model: opus`), fix the tier for
  tasks whose difficulty is predictable — e.g. a planner or security reviewer pins Opus; a classifier pins Haiku.
- **Decompose to down-route.** Split a big task so the expensive reasoning is isolated to one Opus step and
  the mechanical parts run on Haiku/Sonnet (the "15-minute unit" idea). Cheaper than running it all on Opus.
- **Don't down-route correctness-critical steps** to save pennies. Routing is an efficiency tool, not a
  reason to risk a wrong answer where it matters.

> For current model IDs, context windows, and pricing, use the `/claude-api` skill — don't hardcode prices here.
