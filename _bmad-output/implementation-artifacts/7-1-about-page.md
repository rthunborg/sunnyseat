# Story 7.1: About Page

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to learn how SunnySeat works and where the data comes from,
so that I can understand and trust the sun predictions.

## Context

First story of **Epic 7 "Polish & Platform"** (the last MVP epic; Epics 4/5/6 stay deferred). A standalone `/about` route ("Om") explaining the algorithm, the open-data sources, and the accuracy figure. **This is the first normal scrolling content page in the app** — every existing route (`/`, `/favoriter`) is a full-bleed map surface, so there is no page-layout precedent to copy; build the scroll layout from the design reference and tokens.

> **⚠️ Epic 8 dependency (soft — does NOT block this story).** The **TRÄFFSÄKERHET** accuracy figure must come from the validated, coverage-gated confidence model (Stories 3.0.5/3.0.6), not a hardcoded marketing "85%". The real validated figure depends on the **production cutover** (Epic 8's remaining maintainer step — flip `SUNNYSEAT_*` flags + run live round-trips). Until that figure exists, ship a **placeholder figure behind a single named constant** (see Task 5) so swapping in the real number later is a one-line change. The page is otherwise fully buildable now. [Source: epics.md:1977,1995,2143]

## Acceptance Criteria

> ACs are verbatim from `epics.md` → Story 7.1 (BDD form). The Design Gate Criteria below are part of the definition of done for this frontend/new-screen story.

**AC1 — Mobile layout.**
**Given** the user navigates to the About page (via "Om" tab on mobile or `/about` route)
**When** the page renders on mobile
**Then** a scrollable page displays with, in order:
- "← Tillbaka" back link at top
- "Hur fungerar SunnySeat?" heading
- Hero photo (sunset/outdoor scene)
- "ALGORITMEN" section explaining sun position calculations, shadow modeling, weather integration
- "DATAKÄLLOR" section listing the open data sources — Lantmäteriet (byggnadsfotavtryck), Göteborgs Stad öppna data (3D-byggnader och höjdmodell), Met.no (väder), OpenStreetMap — each as a list item with icon (**user-safe source names only; no EPSG/layer/DTM/RPC internals** per Story 3.0.6)
- "TRÄFFSÄKERHET" section on warm gradient background with explanation text; the headline figure must come from the validated, coverage-gated confidence model (Stories 3.0.5/3.0.6), framed consistently with the app's uncertainty copy rather than a hardcoded marketing "85%" (**use a placeholder until the real validated figure is available**)
- "Kontakt & feedback" section at bottom
- "Tillbaka till kartan" CTA link

**AC2 — Desktop layout.**
**Given** the about page renders on desktop
**When** viewport >= 1024px
**Then** DesktopNavBar is visible at top, content max-width ~720px centred
**And** data sources section uses two-column layout
**And** footer shows "sunnyseat" wordmark + "KONTAKT" link + "Tillbaka till kartan ↗" CTA
**And** no "← Tillbaka" link — navigation via navbar

**AC3 — Accuracy count-up.**
**Given** the "TRÄFFSÄKERHET" section scrolls into view
**When** the accuracy stat becomes visible for the first time
**Then** the number counts up from 0 to the validated figure (800ms, `easing-enter`) — one-time animation

**AC4 — Return navigation.**
**Given** the user taps "← Tillbaka" (mobile) or "Tillbaka till kartan" (either)
**When** the navigation is triggered
**Then** the app returns to the map view

**AC5 — Reduced motion.**
**Given** `prefers-reduced-motion` is enabled
**When** the stat animation would trigger
**Then** the number displays instantly at 85% with no count-up

> **AC5 reconciliation (SM):** "85%" is the epics' illustrative figure. Per AC1 + the Epic 8 alignment note, render the **placeholder accuracy constant** (Task 5.1) instantly under reduced motion — not a literal hardcoded 85%.

**AC6 — Privacy policy (NFR16).**
**Given** the privacy policy must be accessible (NFR16)
**When** the about page renders
**Then** a link to the privacy policy is included in the contact/footer section

**AC7 — i18n.**
**Given** all about page text uses i18n keys
**When** the locale is Swedish or English
**Then** all section headings, body text, and data source descriptions render in the correct language

### Design Gate Criteria

(Verbatim from epics.md → Story 7.1.)

- **Visual:** Matches active visual reference `about` from the current source-of-truth bundle
- **Behaviour:** All interactions and states defined in UX spec §AboutPage are implemented
- **Animation:** Accuracy stat count-up (800 ms) and scroll-trigger animations match spec timings (±50 ms tolerance)
- **Visual validation:** Screenshot comparison against the active visual reference passes before QA handoff

## Tasks / Subtasks

- [ ] **Task 1 — i18n copy: extend the existing `about` scope (AC: #1, #2, #6, #7)**
  - [ ] 1.1 Extend `nextjs-app/messages/sv/about.json` and `nextjs-app/messages/en/about.json` (both already exist with keys `title, summary, model, uncertainty, guidance`). **Reconcile, do not duplicate:** `title` already equals "Hur fungerar SunnySeat?"; reuse `summary`/`model`/`uncertainty`/`guidance` for the ALGORITMEN + uncertainty narrative. Add the missing flat keys: section labels (`sectionAlgorithm` "ALGORITMEN", `sectionDataSources` "DATAKÄLLOR", `sectionAccuracy` "TRÄFFSÄKERHET"), data-source names + descriptions (Lantmäteriet / Göteborgs Stad öppna data / Met.no / OpenStreetMap — user-safe names only), the accuracy headline + body copy, `sectionContact` "Kontakt & feedback", `backLink` "← Tillbaka", `ctaToMap` "Tillbaka till kartan", `ctaToMapDesktop` "Tillbaka till kartan ↗", `footerContact` "KONTAKT", `privacyLink`. **Keep sv/en key sets identical** (the sv/en parity test enforces this). Swedish is the source language. [Source: codebase — `messages/{sv,en}/about.json`; epics.md:1975,1994]
  - [ ] 1.2 Verify **no geodata internals** leak into any string (no EPSG, no Baskarta layer names, no DTM/RH2000, no RPC/SQL names) per the Story 3.0.6 contract. Data-source list uses only the four user-safe names above. [Source: epics.md:1975,1994; AGENTS.md geodata-copy rule]

- [ ] **Task 2 — About route + page scaffold (AC: #1)**
  - [ ] 2.1 Create `nextjs-app/app/[locale]/about/page.tsx` (the `[locale]` segment, so it inherits `NextIntlClientProvider`). Model the route file shape on `app/[locale]/favoriter/page.tsx`. **Do NOT render nav bars in the page** — `ResponsiveLayout` already renders `MobileNavBar`/`DesktopNavBar` for the whole `[locale]` tree; just render page content. [Source: codebase — `app/[locale]/favoriter/page.tsx`, `components/.../ResponsiveLayout.tsx`]
  - [ ] 2.2 Build the mobile scroll layout in the AC1 order. Use `useTranslations('about')` in a `'use client'` component (the project has no `getTranslations`/server-translation usage; follow the established client pattern). [Source: codebase — `MobileNavBar.tsx:39`]
  - [ ] 2.3 Use the section-container pattern (a reusable `InfoCard`-style container) for ALGORITMEN / DATAKÄLLOR / TRÄFFSÄKERHET. Place new feature components under `components/custom/about/` (smart/feature layer); keep any pure presentational sub-pieces in `composed/`. Respect the `custom/ → composed/ → ui/` dependency direction. [Source: AGENTS.md component taxonomy]
  - [ ] 2.4 **Reconcile AC1's "via 'Om' tab on mobile" wording with the real nav contract: do NOT add an "Om" bottom-nav tab.** Per `project-context.md:182` About is deliberately a standalone `/about` route reached via the **desktop** top navbar (the `common.json` `nav.om` key already exists for that link); the MVP mobile bottom nav stays exactly `Nära mig`/`Favoriter` (`MobileNavBar.tsx:16-19`). Mobile reaches `/about` by direct navigation, not a new tab. If the maintainer wants a mobile entry point, surface it as a design decision — do not invent a tab. [Source: project-context.md:182; codebase — `MobileNavBar.tsx:16-19`]

- [ ] **Task 3 — DATAKÄLLOR list + hero + sections (AC: #1)**
  - [ ] 3.1 Hero photo (sunset/outdoor scene) at the top below the heading. Use a `next/image` asset (place under `public/`); no inline styles. If no approved hero asset exists, surface it as a design decision rather than inventing one.
  - [ ] 3.2 DATAKÄLLOR: render the four sources as a list, each with an icon. Source names are user-safe only (see Task 1.2). Tapping a source does nothing (informational). [Source: ux-design-specification.md Screen: about; epics.md:1994]
  - [ ] 3.3 ALGORITMEN + uncertainty copy reconciled with the existing `about.json` `model`/`uncertainty` keys (no contradictory re-wording). [Source: epics.md:1995]

- [ ] **Task 4 — Desktop layout (AC: #2)**
  - [ ] 4.1 Content max-width ~720px, centred. DesktopNavBar is already supplied by `ResponsiveLayout` (`hidden lg:flex`) and `main` reserves header height — do not re-add it. [Source: codebase — `ResponsiveLayout.tsx:19-23`, `DesktopNavBar.tsx:24`]
  - [ ] 4.2 DATAKÄLLOR uses a **two-column** layout at ≥1024px (use the `lg:` breakpoint; `useMediaQuery` exists if a JS branch is needed but prefer CSS). [Source: epics.md:2002]
  - [ ] 4.3 Desktop footer: "sunnyseat" wordmark + "KONTAKT" link + "Tillbaka till kartan ↗" CTA. **No "← Tillbaka" back link on desktop** (nav via navbar). [Source: epics.md:2003-2004]

- [ ] **Task 5 — TRÄFFSÄKERHET accuracy figure + count-up (AC: #3, #5)**
  - [ ] 5.1 Put the accuracy figure behind a **single named constant** (e.g. `ABOUT_ACCURACY_PLACEHOLDER` in a small module or `lib/constants/`), clearly commented as a placeholder pending the Epic 8 production cutover + validated coverage-gated figure. Swapping in the real number must be a one-line change. **Do NOT hardcode a marketing "85%".** Frame the surrounding copy with the app's conservative uncertainty wording. [Source: epics.md:1995,2143]
  - [ ] 5.2 Build the count-up from scratch — **no count-up/scroll-trigger primitive exists in the repo.** Use the already-installed **Motion** library (`motion/react`, `"motion": "^12.38.0"`): `useInView` (one-time, `{ once: true }`) to trigger on first scroll-into-view, and `useMotionValue` + `animate(...)` (or `useSpring`) to count 0 → figure over **800 ms** with `easing-enter` (= ease-out; JS const `EASE_ENTER='easeOut'` in `lib/constants/animation.ts`). Define the 800 ms as a local constant (it is not a standard duration token). [Source: codebase — `lib/constants/animation.ts:32`; CodeMiner: no existing count-up]
  - [ ] 5.3 Reduced motion: gate with `useReducedMotion()` from `motion/react` (use `?? false` baseline) — when reduced, render the figure instantly at its final value, no count-up. Also apply `motion-reduce:` classes on any CSS-animated element. [Source: codebase — `OnboardingScreen.tsx:43-50`, reduced-motion convention; epics.md:2014-2016]
  - [ ] 5.4 Warm gradient background on the section — use an existing gradient token; do not invent a hex/rgba. If the exact warm-gradient token is missing, surface it as a design decision. [Source: AGENTS.md no-raw-color rule]

- [ ] **Task 6 — Navigation CTAs (AC: #4)**
  - [ ] 6.1 "← Tillbaka" (mobile only) and "Tillbaka till kartan" (both) navigate to the map (`/`). Use `Link` from `@/i18n/navigation` (locale-aware) — **NOT** the Story 3.1 routing `RouteButton` (that builds native-maps directions URLs). Style the primary CTA with the `gradient-route-button` utility class (or reuse `AMBER_CTA_BUTTON_CLASSNAME` from `components/composed/shared/AmberCTAButton.tsx`). [Source: codebase — `i18n/navigation.ts`, `RouteButton.tsx`, `AmberCTAButton.tsx`; epics.md:1976]

- [ ] **Task 7 — Privacy policy link (AC: #6 / NFR16)**
  - [ ] 7.1 Include a privacy-policy link in the contact/footer section, behind an i18n key. Confirm the privacy-policy destination with the maintainer if no route/URL exists yet (do not invent a dead link — surface it). [Source: prd.md NFR16; epics.md:2018-2020]

- [ ] **Task 8 — Accessibility (AC: all)**
  - [ ] 8.1 Semantic structure: a single `<h1>` ("Hur fungerar SunnySeat?"), section `<h2>`s for the uppercase labels, list semantics for DATAKÄLLOR, accessible names + visible focus on all links, 44×44px min touch targets, no colour-only meaning. [Source: AGENTS.md a11y rules]
  - [ ] 8.2 Add an axe test block for the About route in `test/e2e/axe.spec.ts` (the `a11y` Playwright project, Desktop Chrome): give the page root a `data-testid`, `goto('/about')`, wait for it, `runAxe`, assert `violations === []`. Follow the existing per-route pattern. [Source: codebase — `test/e2e/axe.spec.ts`; docs/dev/ci-gates.md]

- [ ] **Task 9 — Visual gate (Design Gate: Visual + Visual validation)**
  - [ ] 9.1 Run the visual gate for both viewports: `.\scripts\run-sh.ps1 scripts/visual-validate.sh about /about mobile` and `... about /about desktop`. The active references `docs/design/references/screens/{mobile,desktop}/about.png` already exist (prototype-derived, re-baselined 2026-05-21). [Source: AGENTS.md:166-179; UxMiner]
  - [ ] 9.2 If the implementation legitimately diverges from the prototype-derived reference, **do not silently replace** the PNG — reconcile, and if a rebaseline is justified, capture via the documented recipe and add a `REBASELINE-LOG.md` entry in the same change. If the divergence is out of scope, stop and ask the maintainer. [Source: AGENTS.md:177-179]

- [ ] **Task 10 — Tests (AC: all)**
  - [ ] 10.1 Component/unit tests (Vitest + @testing-library/react): the page renders all AC1 sections in order; the count-up reaches the final figure; reduced-motion renders the figure instantly (mock `useReducedMotion`); CTAs link to `/`; privacy link present. [Source: AGENTS.md testing]
  - [ ] 10.2 sv/en parity: the new `about.json` keys exist in both locales (the existing messages-parity test should cover this — verify it picks up the new keys). [Source: codebase — messages-parity test]
  - [ ] 10.3 No tests dropped; baseline is the current green suite (vitest 70 files / 625 tests at Epic 8 close).

- [ ] **Task 11 — Gate (AC: all)**
  - [ ] 11.1 From `nextjs-app/`: `npx tsc --noEmit` 0, `npx eslint . --quiet` 0, `npx vitest run` green (≥625 + new tests), Playwright a11y for `/about` green, visual gate pass (mobile + desktop). Use `.\scripts\run-sh.ps1 scripts/story-review.sh 7-1-about-page` for the review gate — do not hand-edit sprint-status to `review`. [Source: AGENTS.md:158-175]

## Dev Notes

### Tech stack (verified)
- **Next.js 16.2.2, App Router, Turbopack; React 19** (Server Components default, React Compiler on). **Run all commands from `nextjs-app/`.** [Source: architecture.md:131-163; AGENTS.md:9,17-21]
- **Tailwind CSS v4**, CSS-first `@theme` in `app/globals.css` — **no `tailwind.config.js`.** Tokens are binding; **no raw hex/rgba/px/inline styles.** [Source: architecture.md:166-169; AGENTS.md:107-109]
- **Animation: Motion 12 via `motion/react`** (imports `motion`, `AnimatePresence`, `useReducedMotion`, `useInView`, `useMotionValue`, `animate`) — **NOT `framer-motion`.** [Source: architecture.md:194; AGENTS.md:11; package.json `"motion": "^12.38.0"`]
- **i18n: next-intl**, scopes registered in `i18n/request.ts:5` (includes `about`, `common`). Locale-aware `Link`/navigation from `@/i18n/navigation`. [Source: codebase]

### Reuse, do not reinvent
- **Page shell:** copy the route-file shape from `app/[locale]/favoriter/page.tsx`. Nav bars come from `ResponsiveLayout` — never render them in the page.
- **CTA styling:** `gradient-route-button` utility (`globals.css:191`) on a locale-aware `<Link>`, or `AMBER_CTA_BUTTON_CLASSNAME` (`components/composed/shared/AmberCTAButton.tsx:6`). The `gradient-route-button` recipe RouteButton uses: `flex min-h-12 items-center justify-center rounded-pill gradient-route-button text-amber-cta-text shadow-route-button ... motion-reduce:transition-none`.
- **Reduced motion:** `useReducedMotion() ?? false` + `motion-reduce:` Tailwind classes (established convention).
- **Design tokens already exist:** `easing-enter` (`--ease-enter: ease-out`, `EASE_ENTER='easeOut'`), `text-display-xl` (`globals.css:334`), `color-amber-gold` (`globals.css:31`). [Source: ArchMiner §3]

### Anti-patterns to avoid
- ❌ Don't hardcode "85%" — the accuracy figure is a single named placeholder constant pending the Epic 8 validated figure.
- ❌ Don't use the routing `RouteButton` for the in-app "back to map" CTA (it's the native-maps handoff).
- ❌ Don't add an "Om" bottom-nav tab; About is a standalone `/about` route.
- ❌ Don't leak geodata internals (EPSG/Baskarta/DTM/RPC) into any user copy (Story 3.0.6).
- ❌ Don't re-create the nav bars or a server-translation path; follow the existing client `useTranslations` pattern.
- ❌ Don't invent colors/gradients/hero assets — use tokens/approved assets or surface a design decision.

### Carried deferred item (NOT triggered by this story)
- The deferred "locale-switcher → update existing MapLibre marker accessible names on locale change" item is targeted at *the first runtime locale switcher*. **Story 7.1 does not introduce a runtime locale switcher** (the About page consumes the active locale; it doesn't add a switcher UI), so this item stays in `deferred-work.md` targeted at the first i18n-switcher story — do NOT action it here. [Source: epics.md:2032-2033; deferred-work.md]

### Testing standards
- Vitest + @testing-library/react for component tests; Playwright `a11y` project (Desktop Chrome) for axe (add an About block). Visual gate via `scripts/visual-validate.sh`. Baseline: do not drop tests (625 green at Epic 8 close). [Source: AGENTS.md:194-204; architecture.md:421-428]

### Project Structure Notes
- Alignment: new feature route under `app/[locale]/about/`; feature components under `components/custom/about/` (respecting `custom/ → composed/ → ui/`); i18n in the existing `about` scope.
- Unchanged contracts: API boundary (this page is static/informational — no `lib/solar|weather|supabase` imports, no new API route), the `_state` forcing contract (About is a real route, not a `_state`), the visual reference set (reconcile, don't silently rebaseline).

### File Impact
- **Files Created:** `nextjs-app/app/[locale]/about/page.tsx`; feature components under `nextjs-app/components/custom/about/` (e.g. the page body + DATAKÄLLOR list + accuracy count-up component); an accuracy-placeholder constant module (or an entry in `nextjs-app/lib/constants/`); a hero image asset under `nextjs-app/public/`.
- **Files Modified:** `nextjs-app/messages/sv/about.json` + `nextjs-app/messages/en/about.json` (extend with new keys, key-identical); `nextjs-app/test/e2e/axe.spec.ts` (add an About route block); possibly `nextjs-app/components/custom/layout/DesktopNavBar.tsx` only if an "Om" desktop link is wired (confirm with maintainer — currently the `nav.om` key exists but no link). New component test file(s) under `nextjs-app/test/unit/**`.
- **Explicitly NOT created/changed:** no `tailwind.config.*` (Tailwind v4 is CSS-first `@theme`); no new API route or `hooks/queries` (page is static); no `lib/solar|weather|supabase` import; no new `MobileNavBar` tab; no new `_state` literal; no change to the `about` i18n scope registration in `i18n/request.ts` (the scope already exists).

### References
- [Source: CLAUDE.md] and [Source: AGENTS.md — canonical repo rulebook for AI agents] — API boundary, component taxonomy, token/i18n/a11y/animation rules, commands-from-`nextjs-app/`, branch/commit convention
- [Source: project-context.md] — Screen ID → Route Map (`about` → `/about`), design-gate workflow, conventions
- [Source: nextjs-app/docs/design/DESIGN.md] — design tokens (`gradient-route-button`, `text-display-xl`, `color-amber-gold`, easing/duration), the no-raw-color rule
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1 (lines 1970-2033)] — ACs, alignment note, deferred item
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Screen: about (mobile 1301-1329 / desktop 1331-1345)]
- [Source: _bmad-output/planning-artifacts/architecture.md — stack, tokens, i18n, testing/CI gates]
- [Source: nextjs-app/messages/sv/about.json, nextjs-app/messages/en/about.json — existing keys to extend/reconcile]
- [Source: nextjs-app/app/[locale]/favoriter/page.tsx — page-route model]
- [Source: nextjs-app/components/custom/layout/ResponsiveLayout.tsx, DesktopNavBar.tsx, MobileNavBar.tsx — shell + nav]
- [Source: nextjs-app/components/composed/routing/RouteButton.tsx, components/composed/shared/AmberCTAButton.tsx — CTA do/don't]
- [Source: nextjs-app/lib/constants/animation.ts, app/globals.css (tokens), i18n/navigation.ts]
- [Source: nextjs-app/docs/design/references/screens/{mobile,desktop}/about.png + REBASELINE-LOG.md — visual gate]
- [Source: nextjs-app/test/e2e/axe.spec.ts — a11y gate pattern]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
