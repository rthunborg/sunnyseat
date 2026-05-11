---
name: frontend-component
description: Use before creating, modifying, or reviewing SunnySeat frontend UI: React components, pages, layouts, Tailwind styling, responsive states, animations, visible copy, accessibility, or visual-validation fixes.
---

# Frontend Component Development

SunnySeat frontend work is design-system-first. Read the current rulebook first:

- `AGENTS.md`
- `project-context.md`
- `nextjs-app/docs/design/DESIGN.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md` when available

## Visual Reference

The active visual reference bundle in this checkout is:

- `nextjs-app/docs/design/references/claude-design/`
- `nextjs-app/docs/design/references/claude-design/README.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/docs/design/references/screens/{mobile,desktop}/`

Match the visual outcome, not the prototype implementation. Do not copy inline CSS, arbitrary pixels, DOM structure, or React decomposition from the prototype. Translate the outcome into Tailwind v4 `@theme` tokens, shadcn/ui primitives, Motion, and SunnySeat's component layers.

The expected root docs `screens.md`, `sunnyseat-screen-flow-map.md`, and `sunnyseat-stitch-prompts.md` are not present in the active repo tree. Treat that as context to report, not as permission to invent replacements.

## Required Checks Before Editing UI

1. Read `nextjs-app/docs/design/DESIGN.md` and identify the tokens you need.
2. Read the relevant prototype source under `nextjs-app/docs/design/references/claude-design/` if present.
3. Read the relevant UX behaviour section in `_bmad-output/planning-artifacts/ux-design-specification.md` if present.
4. Check the Screen ID -> Route Map in `project-context.md` for state-forcing and visual-validation routes.

## Implementation Rules

- Use design tokens only: no raw hex/RGB colors, arbitrary pixel spacing, or custom shadows.
- Use the three layers in order: `components/custom/` -> `components/composed/` -> `components/ui/`.
- Client components must not import from `lib/solar`, `lib/weather`, `lib/supabase`, `lib/middleware`, or `lib/buildings`.
- Data access goes through `app/api/*`, `hooks/queries/`, and `hooks/mutations/`.
- Query keys come from `nextjs-app/lib/query-keys.ts`.
- User-facing copy is Swedish by default and should use scoped `next-intl` keys.
- Interactive elements need accessible names, visible focus, keyboard support, and 44x44 px touch targets.
- Respect `prefers-reduced-motion`.
- Map pins and statuses must not rely on color alone.

## Completion

For frontend stories, visual validation is part of the story review gate:

```bash
scripts/story-review.sh <story-id>
```

Use direct visual validation only when debugging:

```bash
scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]
```
