# UX Reference Re-baseline Log

This is the durable audit trail for every change to the visual-validation reference PNGs and the recipes that generate them. Every re-baseline of a screen reference (whether the active PNG was replaced manually, the legacy export was promoted, or `scripts/capture-claude-design-refs.mjs` had its recipe altered or removed) MUST be recorded here in the same operation.

## When this log is mandatory

Add an entry whenever any of the following happens:

- A reference PNG under `nextjs-app/docs/design/references/screens/{mobile,desktop}/<screen-id>.png` is replaced with a different image (manually copied, swapped from `legacy/`, hand-edited, regenerated against a different prototype, etc.).
- A recipe in `nextjs-app/scripts/capture-claude-design-refs.mjs` is added, removed, or materially changed (state-forcing path, prototype source, viewport, click sequence).
- `nextjs-app/scripts/fetch-claude-design.sh` is run with a known-incompatible bundle (i.e. you accept a Claude Design bundle change that diverges from the UX spec for some screens — record those screens here so the next person knows).

If a re-baseline is left undocumented, future dev agents will assume the active PNG matches the prototype and chase phantom defects when the gate fails.

## How future dev agents discover this log

- `nextjs-app/CLAUDE.md` lists this file under §"Critical rules" (the visual-gate rule).
- `project-context.md` §"Design Artifacts" links here.
- The header of `nextjs-app/scripts/capture-claude-design-refs.mjs` points here for any recipe gap.
- Adjacency: this file lives next to the references it audits.

## Entry format

```
### YYYY-MM-DD — <screen-id> (<viewport>) — <story id> (<author>)

**Trigger:** <what failed / what we noticed>

**Resolution:** <option chosen — re-baseline / accept-with-rationale / recipe drop / etc.>

**Source of new PNG (if any):** <path | "n/a">

**Recipe change (if any):** <removed | edited | added — file path>

**Verification:** <visual gate result, e.g. "PASS — mobile, desktop after re-baseline">

**Reason / spec link:** <why this divergence is correct, with citations>

**Re-evaluation trigger:** <when this re-baseline should be revisited — e.g. "if the Claude Design desktop onboarding flow is reworked to match the spec">
```

---

## Entries

### 2026-05-04 — `onboarding` (desktop) — Story 1.5 Onboarding & Geolocation (Amelia / dev-story)

**Trigger:** The visual validation gate failed on the desktop `?_state=onboarding` capture. The verdict described a "two-panel onboarding modal with illustration on left and text/navigation on right ... pagination dots ... 'NÄSTA' next button ... 'SOLVÄDERSAPPEN' label ... step-by-step onboarding flow" — a multi-step desktop onboarding flow that the implementation does not, and should not, render.

**Resolution:** Re-baseline the desktop reference PNG to the legacy Figma export, and remove the desktop `onboarding` recipe from `capture-claude-design-refs.mjs` so a recapture does not silently regenerate the spec-incorrect prototype state.

**Source of new PNG:** `nextjs-app/docs/design/references/screens/legacy/desktop/onboarding.png` copied to `nextjs-app/docs/design/references/screens/desktop/onboarding.png`.

**Recipe change:** removed from `nextjs-app/scripts/capture-claude-design-refs.mjs` — the desktop `{ screenId: 'onboarding', viewport: 'desktop', prototype: PROTO.freeDesktop, steps: [...] }` entry is replaced with a comment block pointing here.

**Verification:** Mobile visual gate `PASS`; desktop visual gate `PASS` after re-baseline. (Both ran via `.claude/scripts/visual-validate.sh onboarding "/?_state=onboarding" {mobile,desktop}` against `next dev` on `localhost:3000`.)

**Reason / spec link:** UX spec §"Screen: onboarding (desktop)" explicitly states the desktop onboarding is "Identical to mobile — obtain location permission" with content centred horizontally and vertically. The Claude Design desktop prototype includes an alternate 3-step onboarding flow that the spec does not adopt. Story 1.5 implements the spec-compliant single-screen layout. Story 1.5 file Dev Notes §"Important caveats / known issues at story start" #1 documented this scope-drift in advance and offered the re-baseline path; Rasmus accepted on 2026-05-04.

**Re-evaluation trigger:** If the Claude Design desktop prototype is updated so its onboarding flow matches the spec (single-screen, centred, identical to mobile), re-add the recipe and capture against the new prototype state. Until then, the legacy PNG is authoritative for desktop onboarding.

### 2026-05-04 — `onboarding` (desktop) — Story 1.5 Onboarding & Geolocation (Amelia / dev-story) — second pass

**Trigger:** After the legacy-promote re-baseline above, the desktop visual gate still failed because the legacy Figma export pre-dates the story's explicit AC interpretations: the export is missing the wordmark sun icon, the trust microcopy line ("Gratis · Ingen registrering · Ingen spårning"), and the underlined skip link — all three of which Story 1.5 AC1 interpretation notes mandate. The legacy PNG is therefore an incomplete reference that does not reflect the story's specified behaviour.

**Resolution:** Auto-capture the running implementation at 1440×900 and use it as the desktop reference (option (b) in the dev-story decision tree, accepted by Rasmus 2026-05-04). The implementation already passes mobile against the prototype-derived reference, the UX spec mandates "Identical to mobile" on desktop, and every story-spec AC interpretation note was implemented verbatim — the implementation is the most faithful representation of "what desktop should look like" available without designer involvement.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=onboarding` at viewport `1440×900` via `npx playwright screenshot --browser chromium --viewport-size "1440,900" --wait-for-timeout 1500 ...`. Saved to `nextjs-app/docs/design/references/screens/desktop/onboarding.png`, overwriting the legacy promote from earlier today.

**Recipe change:** None. The desktop `onboarding` recipe in `capture-claude-design-refs.mjs` remains intentionally absent (see prior entry) because the prototype's desktop onboarding state is spec-incorrect; recapturing from the prototype would regenerate the wrong PNG.

**Verification:** Desktop visual gate `PASS` after re-baseline (`.claude/scripts/visual-validate.sh onboarding "/?_state=onboarding" desktop`). Mobile gate remains `PASS` against the prototype-derived reference, which is unchanged.

**Reason / spec link:** This is a self-fulfilling baseline — the gate passes because the reference *is* the implementation. The justification is structural rather than designer-blessed: the UX spec §"Screen: onboarding (desktop)" mandates "Identical to mobile", the mobile implementation passed against its prototype reference, and every Story 1.5 AC interpretation note (§"AC1 caveats") was implemented verbatim. Until a designer produces a definitive desktop layout that supersedes "identical to mobile", the implementation IS the spec for desktop. The trade-off — that this baseline cannot catch desktop regressions until a real reference exists — is accepted in exchange for unblocking Story 1.5 review without further manual design work.

**Re-evaluation trigger:** Mandatory recapture when ANY of the following happens: (1) a designer produces a desktop-specific onboarding design that supersedes "identical to mobile"; (2) the mobile reference is updated (the desktop should be re-derived from the same source so they stay in sync); (3) any AC1 visual element of `OnboardingScreen` is changed (gradient token, wordmark, microcopy, CTA chrome, layout). At that point a third entry replaces this baseline.

### 2026-05-05 — `onboarding` (mobile) — Story 1.5 Onboarding & Geolocation, code review Round 1 (Amelia / dev-story)

**Trigger:** Code review Round 1 batch-apply landed three patches that change the static onboarding overlay relative to the prior prototype-derived mobile reference: P1 (explicit `<br />` between "Hitta uteplatser" and "i solen — just nu." per Task 4.3) introduces a two-line headline; P2 (entrance fade-in from white per UX spec) is interaction-only — completes before the 1.5 s capture stability wait; P3 (skip-link `min-h-[44px]` per WCAG 2.1 AA touch-target rule) makes the skip-link box ~14 px taller and shifts the trust-microcopy line down accordingly. The prior mobile reference (440 KB, prototype-derived) does not show any of these.

**Resolution:** Auto-capture the running implementation at 390×844 with `Accept-Language: sv-SE,sv;q=0.9` (Playwright's default `Accept-Language: en-US` would otherwise resolve the locale to English) and use it as the new mobile reference. The implementation is the most faithful representation of the post-Round-1 spec — every patch is anchored to either an explicit acceptance criterion (P1 → Task 4.3, P3 → CLAUDE.md a11y rule) or the UX spec (P2 → §"Screen: onboarding (mobile)" entrance fade), and the prior reference predates these clarifications.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=onboarding` at viewport `390×844` via `node nextjs-app/scripts/capture-onboarding-rebaseline.mjs`. Saved to `nextjs-app/docs/design/references/screens/mobile/onboarding.png`, replacing the prior prototype-derived 440 KB PNG.

**Recipe change:** None to `nextjs-app/scripts/capture-claude-design-refs.mjs` — the mobile `onboarding` recipe still points at the Claude Design prototype, which remains the long-term source of truth. A one-off helper `nextjs-app/scripts/capture-onboarding-rebaseline.mjs` was added that captures from the running dev server with `Accept-Language: sv-SE` so the rebaseline is reproducible (the helper is documented in its header comment).

**Verification:** Mobile reference visually inspected — Swedish copy renders, two-line headline renders with explicit `<br />`, 44 px skip-link visible, trust microcopy intact. Visual gate not run end-to-end at this commit (the next sprint-status transition will exercise it).

**Reason / spec link:** P1 — Story 1.5 Tasks/Subtasks §4.3 ("Keep the line break (`<br />`) explicit between 'Hitta uteplatser' and 'i solen — just nu.'"). P3 — `CLAUDE.md` §"Critical rules" → "Accessibility is non-negotiable. … Every interactive element has a 44×44 px minimum touch target". The prior reference's ~30 px skip-link box reflects the prototype's plain-HTML rendering, which the project's a11y rule supersedes per "Match the visual outcome, not the prototype's implementation".

**Re-evaluation trigger:** Mandatory recapture when (1) any future code change alters the static layout of `OnboardingScreen` (font-size shifts, padding edits, copy-length shifts that break visual rhythm), (2) the locale-negotiation issue tracked in `deferred-work.md` ("Investigate why Accept-Language is not honoured by localePrefix: 'as-needed' at /") is fixed and the helper script becomes redundant.

### 2026-05-05 — `onboarding` (desktop) — Story 1.5 Onboarding & Geolocation, code review Round 1 (Amelia / dev-story) — third pass

**Trigger:** Same as the mobile entry above — Round 1 patches P1, P2, P3 change the static overlay. The prior 2026-05-04 second-pass desktop reference was a self-fulfilling baseline captured from the implementation, but it pre-dates Round 1 patches; the implementation has now diverged from it (post-P1 two-line headline, post-P3 taller skip-link).

**Resolution:** Recapture from the running implementation at 1440×900 with `Accept-Language: sv-SE,sv;q=0.9` so the desktop reference stays in sync with the mobile reference (per the prior 2026-05-04 second-pass entry's re-evaluation trigger #2: "the mobile reference is updated — the desktop should be re-derived from the same source so they stay in sync"). The "Identical to mobile" UX-spec mandate is satisfied.

**Source of new PNG:** Playwright capture of `http://localhost:3000/?_state=onboarding` at viewport `1440×900` via `node nextjs-app/scripts/capture-onboarding-rebaseline.mjs`. Saved to `nextjs-app/docs/design/references/screens/desktop/onboarding.png`.

**Recipe change:** None. The desktop `onboarding` recipe in `capture-claude-design-refs.mjs` remains intentionally absent (see 2026-05-04 first-pass entry — the prototype's desktop onboarding state is spec-incorrect and recapturing from the prototype would regenerate the wrong PNG).

**Verification:** Desktop reference visually inspected — same Swedish copy as mobile, content centred horizontally, full-width CTA, footer trust microcopy intact. UX spec §"Screen: onboarding (desktop)" mandate of "Identical to mobile" satisfied.

**Reason / spec link:** Same as the mobile entry above (P1 → Task 4.3, P3 → CLAUDE.md a11y rule, P2 → UX spec). Plus the 2026-05-04 second-pass entry's re-evaluation trigger #2 explicitly mandates this rebaseline whenever the mobile reference is updated.

**Re-evaluation trigger:** Inherits all triggers from the 2026-05-04 second-pass entry (designer produces a desktop-specific design; mobile reference updated; any AC1 visual element of `OnboardingScreen` is changed). The locale-negotiation issue (deferred-work.md) is also a re-evaluation trigger if fixed — the helper script becomes redundant.

### 2026-05-05/06 — `map-primary` + `onboarding` (desktop) — Story 1.6 CI/CD Quality Gates Task 2.13 (Amelia / dev-story)

**Trigger:** Story 1.6 Task 2.13 instructs "Re-run Stories 1.3 / 1.4 / 1.5 visual validation gates to confirm no regression. … For 1.5, re-capture both viewport reference PNGs from the running implementation and log the re-baseline … with the trigger 'Story 1.6 Task 2 reconciliation pass'". Task 2 reconciles design-token foundations (`--spacing-*`, `--z-*`, `--ease-*`, font fallback), lifts inline RGBA in `OnboardingScreen`, and replaces hardcoded navbar heights with tokens. The token consolidation shifts pixel-exact computed values for screens that consume `globals.css` — i.e. screens with a real Story 1.4/1.5 implementation backing the route. This entry covers ONLY those screens.

**Resolution:** Re-baseline the two desktop reference PNGs whose implementations consume `globals.css` and therefore drift from the post-Task-2 build: `map-primary.png` (Story 1.4 desktop) and `onboarding.png` (Story 1.5 desktop). The four future-story desktop captures (`payment-failed`, `premium-paywall`, `premium-paywall-processing`, `venue-detail`) were re-captured in the same operation but for a different reason — see the separate entry below.

**Source of new PNG:** Playwright captures of the dev-server routes per `project-context.md` Screen ID → Route Map at `1440×900` via `node nextjs-app/scripts/capture-claude-design-refs.mjs <screen-id>` against the running Next.js implementation. Each PNG saved into `nextjs-app/docs/design/references/screens/desktop/`.

**Recipe change:** None. Existing recipes in `capture-claude-design-refs.mjs` are unchanged; the captures use the same state-forcing routes the gate already consults.

**Verification:** Visual gate re-runs against the new references PASSED for both screen IDs at the desktop viewport. The post-1.6 P39 multi-viewport iteration (`sprint-status-gate.sh`) was used so both mobile and desktop rows were validated where present; no defects surfaced.

**Reason / spec link:** Story 1.6 §Tasks/Subtasks Task 2.13 (mandatory re-baseline trigger). Token reconciliation from Tasks 2.1 → 2.11 (spacing, z-index, ease, font fallback, sun-burst tokens, navbar height tokens) shifted computed values for the two desktop screens whose Story 1.4/1.5 implementations consume the affected tokens.

**Re-evaluation trigger:** Mandatory recapture when (1) any further token consolidation alters computed pixel values, (2) Story 5.x partner-pin styling changes the desktop `map-primary` overlay panel layout, (3) the Plan B re-baseline numbers in PRD NFR8 change again (would imply a different optimisation pass that may shift route-bundle-derived JS load times affecting first-paint).

### 2026-05-05/06 — Future-story desktop screens (desktop) — post-Story-1.5 prototype-state baseline carry-forward (Amelia / dev-story)

**Trigger:** Round 2 R-010 + D-B=B (2026-05-08) split this entry off from the Task 2.13 entry above. The four screens covered here — `payment-failed`, `premium-paywall`, `premium-paywall-processing`, `venue-detail` — are owned by future stories (Epic 4 Swish Payment / Epic 2 Venue Detail) that have NO implementation in the working tree; the captures necessarily come from the Claude Design prototype's hand-coded HTML/CSS, which does NOT consume `globals.css`. Story 1.6 Task 2 token reconciliation therefore CANNOT have shifted these PNGs' computed values — the original entry over-attributed the cause.

The actual cause was a post-Story-1.5 prototype-state baseline carry-forward: prior to Story 1.5 the desktop reference PNGs for these four future screens had been pending an explicit re-capture (see 2026-05-04 desktop-onboarding caveat) and were still showing pre-Story-1.5 prototype state. Story 1.6's blanket Task 2.13 sweep happened to refresh them, but the trigger is "prototype-state baseline carry-forward", not token reconciliation.

**Resolution:** Re-baseline the four desktop reference PNGs from the latest Claude Design prototype state: `payment-failed.png`, `premium-paywall.png`, `premium-paywall-processing.png`, `venue-detail.png`. These remain the authoritative references for the future stories (Epic 2 / Epic 4) that will eventually implement these screens; when those stories ship, their implementations will be visually validated against these prototype-state PNGs and re-baselined to implementation captures at that time.

**Source of new PNG:** Playwright captures of the Claude Design prototype HTML at `1440×900` via `node nextjs-app/scripts/capture-claude-design-refs.mjs <screen-id>` (the prototype state-forcing recipes drive each screen to its target state). Saved into `nextjs-app/docs/design/references/screens/desktop/`.

**Recipe change:** None. The recipes in `capture-claude-design-refs.mjs` for these four screen IDs were unchanged; the captures use the same prototype state-forcing routes documented in `STATE-MAPPING.md`.

**Verification:** Visual gate re-runs PASSED for all four screen IDs against their newly-baselined references; the screens are not yet implemented, so the gate runs against the prototype-state expectation. The state-mapping recipes in `capture-claude-design-refs.mjs` were re-confirmed to produce stable captures across two consecutive runs.

**Reason / spec link:** No story explicitly mandated this carry-forward — the captures happened in the same Task 2.13 sweep as the implementation-screen rebaselines. Round 2 R-010 surfaced the trigger-attribution gap and Round 2 D-B=B resolved it by splitting this entry. Future Epic 2 / Epic 4 stories that implement these screens will produce their own re-baseline entries against the implementation, superseding this prototype-state baseline.

**Re-evaluation trigger:** Mandatory recapture when (1) the upstream Claude Design bundle is refreshed and the prototype state for any of the four screens changes (`scripts/fetch-claude-design.sh` followed by `node nextjs-app/scripts/capture-claude-design-refs.mjs`), (2) the corresponding future story (Epic 2 venue-detail; Epic 4 paywall / payment-failed) implements the screen — at that point the entry is superseded by an implementation-state re-baseline.

### 2026-05-19 — `venue-detail` visual gate wait recipe — Story 2.4 Venue Search, code review Round 1 (Amelia / code-review)

**Trigger:** Story 2.4 visual validation for desktop `venue-detail` captured before the venue-detail overlay had reliably mounted, causing dev-mode race noise in the screenshot comparison instead of measuring the implemented screen state.

**Resolution:** Update the legacy provider script `.claude/scripts/visual-validate.sh` so `venue-detail` waits for `[data-testid="desktop-venue-detail-panel"]` on desktop and `[data-testid="mobile-venue-detail-sheet"]` on mobile before capture, matching the same explicit-state wait style already used by `map-with-selected-venue`.

**Source of new PNG:** None. No reference PNG changed in this operation.

**Recipe change:** `.claude/scripts/visual-validate.sh` adds a `venue-detail)` case to the wait-selector switch. `nextjs-app/scripts/capture-claude-design-refs.mjs` is unchanged.

**Verification:** Story 2.4 review gate later ran with `VISUAL_VALIDATE_PROVIDER=none` and documented manual visual acceptance for downstream/reference-scope differences. This entry records the capture-recipe change only; it is not a reference re-baseline.

**Reason / spec link:** `AGENTS.md` Visual Validation requires any reference PNG or capture-recipe change to update this log in the same operation. Story 2.4 Task 8.11 requires desktop `venue-detail` visual validation as a parent screen for search/list chrome.

**Re-evaluation trigger:** Re-check this wait selector if `VenueDetailOverlay` data-testid values change, if the provider-neutral wrapper stops delegating to `.claude/scripts/visual-validate.sh`, or if the visual gate moves to a provider that uses its own state-wait contract.
