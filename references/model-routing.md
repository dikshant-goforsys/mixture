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
subagent. The package ships one — `context-reader` — installed into your project's
`.claude/agents/` via `npx mixture-skills install --with-agents` (also registered in the plugin
manifest's `agents` field).

The Haiku subagent is responsible for: reading files, extracting relevant context, identifying
affected modules, summarizing findings, and producing a concise handoff report.

Higher tiers (Sonnet/Opus) should NOT directly read large files unless:
- Haiku explicitly indicates ambiguity;
- architectural decisions are required;
- security review is required;
- running a code review (the reviewer must read the diff directly to cite `file:line` findings);
- complex reasoning is required;
- the user explicitly requests deep analysis.

Skip the subagent round-trip entirely when the relevant context is already in-window or the
change is single-file/trivial — the policy is an efficiency tool (see the heuristics above),
not a tax on one-line fixes.

### Mandatory context-collection workflow

```
Read files (Haiku) → context report → handoff summary → Sonnet/Opus planning → dev-loop (tdd → full gate → review, looped)
```

Before any implementation: spawn the `context-reader` subagent, have it read all relevant files and
identify impacted modules, and wait for its structured handoff. **Only after receiving the handoff may
implementation begin — and implementation then proceeds under the `dev-loop` gate** (failing test
first, review as a binding loop), which this policy feeds, not replaces. The handoff format:

```
### Files Read
### Current Behavior
### Impact Analysis
### Risks
### Recommended Approach
```

### Tier preference, restated
- **Haiku for discovery** (reads, grep sweeps, summaries)
- **Sonnet for implementation and everyday code review** (the workhorse — see the tier table)
- **Opus for architecture and security-critical review** (where a wrong answer is costly)

> For current model IDs, context windows, and pricing, use the `/claude-api` skill — don't hardcode prices here.
