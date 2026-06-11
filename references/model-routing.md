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

## Model Usage Policy — file reading & context gathering

To minimize token usage: **discovery is Haiku's job.** Whenever source code, configuration,
documentation, logs, or specs need to be read, delegate the initial analysis to a Haiku-powered
subagent (this repo ships one: `.claude/agents/context-reader.md`).

The Haiku subagent is responsible for: reading files, extracting relevant context, identifying
affected modules, summarizing findings, and producing a concise handoff report.

Higher tiers (Sonnet/Opus) should NOT directly read large files unless:
- Haiku explicitly indicates ambiguity;
- architectural decisions are required;
- security review is required;
- complex reasoning is required;
- the user explicitly requests deep analysis.

### Mandatory context-collection workflow

```
Read files (Haiku) → context report → handoff summary → Sonnet/Opus planning → implementation → review
```

Before any implementation: spawn the `context-reader` subagent, have it read all relevant files and
identify impacted modules, and wait for its structured handoff. **Only after receiving the handoff may
implementation begin.** The handoff format:

```
### Files Read
### Current Behavior
### Impact Analysis
### Risks
### Recommended Approach
```

### Tier preference, restated
- **Haiku for discovery** (reads, grep sweeps, summaries)
- **Sonnet for implementation** (the workhorse)
- **Opus for architecture/review** (where a wrong answer is costly)

> For current model IDs, context windows, and pricing, use the `/claude-api` skill — don't hardcode prices here.
