---
name: frontend-component
description: Enforces design-system-first frontend development. Use this skill whenever creating, modifying, or reviewing any frontend component, page, layout, or UI element. Triggers on any frontend implementation work including React components, CSS/Tailwind styling, page layouts, responsive design, UI states (loading, empty, error), and animations or transitions. Also use when the task involves reading or applying design tokens, consulting the Codex Design prototypes, or implementing interaction behaviour from a UX spec. If the work touches anything the user will see, this skill applies.
---

# Frontend Component Development

This skill ensures every frontend component is built from the project's established design system — never invented from scratch by the agent. It enforces a mandatory read-before-write discipline: design tokens, the Codex Design prototype source, and interaction specs must be consulted before any code is produced.

## Critical Principle: Visual Outcome, Not Implementation Specification

The Codex Design prototypes define **what the screen should look like** — the visual result. They do **not** define how to build it. The agent must match the visual outcome but use its own engineering judgment for implementation:

- **Do** match the visual appearance: colours, typography, layout proportions, visual hierarchy, spacing feel.
- **Do not** copy the prototype's React decomposition, plain inline-CSS values, or DOM structure. The prototype is hand-coded React + Babel-standalone for design fidelity — its architecture is a design tool artifact, not a component architecture for the production app.
- **Do** use the nearest sensible design token for spacing rather than copying arbitrary pixel values. If the prototype shows `padding: 23px` from manual nudging, use the nearest token (e.g. `p-6` for 24px) that achieves the same visual result.
- **Do** decide the right React component decomposition independently. A prototype screen composed of 40 inline-styled `<div>`s does not mean 40 React components.
- **Do** use Tailwind v4 `@theme` utilities, shadcn/ui v4 primitives, Motion 12.x for animation, and the project's three-layer component architecture — not the prototype's plain HTML/CSS output.

The test is: does the implemented screen visually match the prototype at arm's length? If yes, the implementation is correct regardless of whether the underlying code structure matches the prototype's source.

## Before Writing Any Code

Complete these steps in order. Do not skip any step. Do not start implementation until all four are done.

### 1. Read the design tokens

Open `nextjs-app/docs/design/DESIGN.md` and load the full token set: colours, typography, spacing scale, border radii, shadows, and any component-level tokens defined there.

**Rules:**
- Every colour used in code must reference a token from DESIGN.md. Do not invent hex values, RGB values, or Tailwind colour names that are not mapped to a design token.
- Every font family, size, and weight must match the typography scale in DESIGN.md.
- Spacing values (padding, margin, gap) must use the spacing scale from DESIGN.md, not arbitrary pixel values.
- If a value you need is not in DESIGN.md, flag it explicitly in your response rather than inventing one. Say: "DESIGN.md does not define [what you need] — this requires a design decision before implementation."

### 2. Read the Codex Design prototype source

The visual + behaviour reference for every screen is the Codex Design bundle at `nextjs-app/docs/design/references/Codex-design/`. The bundle's own `README.md` is written for coding agents — read it once per session.

For the screen you are implementing:

1. **Locate the prototype** that matches your story's persona × viewport:
   - Free, mobile → `project/SunnySeat Free.html` and its `project/src-free/` folder
   - Premium, mobile → `project/SunnySeat Prototype.html` and `project/src/`
   - Free, desktop → `project/SunnySeat Desktop Free.html` and `project/src-desktop/`
   - Premium, desktop → `project/SunnySeat Desktop Premium.html` and `project/src-desktop/`
2. **Read the JSX components** rendered for the screen. **The JSX source is the canonical visual spec** — dimensions, colours, layout rules, conditional states are spelled out there directly. Do not measure or eyedropper from the rendered prototype or from the captured PNGs; the source is unambiguous in a way that pixels are not.
3. **Skim the chat transcripts** in `references/Codex-design/chats/` if intent is unclear — they show how the design iterated to its current shape and capture *why* a decision was made.
4. **Translate, don't copy.** The prototype's inline CSS values, plain `<div>` structure, and React component splits are design-tool output. Implement the visual outcome using the project's Tailwind v4 `@theme` utilities, shadcn/ui v4 primitives, and the three-layer component architecture. Verify any colour or spacing you find in the prototype's `:root` CSS variables resolves to a DESIGN.md token before using it.
5. **Captured PNGs are gate inputs, not specs.** `references/screens/{mobile,desktop}/{screen-id}.png` are the screenshots fed to the visual validation gate. They are downstream artifacts of the prototype, not a separate source of truth. Look at them only if you want a quick "what does this state actually render to" sanity check; otherwise read the source.

For screens the prototype does not cover (`not-found`, `about`, `premium-recovery`, `map-primary-offline`), fall back to `references/screens/legacy/` (Figma exports). `STATE-MAPPING.md` inside the bundle folder lists which screens are which.

### 3. Read the UX behaviour spec

Open the UX design specification at `_bmad-output/planning-artifacts/ux-design-specification.md` and find the Screen Inventory section for the screen you are implementing. This document defines everything the prototype source can show *statically* but cannot enforce as a contract:

- **Interactions**: what happens on tap, swipe, long-press, hover
- **States**: loading, empty, error, success — what each looks like and when each appears
- **Animations**: entrance/exit transitions, timing (in ms), easing functions, delays
- **Edge cases**: what happens with very long text, zero items, network failure

The prototype usually demonstrates the *happy path* with rough animation timing; the UX spec is the precise contract. When the prototype and the UX spec disagree on a timing or transition shape, the UX spec wins. If they disagree on visual layout, the prototype wins. Flag genuine conflicts to the user rather than silently choosing.

### 4. Identify the screen-state recipe (state-variant screens only)

If the screen is one of the state-variant screens (paywall, modals, sheet snap points, onboarding), check `nextjs-app/docs/design/references/Codex-design/STATE-MAPPING.md` to understand:

- Which prototype + which state-forcing recipe (localStorage seed, Tweaks button, click sequence) reaches that state
- Whether the recipe is currently working or marked TODO

This tells you (a) what the state should render to and (b) whether the visual gate has a captured PNG for it. If the recipe is TODO and you are implementing the corresponding state in our app, expect to also extend the recipe in `nextjs-app/scripts/capture-Codex-design-refs.mjs` so the gate has a reference to compare against.

## During Implementation

### State variants

- If the component has multiple visual states (modal open/closed, overlay visible, error/empty/loading variants), consume the `useForcedState()` hook so visual validation can force each state via `?_state=<screen-id>`. Check AGENTS.md for the convention and `docs/dev/state-forcing.md` for implementation details.

### Token compliance

- Use Tailwind utility classes that map to DESIGN.md tokens. The project uses Tailwind CSS v4 with a CSS-first `@theme` block in `globals.css` as the single source of truth for all design tokens. Reference these theme utilities (e.g. `bg-surface-cream`, `text-amber-dark`, `shadow-card`), not raw values.
- Never hardcode colours as hex/RGB literals in component files. Always reference the design system.
- If you need a colour variant (e.g. 10% opacity of the primary colour), derive it from the token and document the derivation.

### Component structure

- Follow the project's three-layer component architecture: `nextjs-app/components/ui/` (shadcn/ui primitives) -> `nextjs-app/components/composed/` (multi-primitive compositions) -> `nextjs-app/components/custom/` (feature components by domain). Direction of dependency is one-way — never skip layers.
- Co-locate component-specific styles, types, and tests where the project convention dictates.
- Export components with clear, descriptive names. Use semantic names based on function (e.g. `VenueCard`, `SunTimeline`) not Figma layer names.

### Accessibility

- Every interactive element must have appropriate ARIA attributes.
- Images must have alt text (use empty alt="" for decorative images).
- Colour contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text) — verify against DESIGN.md token values.
- Focus states must be visible and must not rely solely on colour change.
- Respect `prefers-reduced-motion`: wrap non-essential animations in a motion-safe check. The project uses Motion 12.x (imported from `motion/react`).

### Responsive behaviour

- Unless the spec says otherwise, components must work at minimum across these breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide desktop).
- The Figma reference may represent only one viewport. Check whether the UX spec defines different layouts per breakpoint. If it does, implement them. If it doesn't and the component clearly needs responsive adjustment, flag it.

## Acceptance Criteria Checklist

Before marking any frontend story as complete, verify:

- [ ] All colours, fonts, and spacing reference DESIGN.md tokens — no invented values
- [ ] Visual output matches the Figma reference at the target viewport
- [ ] All interactions from the UX behaviour spec are implemented
- [ ] All animation timings match the spec (±50ms tolerance)
- [ ] All states (loading, empty, error) are implemented
- [ ] Accessibility attributes are present on all interactive elements
- [ ] Component renders correctly at 375px and 1024px minimum
- [ ] `prefers-reduced-motion` is respected for non-essential animations