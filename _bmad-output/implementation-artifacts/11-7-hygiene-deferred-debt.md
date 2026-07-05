# Story 11.7: Hygiene — Three-Epics-Deferred Debt Finally Scheduled

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **maintainer**,
I want the repeatedly-deferred build/config debt closed and dead code resolved,
So that every future epic stops paying interest on it.

## Acceptance Criteria

_(Verbatim from `_bmad-output/planning-artifacts/epics.md` §"Story 11.7", lines 2985-2999. Given/When/Then wording, the code spans (`vercel.json`, `.gitattributes`, `git add --renormalize`, `confidence-calculator.ts`, `toSunStatusToken`), and the "maintainer-blessed checkpoint" phrasing are the maintainer's — do not paraphrase.)_

**AC1 — Build fails loudly on lightningcss + `.gitattributes` LF normalization**
**Given** Epic 8's A2 (`vercel.json` build command swallows lightningcss failures) and A3 (missing `.gitattributes` EOL normalization — the direct cause of Epic 10's `confidence-calculator.ts` EOL-churn review round)
**When** they are fixed
**Then** the build fails loudly on a real lightningcss error, and a `.gitattributes` enforcing LF for source files lands with a one-time renormalization commit (`git add --renormalize`) kept separate from any functional change

**AC2 — Orphaned `toSunStatusToken` mapper resolved (no half-state)**
**Given** the orphaned `toSunStatusToken` shared mapper (dead code with a misleading "single source of truth" comment; every surface branches inline)
**When** it is resolved
**Then** either all sun-status surfaces are refactored to consume it, or it is deleted and the comment corrected — no half-state remains

**AC3 — Consolidated reference-PNG rebaseline (maintainer-blessed checkpoint)**
**Given** the consolidated reference-PNG rebaseline (Epic 9's list + Epic 10's obscured-state screens + every surface Epic 11 touches)
**When** Epic 11's visual changes have landed
**Then** the rebaseline set is prepared and presented as a **maintainer-blessed checkpoint** (dev agents remain structurally forbidden from self-blessing references), and the blessed set is committed

### Design Gate Criteria (verbatim, epics.md:2999)

- **Design Gate Criteria (hygiene — no new screen):** No visual change from A2/A3/mapper work (byte-identical UI); the rebaseline checkpoint is itself the visual gate for this story.

> **No standard four (Visual / Behaviour / Animation / Visual validation) Design Gate Criteria for this story.** This is a hygiene story that introduces NO new screen and MUST produce byte-identical UI from the A2/A3/mapper work — so the usual four frontend gate criteria do not apply. Its ONLY visual deliverable is the AC3 consolidated reference-PNG rebaseline, and that rebaseline checkpoint IS the visual gate (maintainer-blessed at PR review; the dev stages + documents but never self-blesses). This is intentional per epics.md:2999.

## Tasks / Subtasks

- [ ] **Task 1 — Fix the `vercel.json` lightningcss error-swallow so the build fails loudly (AC1)**
  - [ ] The swallow is in **`installCommand`, NOT `buildCommand`** (the epic prose says "build command"; the actual code is the install step). Verified in HEAD: `nextjs-app/vercel.json:5` reads `"installCommand": "npm install --include=dev && (cd .. && npm install --no-package-lock lightningcss@1.31.1 2>&1 || true)"`. The trailing `|| true` masks a failed `lightningcss@1.31.1` install (broken native binary → a silently-broken build ships).
  - [ ] Remove the `|| true` swallow so a real lightningcss install failure aborts the deploy. Preserve the rest of the command exactly: the `--include=dev`, the `(cd .. && ...)` root reach, `--no-package-lock`, the pinned `lightningcss@1.31.1`, and the `2>&1` stderr merge are all load-bearing (the root-level lightningcss install is the documented Vercel workaround — do NOT delete the whole second install, only stop hiding its exit code). Keep the two-command `&&` chain so an install failure propagates a non-zero exit.
  - [ ] Sync the mirrored command in `nextjs-app/docs/vercel-deployment.md:154` (it quotes the exact `installCommand` string) so the doc and the config do not drift.
  - [ ] **Cannot be verified by a live Vercel deploy in this run** (that is the orchestrator's/maintainer's PR concern). The proof is static: the `|| true` is gone and the chain still exits non-zero on the second install's failure. Record this in the Debug Log; do NOT attempt a production deploy.

- [ ] **Task 2 — Add `.gitattributes` LF normalization for source files + isolated renormalization (AC1)**
  - [ ] The root `.gitattributes` (HEAD: `C:\Users\Rasmus\sunnyseat\.gitattributes`) currently normalizes ONLY `/.gitattributes` and `*.sh` — there is NO LF rule for source files (`.ts/.tsx/.json/.md/.css/...`), which is why Epic 10's `confidence-calculator.ts` churned CRLF↔LF and cost a review round (also seen at 8.3-R1 and 8.5-R1). `core.autocrlf=true` is set locally, so ~800 tracked files currently show CRLF/mixed in the working tree.
  - [ ] Add `text eol=lf` rules for the repo's **source** extensions. Enumerate the extensions the app actually uses so the diff stays reviewable and predictable — at minimum: `*.ts *.tsx *.js *.jsx *.mjs *.cjs *.json *.jsonc *.css *.scss *.md *.mdx *.yml *.yaml *.sql *.html *.mjs *.geojsonl` and `*.py` (see the extension census in Dev Notes). Also add `*.png -text` / `*.jpg -text` / `*.ico -text` / `*.woff2 -text` / `*.ttf -text` binary guards so the reference PNGs and fonts are never touched.
  - [ ] **CRITICAL — do NOT use a blanket `* text=auto`** and do NOT add `.log` to the source set. The 113 tracked `*.log` files are BMAD review-capture / Playwright console artifacts (`_bmad-output/implementation-artifacts/validation/*.log`, `.playwright-mcp/*.log`), NOT source; sweeping them (or all files) into renormalization bloats the diff into thousands of files and makes it unreviewable (R-016). Scope the `text eol=lf` rules to the source extensions only. If you want logs LF too, that is out of scope for this story — leave them.
  - [ ] Run the one-time renormalization: `git add --renormalize .` (with the new `.gitattributes` in place, git rewrites only the tracked files matching a `text eol=lf` rule). Then verify with `git ls-files --eol` that source files now report `w/lf` and the PNGs/binaries report `-text`/`w/none` (untouched).
  - [ ] **Keep the renormalization SEPARATE from any functional change (R-016 / AC1).** The orchestrator owns git and will split commits, so structure your work so the renormalization is cleanly separable: the `.gitattributes` file edit + the pure line-ending-only renormalized files must be distinguishable from the functional Task-1 (`vercel.json`/docs) and Task-3 (`toSunStatusToken`) changes. Record in the Completion Notes exactly which files are renormalization-only vs functional, so the orchestrator can commit them apart. Do NOT co-mingle a behaviour change into a file that is otherwise pure EOL churn.
  - [ ] **Byte-identical UI guardrail:** a renormalization touches only line endings, never rendered bytes — confirm the four-command gate (typecheck/lint/test) is green after renormalization (a renormalization that changes test output means something other than EOL changed).

- [ ] **Task 3 — Resolve the orphaned `toSunStatusToken` mapper (delete + correct comment; AC2)**
  - [ ] Confirm the orphan state (grep-verified in HEAD): `toSunStatusToken` (`nextjs-app/lib/utils/sun-status-presentation.ts:15-33`) is imported ONLY by its own unit test (`nextjs-app/test/unit/sun-status-presentation.test.ts:5,17-32`). No render surface consumes it — `MapView.tsx`, `VenueCard.tsx`, `VenuePin.tsx`, `VenueQuickInfo.tsx`, `VenueDetailContent.tsx`, `VenueList.tsx`, `forced-venue-detail.ts` each branch inline on `isObscuredSunStatus(...)` / `sunStatus === 'CloudObscured'` and hardcode the token strings (`bg-pin-obscured`, `text-obscured-text`, etc.).
  - [ ] **Choose DELETE (recommended), not wire-in.** The AC allows either, but delete is the lower-risk, in-scope option: wiring the mapper into ~7 surfaces is a cross-surface refactor that would produce visual-touching diffs (violating this story's "byte-identical UI, no visual change from mapper work" Design Gate) and belongs to no owning story. Delete the `toSunStatusToken` export and its doc comment block (`:4-33`). **R-017 binary outcome:** after deletion a grep must prove ZERO references remain anywhere (source, tests, comments) — no half-state.
  - [ ] Remove the `describe('toSunStatusToken', …)` block + the `toSunStatusToken` import line from `test/unit/sun-status-presentation.test.ts` (the only consumer). Keep every OTHER export and test in that file — `windowLabelTier`, `isObscuredSunStatus`, `isSunWindowStatus`, `skyConditionCopy`, `WindowLabelTier`, `SkyConditionCopy` are all live-consumed (do NOT delete the file).
  - [ ] **Correct the misleading comment.** The AC calls out "dead code with a misleading 'single source of truth' comment." `toSunStatusToken`'s own doc comment (claiming "no render surface silently falls through") is deleted with it. But ALSO check `isObscuredSunStatus`'s comment (`:36-39`: "The single branch predicate every render surface uses…") — that IS accurate (surfaces do call `isObscuredSunStatus`), so leave it. The `windowLabelTier` comment ("Every render surface that labels or fills a timeline window MUST route through this helper…") — after Story 11.6 deleted `SunTimeline`/`SunForecastBars`, re-verify `windowLabelTier`/`isSunWindowStatus` still have live consumers before trusting that comment; if the comment now overstates its reach, tighten it (but do NOT remove those exports unless a fresh grep proves them fully orphaned — if so, that is an in-scope dead-export cleanup mirroring the mapper decision, recorded as a deviation).
  - [ ] Run typecheck/lint/test — the `never`-exhaustiveness guard `toSunStatusToken` provided is preserved by the SIBLING `windowLabelTier` (same `switch (status)` over the same `VenueSunStatus` union), so deleting `toSunStatusToken` does not lose the compile-time "new VenueSunStatus member breaks the build" property. Confirm this in the Completion Notes.

- [ ] **Task 4 — Consolidated reference-PNG rebaseline: capture + stage + document (AC3; maintainer blesses at PR)**
  - [ ] **This story OWNS the consolidated rebaseline** (deferred across Epics 9/10/11 to here). The dev agent is STRUCTURALLY FORBIDDEN from self-blessing reference PNGs (`AGENTS.md:177-179`). **This run is UNATTENDED (epic mode)** → scope the task as: (a) CAPTURE the proposed new baselines against the running dev app, (b) STAGE them into `docs/design/references/screens/{mobile,desktop}/`, (c) DOCUMENT each in `docs/design/references/REBASELINE-LOG.md`, and (d) record the maintainer blessing itself as **deferred work for PR review** (NOT a blocker — do not HALT the run for it).
  - [ ] **Capture recipe** (mirror the 2026-07-03 Story-10.2 obscured rebaseline + `capture-offline-rebaseline.mjs` pattern recorded in REBASELINE-LOG): a one-off Playwright capture per `(screen-id, viewport)` pair, driving each route from the `project-context.md` "Screen ID → Route Map" (§lines 280-312), with `deviceScaleFactor: 2`, `locale: 'sv-SE'`, `sunnyseat_onboarded` seeded, `networkidle` + settle. Mobile viewport `390×844`, desktop `1440×900`. **Force `?_time=13:00`** (or the map's canonical `_time` per the route table) on any sun-touching surface (sun is server-computed from wall clock → wall-clock-flaky). Use the existing per-screen `_state=` force-values (the route table is the canonical list). The one-off capture script is a temporary helper — do NOT commit it (matches the 10.2 precedent).
  - [ ] **Screens to (re)capture** = the consolidated set the AC names (Epic 9 list + Epic 10 obscured + every Epic-11-touched surface). Concretely, from the accumulated NEW visual states earlier Epic-11 stories introduced with NO reference PNG (self-blessing was forbidden for each; they all defer here):
    - `map-primary` (mobile + desktop) — 11-1 date-change dim+spinner overlay, 11-2 today-clamped/inert-elapsed slider, 11-5 de-dulled light-warm-tint map + larger animated pulsing location dot + post-recenter framing. (Capture the resting state; the transient overlay/animation are captured as their steady frame.)
    - `map-panel-venues` (mobile) — 11-3 bottom-sheet with active chips / collapsed 4th snap; 11-4 reworked quick-info card surfaced in the list/sheet.
    - `map-with-selected-venue` (mobile) — 11-4 reworked quick-info card (opening-hours replacing Säkerhet/sun-window, clean "VISA RUTT").
    - `venue-detail` (mobile + desktop) — 11-6 clean first paint, "Soltider idag" removed, darkened amber badge, centered "Omdömen" reviews + the empty-reviews state; **the AC3-centered-reviews vs left-aligned-reference-JSX reconciliation** (11-6 Review Findings Defer) — confirm at rebaseline that "centered" is the intended look and treat the current left-aligned `VenueDetail.jsx` reviews preview as the stale side.
    - `venue-detail-obscured` + `map-with-obscured-venue` (mobile + desktop) — Epic 10 obscured-state screens. **These were already rebaselined 2026-07-03 (Story 10.2, maintainer-authorized)** — re-verify they still match after Epic-11's venue-detail/map/quick-info reworks; only re-capture if the obscured chrome drifted (Story 11.6 explicitly left the Story-10.2 obscured treatment untouched, so these may be byte-stable — verify, don't blindly overwrite).
    - `favourites-tab` (mobile + desktop) — Epic-9 list surface (venue cards) if the card rework (11-4) or any Epic-11 change altered it.
    - Cross-check every remaining active row in the Screen ID → Route Map: if a surface Epic 11 did NOT touch, do NOT re-capture it (byte-identical → no rebaseline). Only rebaseline what actually changed; a needless recapture is noise and can mask a real regression.
  - [ ] **For each captured PNG, verify the surface is actually in the expected state BEFORE staging it** (the 2026-07-03 entry's discipline: e.g. obscured screens must show muted slate + "Sol bakom moln", not amber sunny; the de-dulled map must read legibly; the reworked quick-info must show opening-hours not "Säkerhet"). A reference captured from a mis-loaded page poisons the gate silently (deferred-work 7.1: capture scripts can WARN-and-shoot on a wait-timeout — abort on failure, never screenshot a half-loaded page).
  - [ ] **Write one `REBASELINE-LOG.md` entry per screen** in the mandated format (Trigger / Resolution / Source of new PNG / Recipe change / Verification / Reason-spec-link / Re-evaluation-trigger). Mark the Resolution as "implementation-driven baseline prepared for maintainer blessing (dev structurally forbidden from self-blessing; blessing deferred to PR review — epic-mode unattended run)." Cite the owning Epic-11 story for each screen's change.
  - [ ] **Record in Completion Notes:** the list of staged PNGs, which screens were re-captured vs left byte-stable, and the explicit line that the **maintainer blessing is deferred to PR review** (per the delegated-blessing precedent — the maintainer authorized the 10.2 rebaseline at PR; the same authority blesses this consolidated set). Do NOT flip the story to a blocked state for the blessing — staging + documenting IS the deliverable this story produces; the blessing is the maintainer's PR checkpoint (11.8 owns the real-device pass).

- [ ] **Task 5 — Gates + no-visual-change verification (Design Gate)**
  - [ ] Four-command gate from a fresh `.next`: `npm run typecheck` (0 errors), `npm run lint` (0 errors; keep the pre-existing warnings baseline unchanged), `npm test` (all green; the `sun-status-presentation.test.ts` `toSunStatusToken` block removed, the rest untouched), and the axe/e2e project(s) unchanged from HEAD (this story adds NO component/e2e). The renormalization must not change ANY test output (line endings are not rendered).
  - [ ] **Design Gate = "No visual change from A2/A3/mapper work (byte-identical UI)."** Confirm: `vercel.json`/docs, `.gitattributes`/renormalization, and the `toSunStatusToken` deletion touch ZERO rendered output. The ONLY visual artifact this story produces is the Task-4 rebaseline checkpoint itself — which is the maintainer's gate, not a dev-blessed pass.
  - [ ] Confirm no new route, schema, dependency, engine, or weather change; no `@theme` token change; no component render change.

## Dev Notes

### Scope fences (what this story is and is NOT)

**IN scope (three orthogonal hygiene items + the rebaseline):**
- `nextjs-app/vercel.json` — drop the `|| true` lightningcss swallow so the build fails loudly (AC1).
- `nextjs-app/docs/vercel-deployment.md:154` — sync the mirrored `installCommand` string.
- root `C:\Users\Rasmus\sunnyseat\.gitattributes` — add `text eol=lf` for source extensions + binary guards; run `git add --renormalize .` as an isolated change (AC1).
- `nextjs-app/lib/utils/sun-status-presentation.ts` — DELETE the orphaned `toSunStatusToken` export + its comment; correct any misleading "single source of truth" comment (AC2).
- `nextjs-app/test/unit/sun-status-presentation.test.ts` — remove the `toSunStatusToken` import + describe block (only that block).
- `docs/design/references/screens/{mobile,desktop}/*.png` — stage the consolidated rebaseline set (AC3).
- `docs/design/references/REBASELINE-LOG.md` — one entry per rebaselined screen (AC3).

**OUT of scope (do NOT touch — other stories own these, or explicitly deferred elsewhere):**
- Any RENDERED output / component / CSS token / `@theme` change. This is a hygiene story: A2/A3/mapper work is byte-identical UI (Design Gate). If a "fix" would change a pixel, it is not this story.
- The `UserPin` `#d97706` tokenization — **already RESOLVED by Story 11.5** (`--color-amber-location-dot`, DESIGN.md row, source guard). Do NOT re-open it; its new animated-dot visual is only a rebaseline-capture item under AC3.
- The `isPartner`/partner-pin mapper-carry (`mapVenueDtoToPinData` carries `isPartner`, `VenuePin` never reads it) — **Target: Story 5.1**, NOT this story. Do NOT wire it.
- Stale `middleware.ts`-vs-`proxy.ts` comment references (epic-9 defer, Target: None comment-only) — a hygiene item, but it does NOT overlap AC1/AC2/AC3 (build config / mapper / rebaseline). Leave it; the epics.md §11.7 intake list (line 2805) scopes this story to A2/A3 + mapper + rebaseline only. Do NOT reopen unrelated comment debt.
- `windowLabelTier`/`isObscuredSunStatus`/`isSunWindowStatus`/`skyConditionCopy` — LIVE-consumed; keep them. Only `toSunStatusToken` is orphaned.
- Live wall-clock perf, real-touch gesture e2e, request-count CI guards, the physical-device checklist (11.8).
- Do NOT change the sun engine, weather gates, DTO shapes, query keys, or any Epic-11 surface's behaviour — Epic-11 stories 11.1-11.6 are already `review`; this story only rebaselines their landed visuals.
- No live Vercel deploy (orchestrator/maintainer PR concern), no new dependency, no schema/migration.

### Architecture & pattern constraints

- **Byte-identical UI is the hard constraint of A2/A3/mapper.** The Design Gate is explicit: "No visual change from A2/A3/mapper work (byte-identical UI); the rebaseline checkpoint is itself the visual gate." Treat any rendered-output diff from Tasks 1-3 as a defect. [Source: epics.md:2999]
- **Reference-PNG inversion rule (structural):** dev agents are FORBIDDEN from blessing/replacing reference PNGs; a failing visual gate is fixed by fixing the implementation, OR (if the reference depicts out-of-scope UI) by an explicit maintainer accept-with-rationale. Any reference PNG or capture-recipe change MUST update `REBASELINE-LOG.md` in the same operation. In epic mode the maintainer blessing is a PR-review checkpoint — the dev stages + documents, never self-blesses. [Source: `AGENTS.md:177-179`; REBASELINE-LOG.md header; retro-notes epic-11 (11-1/11-4/11-5/11-6): "11-7 owns the consolidated rebaseline"]
- **Renormalization must stay isolated + reviewable (R-016).** `.gitattributes` + `git add --renormalize .` rewrites potentially hundreds of files with LF-only diffs; keep it SEPARATE from the functional `vercel.json`/mapper change so the maintainer can review each in isolation, and scope the `text eol=lf` rules to source extensions (never a blanket `* text=auto`, never `.log`). The orchestrator owns commit-splitting — surface which files are renormalization-only in Completion Notes. [Source: test-design-epic-11 R-016 (line 134), NFR row line 284; deferred-work 8.3-R1/8.5-R1 EOL-churn entries]
- **`toSunStatusToken` binary outcome (R-017).** Delete-and-correct-comment OR wire-into-all-surfaces — no half-state. A grep must prove zero references after resolution. Delete is recommended (wiring is a cross-surface visual-touching refactor that violates this story's byte-identical Design Gate and belongs to no owning story). The `never`-exhaustiveness property survives via the sibling `windowLabelTier`. [Source: test-design-epic-11 R-017 (line 135), component-map line 581, test-plan line 282; `sun-status-presentation.ts:15-33`]
- **Turbopack / .next hygiene:** this story changes NO CSS token, so the Turbopack stale-CSS trap does not apply; but still run the gate from a fresh `.next` when doing the rebaseline capture so the captured surfaces reflect the landed 11.1-11.6 CSS. [Source: retro-notes epic-11 (11-3)]
- **Capture-script safety:** existing rebaseline capture scripts (`capture-*-rebaseline.mjs`) can WARN-and-screenshot on a wait-timeout and default-write straight into `references/` — for THIS one-off capture, ABORT on any wait/selector timeout (never screenshot a half-loaded page) and verify the forced state is actually present in the DOM before staging. [Source: deferred-work 7.1 "Rebaseline capture scripts can silently poison a visual baseline"]

### Source-of-truth facts (verified in HEAD at drafting)

- **`vercel.json` swallow is in `installCommand`, NOT `buildCommand`.** `nextjs-app/vercel.json:5`: `"installCommand": "npm install --include=dev && (cd .. && npm install --no-package-lock lightningcss@1.31.1 2>&1 || true)"`. `buildCommand` is a clean `"npm run build"` (`:2`). The epic prose ("build command swallows lightningcss failures") is imprecise — fix the install step. [Verified 2026-07-05; matches test-design-epic-11 line 55-56, deferred-work 8.5-R1 line 216]
- **Root `.gitattributes` currently:** two lines only — `/.gitattributes text eol=lf` and `*.sh text eol=lf`. No source-file LF rule. `git config core.autocrlf` = `true` locally. `git ls-files --eol` shows ~800 tracked non-worktree, non-binary files as CRLF/mixed. [Verified 2026-07-05]
- **Renormalization extension census** (tracked files with CRLF/mixed, excluding worktrees/binaries, by extension): `.ts` ~166, `.md` ~157, `.tsx` ~129, `.log` ~113 (ARTIFACTS — exclude), `.jsx` ~88, `.yaml` ~29, `.json` ~29, `.yml` ~26, `.html` ~21, `.sql` ~8, `.mjs` ~8, `.ps1` ~5, `.py` ~3, plus singletons (`.css`, `.toml`, `.txt`, `.example`, `.geojsonl`, `.prettierignore`, `.gitignore`, `.cmd`, `.patch`, `.diff`). Scope `text eol=lf` to the genuine SOURCE set; explicitly exclude `.log` and add binary guards for `.png/.jpg/.ico/.woff2/.ttf`. [Verified 2026-07-05]
- **`toSunStatusToken` orphan** (`sun-status-presentation.ts:15-33`): imported ONLY by `test/unit/sun-status-presentation.test.ts:5`. Every render surface (`MapView`, `VenueCard`, `VenuePin`, `VenueQuickInfo`, `VenueDetailContent`, `VenueList`, `forced-venue-detail`) branches inline on `isObscuredSunStatus`/`CloudObscured`. The sibling `windowLabelTier` (`:69-86`) is the same-shape `never`-exhaustive switch and IS consumed → deleting `toSunStatusToken` loses no compile-time guard. [Verified 2026-07-05; matches test-design-epic-11 lines 53-55, deferred-work 10.2 line 40]
- **Reference PNGs:** active set at `docs/design/references/screens/{mobile,desktop}/*.png`; the audit trail is `docs/design/references/REBASELINE-LOG.md`; the route map is `project-context.md` §"Screen ID → Route Map" (lines 276-312). The Epic-10 obscured screens were already rebaselined 2026-07-03 (maintainer-authorized). [Verified 2026-07-05]

### Persistent facts (carried debt + epic constraints folded in)

- **The `vercel.json` swallow is `installCommand`, not `buildCommand`** — fix the install step, keep the root-reach lightningcss install, just remove `|| true`. [retro-notes epic-11 (Phase-2 test-design correction); test-design R-016]
- **`.gitattributes` must scope LF to SOURCE files, NOT a blanket sweep** — the 113 `.log` artifacts + all binaries stay out; a blanket `* text=auto` makes the renormalization diff unreviewable (R-016). Keep the renormalization commit ISOLATED from the vercel.json/mapper functional change. [test-design R-016; deferred-work 8.3-R1/8.5-R1 EOL entries]
- **`toSunStatusToken` = BINARY outcome, no half-state** — delete + correct comment (recommended) or wire everywhere; grep must prove zero references. Delete keeps this story byte-identical (wiring touches ~7 visual surfaces). [test-design R-017; deferred-work 10.2]
- **Dev is STRUCTURALLY FORBIDDEN from self-blessing reference PNGs.** This story CAPTURES + STAGES + DOCUMENTS the consolidated rebaseline (Epic-9 list + Epic-10 obscured + every Epic-11 surface) and defers the BLESSING to the maintainer at PR review — this is NOT a blocker in epic mode; staging + documenting is the deliverable. [AGENTS.md:177-179; retro-notes epic-11 (11-1/11-4/11-5/11-6); test-design line 297 "dev FORBIDDEN from self-blessing refs"; the run instruction: "record the blessing itself as deferred work for PR review, NOT as a blocker"]
- **The accumulated NEW visual states to rebaseline** (each earlier Epic-11 story was forbidden from blessing its own): date-change dim+spinner overlay (11-1), today-clamped/inert-elapsed slider (11-2), sheet-with-active-chips + collapsed 4th snap + desktop chip-strip mid-scroll (11-3), reworked quick-info card (11-4), de-dulled map + animated location dot + post-recenter framing (11-5), reworked venue detail incl. empty-reviews state + the AC3 centered-vs-left-aligned-reference reconciliation (11-6). [run instruction; retro-notes epic-11 (11-6): "Empty-reviews screenshot has no forced-state route — maintainer should capture it during the 11-7 rebaseline"]
- **e2e/capture sun-specs force `?_time=13:00`** — sun is server-computed from wall clock, so any captured surface touching sun state is wall-clock-flaky without the pin. Use the route table's canonical `_time` per screen. [MEMORY: ci-and-e2e-gotchas; retro-notes epic-11]
- **UserPin `#d97706` token gap is CLOSED (Story 11.5).** Do NOT reopen — it was the "epic-9 UserPin token item"; 11.5 Task 2 tokenized it as `--color-amber-location-dot`. Its animated-dot visual is only a rebaseline-capture item (AC3). [Story 11.5 file, Task 2; deferred-work — no open UserPin token entry remains]

### Deferred-work overlap (subject-matched to this story's ACs; folded, NONE reopened out of scope)

Reviewed `_bmad-output/implementation-artifacts/deferred-work.md` end-to-end. This hygiene story is the designated ABSORBER for the entries whose subject overlaps AC1/AC2/AC3 — folded here so the dev either addresses them or knowingly works around them:

- **[ADDRESS — AC1] `vercel.json installCommand` swallows a lightningcss install failure** (8.5-R1, deferred-work line 216; Target: None — pre-existing build-infra debt). This story's Task 1 removes the `|| true`. Also sync `docs/vercel-deployment.md:154`. [deferred-work 8.5-R1]
- **[ADDRESS — AC1] LF↔CRLF churn / confirm `.gitattributes` normalizes line endings** (8.3-R1 line 201 "Whitespace / line-ending churn", 8.5-R1 line 219 "confirm `.gitattributes` normalizes line endings"; Target: None — conditional). Task 2 lands the source-file LF rules + one-time renormalization. The `confidence-calculator.ts` EOL review round the AC names is the exact symptom this closes. [deferred-work 8.3-R1, 8.5-R1]
- **[ADDRESS — AC2] Orphaned `toSunStatusToken` shared mapper** (10.2 defer, deferred-work line 40; Target: None — conditional: "reactivate when a render surface is refactored to route through it OR the dead export is removed"). Task 3 removes the dead export → this satisfies the removal trigger. [deferred-work 10.2]
- **[ADDRESS — AC3] Consolidated reference-PNG rebaseline** — multiple overlapping entries, ALL absorbed here:
  - Story 9.8 (deferred-work line 56): venue-detail refs predate the enabled/mobile-share state + no desktop share-modal ref; Target: None maintainer rebaseline.
  - Epic-9 review (deferred-work line 261): mobile refs for `map-with-selected-venue`/`venue-detail`/`map-primary` (+ 9.8 share-modal, 9.5 dot) deferred to a maintainer rebaseline cascade; Target: maintainer rebaseline.
  - Story 11.6 folded note (its Dev Notes): venue-detail reference-PNG rebaseline not self-satisfiable → 11.7 owns it; AND the 11.6 Review Findings Defer (AC3 "centered per reference" vs left-aligned `VenueDetail.jsx`) → confirm "centered" at THIS rebaseline and treat the reference JSX as the stale side.
  - Epic-10 obscured screens (already rebaselined 2026-07-03) — re-verify, only recapture if drifted.
  Task 4 captures + stages + documents all of these; the blessing is the maintainer's PR checkpoint. [deferred-work 9.8, epic-9 review line 261; Story 11.6 Dev Notes + Review Findings]
- **[NOTE — do NOT reopen] Rebaseline capture scripts can silently poison a baseline** (7.1 defer, deferred-work line 234; Target: None tooling-hardening). Not a task to fix the scripts, but a WARNING the dev must heed when running the one-off Task-4 capture: abort on wait-timeout, verify the forced state in the DOM before staging. [deferred-work 7.1]
- **[NOTE — do NOT reopen / OUT of scope] `mapVenueDtoToPinData` carries `isPartner`, `VenuePin` never reads it** (1.4-R1, deferred-work line 103; Target: Story 5.1). Sounds mapper-adjacent but is a DIFFERENT mapper (venue-DTO→pin, not sun-status) and is owned by Story 5.1 — do NOT wire it here. [deferred-work 1.4-R1]
- **[NOTE — do NOT reopen / OUT of scope] Stale `middleware.ts` naming in comments across ~4 files** (epic-9 review line 251; Target: None comment-only). Comment-only hygiene that does NOT overlap AC1/AC2/AC3; epics.md §11.7 intake (line 2805) does not include it. Leave it. [deferred-work epic-9 review]
- No other deferred entry overlaps build config, the sun-status mapper, or reference PNGs. Entries for slider/sheet/quick-info/detail behaviour, engine/weather/DTO robustness, SW, rate-limit, share-modal a11y, etc. belong to other stories and are NOT in scope.

### Project Structure Notes

- Files touched (all paths absolute or `nextjs-app/`-relative as noted):
  - `nextjs-app/vercel.json` (M — remove `|| true` from `installCommand`).
  - `nextjs-app/docs/vercel-deployment.md` (M — sync the mirrored `installCommand` at `:154`).
  - `C:\Users\Rasmus\sunnyseat\.gitattributes` (M — add source-extension `text eol=lf` + binary `-text` guards; REPO ROOT, not `nextjs-app/`).
  - `nextjs-app/lib/utils/sun-status-presentation.ts` (M — delete `toSunStatusToken` export + its comment block; correct/verify sibling comments).
  - `nextjs-app/test/unit/sun-status-presentation.test.ts` (M — remove the `toSunStatusToken` import + describe block only).
  - `docs/design/references/screens/{mobile,desktop}/*.png` (M/A — staged consolidated rebaseline for Epic-11-touched surfaces).
  - `docs/design/references/REBASELINE-LOG.md` (M — one entry per rebaselined screen).
  - Plus the working-tree effect of `git add --renormalize .` (LF-only rewrites of source files — the ORCHESTRATOR commits these separately from the functional change).
- No new route, schema, dependency, component, engine, or weather change. No `@theme`/DESIGN.md token change. No conflicts with the unified structure.
- **Commit-grouping note for the orchestrator:** three separable change-sets — (1) functional: `vercel.json` + `docs/vercel-deployment.md` + `sun-status-presentation.ts`(+test); (2) EOL: `.gitattributes` + the pure-renormalization churn (must be its own commit per R-016/AC1); (3) rebaseline: the staged PNGs + `REBASELINE-LOG.md` (maintainer blesses at PR).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story-11.7` (lines 2979-2999) — ACs + Design Gate; epics.md:2805 intake blockquote "orphaned `toSunStatusToken` (wire in or remove) and Epic 8's A2 (`vercel.json` lightningcss swallow) + A3 (`.gitattributes` EOL normalization) are absorbed into Story 11.7; the consolidated reference-PNG rebaseline rides the same story as a maintainer-blessed checkpoint"; epics.md:285/288 sequencing "11.7 rebaseline AFTER visual changes land"]
- [Source: `_bmad-output/test-artifacts/test-design/test-design-epic-11.md` — R-016 (renormalization isolated + build-fail-loud, line 134, NFR row 284, component-map 582), R-017 (`toSunStatusToken` binary outcome, line 135, component-map 581, test-plan 282); hygiene-target confirmations lines 53-58; test-plan reference-PNG-rebaseline rows 214/297; source-file confirmations lines 604-614; deferred-out-of-PR note 313]
- [Source: `nextjs-app/vercel.json:5` (`installCommand` with `|| true`), `:2` (`buildCommand`); `nextjs-app/docs/vercel-deployment.md:154` (mirrored command string)]
- [Source: `C:\Users\Rasmus\sunnyseat\.gitattributes` (HEAD: `/.gitattributes text eol=lf` + `*.sh text eol=lf`; no source LF rule); `git config core.autocrlf=true`; `git ls-files --eol` extension census]
- [Source: `nextjs-app/lib/utils/sun-status-presentation.ts:15-33` (`toSunStatusToken` orphan + comment to delete), `:36-39` (`isObscuredSunStatus` accurate comment — keep), `:55-68` (`windowLabelTier` comment — re-verify reach post-11.6), `:69-86` (`windowLabelTier` — the surviving `never`-exhaustive twin)]
- [Source: `nextjs-app/test/unit/sun-status-presentation.test.ts:5,17-32` (only `toSunStatusToken` consumer — remove that import + block, keep the rest)]
- [Source: `docs/design/references/REBASELINE-LOG.md` — mandatory-entry rules, entry format, 2026-07-03 Story-10.2 obscured-rebaseline precedent (maintainer-delegated blessing + capture recipe: `deviceScaleFactor:2`, `locale:sv-SE`, `sunnyseat_onboarded`, `networkidle`+settle, 390×844 / 1440×900)]
- [Source: `project-context.md` §"Screen ID → Route Map" (lines 276-312) — canonical `(screen-id → route + `_state`/`_time` → viewport)` list the rebaseline captures navigate by; §line 110 capture-helper invocation]
- [Source: `AGENTS.md:92-96` (reference-PNG + REBASELINE-LOG locations), `:177-179` (dev forbidden to bless/replace refs; any ref/recipe change updates REBASELINE-LOG same operation)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 8.5-R1 line 216 (vercel install swallow), 8.5-R1 line 219 / 8.3-R1 line 201 (EOL churn / `.gitattributes`), 10.2 line 40 (`toSunStatusToken` orphan), 9.8 line 56 + epic-9 review line 261 (reference-PNG rebaseline cascade), 7.1 line 234 (capture-script poison warning), 1.4-R1 line 103 (`isPartner` mapper — Target 5.1, NOT here), epic-9 review line 251 (`middleware.ts` comment — out of scope)]
- [Source: retro-notes `_bmad-output/auto-bmad/retro-notes/epic-11.md` — epic-11 Phase-2: "`vercel.json` installCommand `|| true`, NOT buildCommand — fix the install step"; 11-1/11-4/11-5/11-6: "11-7 owns the consolidated maintainer rebaseline; dev forbidden to self-bless"; 11-6: "Empty-reviews screenshot has no forced-state route — maintainer captures during the 11-7 rebaseline"]
- [Source: `_bmad-output/implementation-artifacts/11-5-map-legibility-location-dot-recenter.md` Task 2 — UserPin `#d97706` tokenized to `--color-amber-location-dot` (token gap CLOSED, do NOT reopen); `11-6-venue-detail-clean-first-paint-content-polish.md` Review Findings — AC3 centered-vs-left-aligned-reference reconciliation to confirm at THIS rebaseline]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — CI/deploy + visual-gate context; `_bmad-output/planning-artifacts/ux-design-specification.md` — canonical visual intent the rebaselined surfaces must match (AC3); `CLAUDE.md` / `AGENTS.md` — repo rulebook; `nextjs-app/docs/design/DESIGN.md` — canonical tokens (UNCHANGED this story)]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — `claude-opus-4-8[1m]` (auto-bmad dev-story delegate).

### Debug Log References

### Completion Notes List

### File List
