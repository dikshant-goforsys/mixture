# Mixture

> A deliberately-small, layered skills + agents framework for Claude Code.
> Synthesized from the best ideas of four prior systems — and disciplined by the worst lessons of each.

Mixture is **not** another sprawling catalog. Its defining feature is what it refuses to become.
It takes the highest-value ideas from four projects and stacks them as four altitudes of one system:

| Layer | Concern | Sourced from | The lesson taken |
|------|---------|-------------|------------------|
| **L0 Substrate** | The `SKILL.md` spec itself | `anthropics/skills` | Don't reinvent the format. Build on it. |
| **L1 Behavioral kernel** | How one agent writes code | `andrej-karpathy-skills` | Steal the *mechanisms*, not the prose bulk. |
| **L2 Skill catalog + authoring standard** | Reusable units of know-how | `mattpocock/skills` | Small on purpose. Curation is the product. |
| **L3 Governance plane** | Install profiles, hooks, memory | `affaan-m/ECC` | Borrow patterns, **reject the bloat**. |
| **L4 Coordination plane** | Many agents over time | `paperclipai/paperclip` | Heartbeat, locks, DAGs, budgets — **deferred until earned**. |

## The governing constraint

Matt Pocock's curation philosophy governs every layer: **small, composable, model-agnostic, hackable**,
and *anti-framework* (it never takes control away from you). Every other idea is admitted only if it
survives that constraint. The cap is intentional: **~30 shipped skills, ever.** Volume is the disease.

## Status & sequencing

This repo builds bottom-up. **L4 is specified, not implemented** — building orchestration before you
have a real fleet of agents to coordinate is the #1 documented failure mode (see `docs/premortem.md`).

- ✅ **Phase 1 (now):** L0–L2 — the kernel skill, the `write-a-skill` quality gate, exemplar skills, validation.
- ✅ **Phase 2:** L3 — profiles, env-governed hooks (`resolve-hooks`), memory lifecycle, CI gate, ECC-derived references.
- ⚠️ **Phase 3 (built ahead of gate — ADR-0003):** L4 — tested ledger substrate + `coordination-protocol` skill done; automation layer wired and iterating. See `coordination/README.md`.

## Layout

```
bin/mixture.mjs                   # the `npx mixture` installer CLI
.claude-plugin/plugin.json        # manifest (L0)
skills/
  kernel/coding-behavior/         # L1 — the ONE behavioral skill
  meta/write-a-skill/             # L2 — the authoring quality gate
  engineering/{grill-me,diagnose} # L2 — exemplars that set the standard
  in-progress/ deprecated/        # hidden buckets (not shipped)
manifests/install-profiles.json   # L3
hooks/                            # L3 — minimal + CI-validated
coordination/                     # L4 — tested ledger + invariants + CLI + heartbeat runtime
evals/                            # FIRST-CLASS. No skill ships without one.
scripts/validate-frontmatter.mjs  # enforce-in-code what prose can't guarantee
docs/{architecture,premortem,roadmap,coordination-plane.spec}.md
docs/adr/                         # we dogfood our own discipline
CONTEXT.md                        # domain glossary (dogfood)
```

## Quick start

**Use it in another project** (installer CLI — see `how-to-use.md`):
```bash
npx mixture install --profile dev                 # skills into .claude/skills
npx mixture install --profile full --with-memory --with-coordination
npx mixture list | doctor                         # profiles / what's installed
```

**Develop the framework itself:**
```bash
npm run ci                              # full gate: routing contracts + catalog drift + hooks + L4 tests
node scripts/resolve-hooks.mjs --explain   # see which hooks are active for your MIXTURE_HOOK_PROFILE
```

See `docs/architecture.md` for the full design and exactly what was taken from each source repo.
