---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality, built on the shadcn/ui design system — bold aesthetic direction executed through CLI-added owned components, Radix accessibility, and Tailwind semantic tokens. Use when building or modifying web components, pages, forms, or theming. Generates creative, polished code that avoids generic AI aesthetics. Skip for non-UI work or projects with an established competing design system.
license: MIT
---

# frontend-design — distinctive design, executed on shadcn/ui

Two failure modes, one skill. The **aesthetic trap**: generic "AI slop" — Inter on white, purple
gradients, predictable card grids — that looks like every other generated UI. The **mechanical trap**:
hand-rolling primitives shadcn already ships (losing Radix accessibility) and hard-coding palette
values that break theming. Design thinking picks the vision; the system rules execute it.
(Aesthetic direction adapted from Anthropic's official `frontend-design` plugin skill.)

## 1. Design thinking — before any code

Commit to a BOLD, intentional direction:
- **Purpose** — what problem does this interface solve, and for whom?
- **Tone** — pick a clear flavor: brutally minimal, maximalist, retro-futuristic, editorial,
  luxury/refined, playful, brutalist, organic, industrial… one direction, executed with precision.
- **Differentiation** — what's the one thing someone will remember?

Intentionality beats intensity: refined minimalism and bold maximalism both work; timid defaults don't.

## 2. Aesthetics guidelines

- **Typography** — distinctive, characterful fonts; pair a display font with a refined body font.
  Never default to Inter/Roboto/Arial/system stacks, and don't converge on the same "safe" pick
  (e.g. Space Grotesk) across projects.
- **Color & theme** — a cohesive palette with dominant colors and sharp accents, expressed **as
  shadcn CSS variables** (`:root` / `.dark` in `globals.css`) so the whole theme is one-file tunable.
  Avoid clichés (purple-gradient-on-white).
- **Motion** — a few high-impact moments (staggered page-load reveals, surprising hovers) over
  scattered micro-interactions. CSS-first; Motion library for React when available.
- **Spatial composition** — asymmetry, overlap, grid-breaking elements, generous negative space OR
  controlled density. Not the default centered-card layout.
- **Backgrounds & detail** — atmosphere over flat fills: gradient meshes, noise/grain, geometric
  patterns, layered transparency, deliberate shadows.
- Match implementation complexity to the vision: maximalism earns elaborate effects; minimalism earns
  restraint and precise spacing.

## 3. The system rules (shadcn/ui — how the vision ships)

1. **CLI before hand-rolling.** Dialog, dropdown, form, toast, table → `npx shadcn@latest add <component>`,
   then customize the copied source in place. You own `components/ui/`; never reimplement a primitive.
2. **Semantic tokens, never raw palette.** `bg-background`, `text-muted-foreground`, `bg-destructive` —
   never `bg-white`, `text-gray-500`, or hex in components. The bold palette lives in the tokens.
3. **Variants via `cva`, merging via `cn()`** from `lib/utils`, so consumer `className` overrides work.
4. **Don't strip what Radix gives you** — focus traps, `aria-*`, keyboard handling, portals. Striking
   design with broken accessibility is not production-grade.
5. **Forms = `react-hook-form` + `zod` + shadcn `<Form>`** — don't wire validation by hand alongside it.

Setup when absent: `npx shadcn@latest init`, then `add` only what the task needs.

## Example

❌ **Generic and hand-rolled:**
> White page, Inter, purple gradient hero, centered card grid. Modal built from raw `div`s with
> `bg-white text-gray-900`, no focus trap, no `Escape`. Forgettable, and broken in dark mode.

✅ **Intentional and systematic:**
> Editorial direction: oversized serif display font, off-black `--background`, one acid accent token,
> asymmetric two-column layout with an overlapping pull-quote, staggered reveal on load.
> `npx shadcn@latest add dialog` for the confirm flow, styled `bg-card text-card-foreground` via
> `cn()`; Radix keeps `Escape`/focus-trap. Dark/light both work because every color is a token.

## Why this works
A committed direction makes the UI memorable; the token layer makes that direction maintainable; owned
components + Radix make it accessible by default. Build features here under `dev-loop` — UI behavior is
TDD'd through the public interface (rendered output, interactions) and reviewed like any other code.
