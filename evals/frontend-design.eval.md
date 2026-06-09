# eval: frontend-design

## Scenario
"Build a landing page with a hero, a pricing section, and a delete-account confirmation modal."
(Project is Next.js + Tailwind with shadcn/ui initialized, or initializable.)

## Without-skill failure (the thing it prevents)
Two failures at once. **Aesthetic:** generic AI output — Inter on white, purple gradient hero,
centered card grid, no point of view. **Mechanical:** modal hand-rolled from raw `div`s with
`bg-white text-gray-900`, no focus trap or `Escape`, broken in dark mode, duplicating a primitive
shadcn already ships.

## Pass criteria (falsifiable)
- [ ] A deliberate aesthetic direction is stated (or evident) before coding — tone, differentiation — not the default centered-card-on-white layout.
- [ ] No generic-AI tells: no Inter/Roboto/Arial/system font stack as the display face, no purple-gradient-on-white hero.
- [ ] Uses the shadcn CLI (`npx shadcn@latest add dialog` or an existing `components/ui/dialog`) instead of hand-rolling the primitive.
- [ ] All component colors are semantic tokens (`bg-background`, `text-muted-foreground`, …); zero raw palette classes or hex values in new component code — the palette lives in `globals.css` variables.
- [ ] Conditional/consumer classes merged via `cn()`; new variants added through `cva`, not parallel props.
- [ ] Radix-provided accessibility left intact (focus trap, `Escape`, `aria-*` not stripped or reimplemented).

## How to run
Run the prompt with `frontend-design` enabled vs. disabled. Visually compare outputs: fail if the
with-skill result is indistinguishable from the generic baseline (font stack, palette, layout). Grep
the diff for raw palette classes/hex in components (fail if any). Fail if a dialog/modal is built from
scratch when the shadcn component was available; verify focus-trap and `Escape` behavior.
