# Stale Reference Audit - 2026-06-09

Scope: audited existing story files in `_bmad-output/implementation-artifacts/`, planned stories in `_bmad-output/planning-artifacts/epics.md`, and the current design/route/reference sources of truth. No sprint status, planning artifact, route map, capture recipe, or visual reference was changed.

Current sources of truth used for this audit:

- `AGENTS.md`
- `project-context.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/future-monetization-season-pass.md`
- `nextjs-app/docs/design/DESIGN.md`
- `nextjs-app/docs/design/references/claude-design/README.md`
- `nextjs-app/docs/design/references/claude-design/STATE-MAPPING.md`
- `nextjs-app/scripts/capture-claude-design-refs.mjs`
- `nextjs-app/docs/design/references/REBASELINE-LOG.md`
- active PNG coverage under `nextjs-app/docs/design/references/screens/{mobile,desktop}/`

## Executive Summary

The highest-risk stale references are in the global planning artifacts, not the latest implemented Epic 3 stories. `prd.md`, `ux-design-specification.md`, `architecture.md`, and the top of `epics.md` still contain Figma-era language, old component-reference paths, old screen IDs, and old file names. A future SM/dev-story drafting pass could copy those into new stories and bypass the current Claude Design MVP split, `STATE-MAPPING.md`, active PNG filenames, and route map.

The strongest future-story blockers are:

- Story 7.3 `map-primary-offline` has a canonical route but no active mobile/desktop PNG yet. It needs first implementation-derived references before review.
- Future Monetization Story 4.5 references `premium-recovery`, but there is no active mobile/desktop `premium-recovery.png`.
- Story 7.1 still says the About page is reached through an `Om` mobile bottom-tab; the current app and route map only expose `Nära mig` and `Favoriter` in mobile bottom nav.
- Planned Story 5.2 and Story 6.4 deferred visual checks use unpinned `venue-detail` visual routes.
- PRD/UX screen inventories still point at old names such as `map-selected-venue`, `venue-list`, `premium-processing`, `feedback-mobile.png`, `review-mobile.png`, `notfound_mobile.png`, and `about_desktop.png`.

## Global Planning Artifacts

### G-001 - PRD still treats Figma as the authoritative live visual source

- Story/source: global planning source used by all future stories
- Affected artifact/section: `_bmad-output/planning-artifacts/prd.md:491-536`
- Stale or risky reference: PRD says all UI screens are designed in Figma, Figma is authoritative, and agents read live design context through Figma MCP. It also lists `nextjs-app/docs/design/references/components/`, which is not an active path.
- Current source of truth: `AGENTS.md`, `project-context.md`, `STATE-MAPPING.md`, and `REBASELINE-LOG.md`. Active MVP validation uses the local Claude Design MVP bundle plus active PNGs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/`. Legacy Figma exports live under `screens/legacy/**` and are historical unless explicitly rebaselined.
- Recommended update: rewrite PRD visual-source language to say active implementation uses the local Claude Design MVP bundle, `STATE-MAPPING.md`, `REBASELINE-LOG.md`, and current screen PNGs. Keep Figma/Stitch only as historical provenance.
- Severity: high
- Reference maintenance likely required: no PNG replacement by itself; no route-map update; no capture-recipe update. Planning doc update required.

### G-002 - PRD screen inventory has stale screen IDs and old filenames

- Story/source: global planning source used by all future screen stories
- Affected artifact/section: `_bmad-output/planning-artifacts/prd.md:502-526`
- Stale or risky reference: old IDs and filenames include `map-selected-venue`, `venue-list`, `premium-processing`, `premium-processing-alt`, `map-with-selected-venue-mobile.png`, `map-panel-venues-mobile.png`, `premium-planner-uppsell.png`, `review-mobile.png`, `feedback-mobile.png`, `notfound_mobile.png`, `about-mobile.png`, `about_desktop.png`, and `notfound_desktop.png`.
- Current source of truth: `project-context.md` Screen ID -> Route Map and active PNG names: `map-with-selected-venue`, `map-panel-venues`, `premium-paywall-processing`, `review.png`, `feedback.png`, `not-found.png`, `about.png`.
- Recommended update: replace PRD screen inventory with canonical Screen IDs and active filenames. Mark Future Monetization assets as archived/future-only and align names to `premium-paywall-processing`.
- Severity: high
- Reference maintenance likely required: no rebaseline if filenames only; route-map update not needed if aligning to `project-context.md`; capture recipe not needed unless the inventory exposes a missing capture.

### G-003 - UX spec references old planning-copy PNG names instead of active refs

- Story/source: global UX source used by future story drafting
- Affected artifact/section: `_bmad-output/planning-artifacts/ux-design-specification.md:998`, `1037`, `1079`, `1113`, `1151`, `1185`, `1217`, `1264`, `1288`, `1303`, `1333`
- Stale or risky reference: the spec points to old names such as `feedback-mobile.png`, `review-mobile.png`, `premium-planner-uppsell.png`, `premium-paywall-mobile.png`, `premium-paywall-processing-mobile.png`, `notfound_mobile.png`, `about-mobile.png`, and `about_desktop.png`.
- Current source of truth: active refs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/`; `STATE-MAPPING.md` documents that `feedback` and `review` are implementation-derived active PNGs because the prototype Tweaks states are obsolete modals.
- Recommended update: convert UX spec references to canonical Screen IDs and active filenames. Add explicit notes that `feedback` and `review` must not use the old prototype modal states.
- Severity: high
- Reference maintenance likely required: no PNG replacement by itself; no route-map update. If the UX text changes visual scope, update `REBASELINE-LOG.md` when references are replaced.

### G-004 - UX spec and epics still describe a three-tab mobile bottom nav

- Story/source: global UX source and planned Story 7.1
- Affected artifact/section: `_bmad-output/planning-artifacts/ux-design-specification.md:689`, `786`, `1304`; `_bmad-output/planning-artifacts/epics.md:180`, `394`, `1979`
- Stale or risky reference: mobile bottom nav is described as `Karta / Favoriter / Om`, and Story 7.1 says the About page is reached through an `Om` tab.
- Current source of truth: `project-context.md:182` says refreshed MVP mobile nav uses `Nära mig` and `Favoriter`, so About is not a bottom-tab entry. Current `nextjs-app/components/custom/layout/MobileNavBar.tsx` defines only `naraMig` and `favoriter`.
- Recommended update: remove `Om` from the mobile bottom-nav contract and Story 7.1 AC. Treat About as `/about` plus whatever current desktop/header/settings entry the active design provides.
- Severity: high
- Reference maintenance likely required: route-map update only if product changes navigation again; rebaseline only if active `about`/nav screenshots change.

### G-005 - Architecture and epics still point at a non-active component reference folder

- Story/source: global architecture/epic source used by SM/dev-story drafting
- Affected artifact/section: `_bmad-output/planning-artifacts/architecture.md:14`; `_bmad-output/planning-artifacts/epics.md:14`; `_bmad-output/planning-artifacts/ux-design-specification.md:26`; `_bmad-output/planning-artifacts/prd.md:536`
- Stale or risky reference: `nextjs-app/docs/design/references/components/` or `_bmad-output/planning-artifacts/design/references/components/` are described as active component image sources.
- Current source of truth: component image exports exist under `nextjs-app/docs/design/references/screens/legacy/components/` and are historical. Active validation is screen-based under `nextjs-app/docs/design/references/screens/{mobile,desktop}/`.
- Recommended update: mark component exports historical/sampling-only and require active screen refs plus `DESIGN.md` tokens for implementation.
- Severity: medium
- Reference maintenance likely required: no rebaseline unless component images are promoted into active screen refs.

### G-006 - Claude Design README is generic and can mislead agents

- Story/source: design handoff entry point
- Affected artifact/section: `nextjs-app/docs/design/references/claude-design/README.md`
- Stale or risky reference: README says to find the primary design file under `sunnyseat/project/`, follow imports, and implement pixel-perfectly. It does not mention SunnySeat's MVP/Post-MVP split, skipped `feedback`/`review` prototype states, `STATE-MAPPING.md`, or Future Monetization quarantine.
- Current source of truth: `STATE-MAPPING.md`, `REBASELINE-LOG.md`, `project-context.md`, and `capture-claude-design-refs.mjs`.
- Recommended update: prepend a SunnySeat-specific note that agents must read `STATE-MAPPING.md` first, use only MVP Mobile/Desktop Unlocked for MVP gates, and never use Post-MVP or Tweaks modal states for MVP feedback/review.
- Severity: medium
- Reference maintenance likely required: no rebaseline; documentation update only.

### G-007 - Active PNG coverage has known gaps for planned future references

- Story/source: planned Story 7.3 and Future Monetization Story 4.5
- Affected artifact/section: active refs under `nextjs-app/docs/design/references/screens/{mobile,desktop}/`; `project-context.md:184-189`; `STATE-MAPPING.md:78-79`
- Stale or risky reference: `map-primary-offline` and `premium-recovery` are canonical route-map IDs, but there is no active `map-primary-offline.png` or `premium-recovery.png` in either active mobile or desktop screen folder.
- Current source of truth: `STATE-MAPPING.md` already says `map-primary-offline` needs its first implementation-driven reference; `premium-recovery` is Future Monetization only and should retain existing/future references as archived assets.
- Recommended update: add explicit story tasks to create or rebaseline missing refs before those stories can pass visual review.
- Severity: blocker for Story 7.3; high for Future Monetization Story 4.5 reactivation
- Reference maintenance likely required: yes, `REBASELINE-LOG.md` entry and visual reference addition/replacement. Capture recipe/wait selector updates likely for `map-primary-offline`; likely route-map unchanged.

## Epic 1

### E1-001 - Story 1.3 contains historical PremiumProvider instructions that can be copied back into MVP runtime

- Story/source: Story 1.3 Responsive Layout Shell & Navigation
- Affected artifact/section: `_bmad-output/implementation-artifacts/1-3-responsive-layout-shell-navigation.md:37`, `57`, `81-87`, `220-222`, `259`, `371-397`, `610`, `688`
- Stale or risky reference: story text still contains provider order and code snippets with `PremiumProvider`, `PremiumContext`, and `usePremiumStatus`. Some lines have MVP-scope-correction notes, but the snippets are copyable and conflict with the current no-premium MVP runtime.
- Current source of truth: `AGENTS.md` Future Monetization Code rule; `future-monetization-season-pass.md`; later Story 2.5 notes that commit `aecd6af` removed `PremiumContext`, `queryKeys.premium`, premium messages, and payment types from active runtime.
- Recommended update: add a stronger historical-only banner to Story 1.3 and any future provider-tree references: do not restore `PremiumContext` or `PremiumProvider` for MVP work. Future reactivation must happen only through a Future Monetization story.
- Severity: medium
- Reference maintenance likely required: no rebaseline; no route/capture update.

### E1-002 - Story 1.3 nav visual refs point at an obsolete component path

- Story/source: Story 1.3 Responsive Layout Shell & Navigation
- Affected artifact/section: `_bmad-output/implementation-artifacts/1-3-responsive-layout-shell-navigation.md:64`, `629-630`
- Stale or risky reference: component visual refs are named as `nextjs-app/docs/design/references/components/navbar-footer-mobile.png` and `header-navbar-component-desktop.png`; that active folder does not exist.
- Current source of truth: `nextjs-app/docs/design/references/screens/legacy/components/` for historical component exports; active validation is screen-level under `screens/{mobile,desktop}` plus `DESIGN.md`.
- Recommended update: annotate these as historical component samples only. Future nav work should use active screen references and current route-map/screens, not this old component path.
- Severity: medium
- Reference maintenance likely required: no rebaseline unless nav refs are replaced.

### E1-003 - Story 1.5 desktop onboarding prototype drift remains a historical trap

- Story/source: Story 1.5 Onboarding & Geolocation
- Affected artifact/section: `_bmad-output/implementation-artifacts/1-5-onboarding-geolocation.md:89`
- Stale or risky reference: the story documents that desktop onboarding prototype showed a three-step flow while the UX spec required mobile-identical single-screen behavior.
- Current source of truth: `REBASELINE-LOG.md` onboarding entries; active `desktop/onboarding.png` is curated/implementation-derived until a designer supplies a newer desktop reference.
- Recommended update: no functional update required, but future onboarding stories should explicitly cite the rebaseline log instead of the old prototype behavior.
- Severity: low
- Reference maintenance likely required: no, unless onboarding design changes.

## Epic 2

### E2-001 - Stories 2.1-2.4 and related prompts contain unpinned visual routes

- Story/source: Stories 2.1, 2.2, 2.3, 2.4 and review prompt copies
- Affected artifact/section: `_bmad-output/implementation-artifacts/2-1-venue-quick-info-card.md:195`; `2-2-venue-list-bottom-sheet.md:88`, `112-113`, `217`, `242-244`; `2-3-venue-detail-view.md:101`, `123`, `129-130`, `248`; `2-4-venue-search.md:87`, `111-113`, `247`; copied prompt files contain the same older routes.
- Stale or risky reference: visual commands omit deterministic `_time` values, for example `/?_state=map-panel-venues`, `/?venue=test-venue-sunny&_state=map-with-selected-venue`, and `/?venue=test-venue-sunny&_state=venue-detail`.
- Current source of truth: `project-context.md` route map pins current routes: `map-panel-venues` and `map-with-selected-venue` use `_time=14:00`; mobile `venue-detail` uses `_time=14:00`; desktop `venue-detail` uses `_time=16:30`.
- Recommended update: add a historical-route note to completed stories or update the commands where safe. Future stories must copy routes from `project-context.md`, not from early Epic 2 story text.
- Severity: medium
- Reference maintenance likely required: no rebaseline; route-map already current.

### E2-002 - Story 2.5 retains a stale bare mobile map-primary visual command

- Story/source: Story 2.5 Free Time/Date Planner
- Affected artifact/section: `_bmad-output/implementation-artifacts/2-5-free-time-date-planner.md:152`, `363`, `418`
- Stale or risky reference: Task 8.9 records mobile `map-primary` as `/?_time=14:00`; later notes document that bare `?_time=14:00` leaked reference-only normalization into normal runtime and was fixed.
- Current source of truth: `project-context.md` maps mobile `map-primary` to `/?_state=map-primary&_time=14:00`; `REBASELINE-LOG.md:289-299` explains the route-state correction.
- Recommended update: annotate the old command as superseded. Do not use bare `/?_time=14:00` for visual-reference normalization.
- Severity: low
- Reference maintenance likely required: no; route-map and rebaseline log already corrected.

### E2-003 - Story 2.6 contains resolved old-route and old-drift notes that should not be reused

- Story/source: Story 2.6 Confidence Display & Auto Refresh
- Affected artifact/section: `_bmad-output/implementation-artifacts/2-6-confidence-display-auto-refresh.md:150`, `306`, `327`
- Stale or risky reference: review notes mention older `map-primary` route disagreement and a failed bare `/?_time=14:00` validation before the final route correction.
- Current source of truth: Story 2.6 completion lines now show current route-map commands; `project-context.md` and `REBASELINE-LOG.md` are authoritative.
- Recommended update: no urgent edit, but future stories should ignore early diagnostic commands and use the final current route map.
- Severity: low
- Reference maintenance likely required: no.

### E2-004 - Early accepted-drift notes still mention old lock badges/paywall chrome

- Story/source: Stories 2.2-2.7 deferred visual drift notes
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:904`, `1019`; `_bmad-output/implementation-artifacts/2-2-venue-list-bottom-sheet.md:244`; `visual-source-refresh-audit-2026-05-21.md`
- Stale or risky reference: older visual drift notes mention locked favourites, old paywall chrome, and lock-badge expectations.
- Current source of truth: MVP scope correction in `AGENTS.md`, `future-monetization-season-pass.md`, and `visual-source-refresh-audit-2026-05-21.md` says planner/date/favourites are free MVP and Season Pass/Swish/paywalls/lock badges are Post-MVP only.
- Recommended update: keep the explicit "obsolete for MVP" notes in deferred artifacts. If a future story copies older drift notes, it must retain the MVP-scope-correction clause and never implement lock/paywall chrome for MVP.
- Severity: medium
- Reference maintenance likely required: no; only if old lock chrome remains in an active PNG would a rebaseline be required.

## Epic 3

### E3-001 - Planned Story 3.2 deferred venue-tag notes may copy stale prototype tags

- Story/source: planned Story 3.2 source in `epics.md` and already-created Story 3.2 context
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1363-1364`
- Stale or risky reference: deferred notes name amenity/tag chips `Innergård`, `Hund ok`, `Wifi`, and `Bakverk` from accepted drift and suggest implementing them if they remain in the accepted design.
- Current source of truth: current Story 3.2 was sun accuracy/outdoor seating feedback only and explicitly excluded venue-attribute expansion, admin/candidate queues, geodata imports, and confidence recalibration. Active route/visual refs should not force stale prototype tags into Story 3.2.
- Recommended update: move tag-chip decisions to a dedicated venue-attribute story or explicitly mark them "not Story 3.2 scope". If tags are rejected from MVP, rebaseline/retarget affected `venue-detail` refs with rationale.
- Severity: medium
- Reference maintenance likely required: likely yes if active `venue-detail` references still expect tags and product rejects them; update `REBASELINE-LOG.md`.

### E3-002 - Story 3.2 feedback rebaseline log has a route mismatch

- Story/source: Story 3.2 Sun Accuracy Feedback
- Affected artifact/section: `nextjs-app/docs/design/references/REBASELINE-LOG.md:64-70`; `project-context.md` feedback route
- Stale or risky reference: `REBASELINE-LOG.md` says the new `feedback.png` came from `/?venue=test-venue-sunny&_state=feedback&_time=14:00`, while `project-context.md` and `STATE-MAPPING.md` define active feedback as `/?venue=test-venue-sunny&_state=feedback`.
- Current source of truth: `project-context.md` route map and `STATE-MAPPING.md:67`.
- Recommended update: add a clarification note to `REBASELINE-LOG.md` or decide to time-pin feedback in the route map. Do not leave future stories guessing which route is canonical.
- Severity: low
- Reference maintenance likely required: `REBASELINE-LOG.md` edit if clarified; route-map update only if choosing to pin feedback time; no PNG replacement unless recaptured.

### E3-003 - Story 3.3 is corrected, but planned Story 3.4 should explicitly inherit the correction

- Story/source: Story 3.3 Venue Reviews and planned Story 3.4
- Affected artifact/section: `_bmad-output/implementation-artifacts/3-3-venue-reviews.md`; `_bmad-output/planning-artifacts/epics.md:1423+`
- Stale or risky reference: old prototype `ReviewModal` with required rating, tags, and `Publicera` copy is now obsolete, but planned Story 3.4 currently only names the `review` visual gate and may rely on generic active-ref wording.
- Current source of truth: Story 3.3 source-conflict note, `STATE-MAPPING.md:68`, `capture-claude-design-refs.mjs:143-150`, `REBASELINE-LOG.md:46-60`. Active `review` is implementation-derived inline ReviewForm with optional rating and `Skicka`.
- Recommended update: add a Story 3.4 note that `feedback` and `review` use implementation-derived active PNGs and must not use prototype Tweaks modal states.
- Severity: medium
- Reference maintenance likely required: no current rebaseline; only if Story 3.4 changes the inline form visuals or routes.

### E3-004 - Planned Story 3.3/3.4 rating and metadata drift notes need product decisions before implementation

- Story/source: planned Story 3.3/3.4 carry-forward notes
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1419-1421`
- Stale or risky reference: deferred notes say to decide whether aggregate star ratings, review counts, and price metadata surface in venue-list cards and venue-detail headers, otherwise rebaseline. These may come from older accepted visual drift rather than current MVP AC.
- Current source of truth: current Story 3.3 implements reviews/review cards and has no premium/admin/moderation scope. Active MVP UX should decide whether aggregate rating metadata belongs in MVP surfaces.
- Recommended update: before drafting future hardening or review-aggregate work, make the source-of-truth decision explicit: implement metadata if it is current MVP scope, otherwise rebaseline/retarget affected parent refs.
- Severity: medium
- Reference maintenance likely required: likely yes if metadata is removed from active refs; update `REBASELINE-LOG.md`.

## Epic 4 - Future Monetization

### E4-001 - `premium-recovery` is referenced but has no active visual PNG

- Story/source: planned Story 4.5 Premium Recovery
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1707-1708`; `project-context.md:184-185`; active PNG folders
- Stale or risky reference: Story 4.5 says visual must match Post-MVP reference `premium-recovery`, and route map has mobile/desktop `/?_state=premium-recovery`, but there is no active `premium-recovery.png` in mobile or desktop refs.
- Current source of truth: `STATE-MAPPING.md:79` says premium/recovery flows are Post-MVP only and archived future assets must not be used for MVP gates.
- Recommended update: before Future Monetization reactivation, add or restore `premium-recovery` references or change Story 4.5 to require first rebaseline/capture. Keep it quarantined from MVP runtime.
- Severity: high for Story 4.5 reactivation; not an MVP blocker
- Reference maintenance likely required: yes, visual reference addition/replacement and `REBASELINE-LOG.md`; capture recipe likely if automated; route-map likely unchanged.

### E4-002 - Future premium UX filenames are stale and should not drive MVP work

- Story/source: planned Epic 4 stories and UX spec future sections
- Affected artifact/section: `_bmad-output/planning-artifacts/ux-design-specification.md:1079-1245`; `_bmad-output/planning-artifacts/prd.md:506-508`, `522-524`
- Stale or risky reference: old future asset names include `premium-planner-uppsell.png`, `premium-paywall-mobile.png`, `premium-paywall-processing-mobile.png`, `premium-paywall-desktop.png`, and `premium-processing-alt`.
- Current source of truth: `future-monetization-season-pass.md`; `STATE-MAPPING.md`; active future refs include `premium-upsell.png` mobile, `premium-paywall.png`, `premium-paywall-processing.png`, and `payment-failed.png`, with no active `premium-recovery`.
- Recommended update: align Future Monetization story references to active/future archived filenames and explicitly label all Epic 4 visuals as Post-MVP only.
- Severity: medium
- Reference maintenance likely required: no MVP rebaseline. Future reactivation may need reference additions and `REBASELINE-LOG.md`.

## Epic 5

### E5-001 - Story 5.2 partner badge visual checks use unpinned venue-detail routes

- Story/source: planned Story 5.2 "SOL NU" Badge & Partner Deep-Links
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1792-1793`
- Stale or risky reference: deferred verification commands use `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile` and desktop without `_time`.
- Current source of truth: `project-context.md` pins `venue-detail` mobile to `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00` and desktop to `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30`.
- Recommended update: replace deferred commands with canonical route-map URLs. If `SOL NU` appears only for a partner fixture, add a forced-state fixture or explicitly rebaseline if the seeded `test-venue-sunny` should not show it.
- Severity: medium
- Reference maintenance likely required: route commands update; possible rebaseline if badge expectations differ; no route-map change unless new forced partner state is added.

### E5-002 - Partner/admin analytics stories are outside MVP and should not bleed into current story drafts

- Story/source: planned Epic 5 partner stories
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1756+`
- Stale or risky reference: partner deep-links, partner sunny-now API, and partner analytics are later-scope features. They are not part of current MVP visit-loop hardening and should not cause admin, partner dashboard, or moderation surfaces to reappear in MVP stories.
- Current source of truth: `AGENTS.md` Future Monetization/Admin scope rules and current Epic 3 story scope boundaries, which exclude admin, moderation, partner features, payment, and premium runtime.
- Recommended update: keep partner APIs and analytics isolated to Epic 5 story drafts. Do not include them in Story 3.4 hardening or MVP UI acceptance criteria.
- Severity: low
- Reference maintenance likely required: no.

## Epic 6

### E6-001 - Story 6.4 share visual check uses an unpinned venue-detail route

- Story/source: planned Story 6.4 Share Venue Sun Status
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1965`
- Stale or risky reference: deferred verification command uses `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile`.
- Current source of truth: `project-context.md` pins mobile `venue-detail` to `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00`.
- Recommended update: update the planned Story 6.4 deferred visual command to the canonical route. If share/action chrome is outside screenshot scope, require rebaseline/retarget rationale.
- Severity: medium
- Reference maintenance likely required: route command update; possible rebaseline if share chrome is rejected from the active detail screenshot.

## Epic 7

### E7-001 - Story 7.1 About Page has obsolete mobile `Om` tab navigation

- Story/source: planned Story 7.1 About Page
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:1979`; `_bmad-output/planning-artifacts/ux-design-specification.md:1304`
- Stale or risky reference: AC says users navigate to About via `"Om" tab on mobile or /about route`.
- Current source of truth: `project-context.md:182` and current `MobileNavBar.tsx` show only `Nära mig` and `Favoriter` tabs; About is a standalone `/about` route.
- Recommended update: change AC to `/about` and current approved entrypoint, not a mobile bottom-nav tab. If product wants About back in mobile nav, update route map, active nav implementation, and active refs together.
- Severity: high
- Reference maintenance likely required: route-map update only if About is intentionally added to mobile nav; rebaseline likely if nav changes.

### E7-002 - Story 7.2 404 planning filenames are stale even though story ID is current

- Story/source: planned Story 7.2 404 Page
- Affected artifact/section: `_bmad-output/planning-artifacts/ux-design-specification.md:1264`, `1288`; `_bmad-output/planning-artifacts/prd.md:513`, `526`
- Stale or risky reference: old filenames `notfound_mobile.png` and `notfound_desktop.png`.
- Current source of truth: active refs are `mobile/not-found.png` and `desktop/not-found.png`; route is `/__sunnyseat-invalid`.
- Recommended update: update UX/PRD filenames and keep Story 7.2 aligned to active `not-found`.
- Severity: medium
- Reference maintenance likely required: no rebaseline unless 404 design changes.

### E7-003 - Story 7.3 Offline Shell lacks active visual references and likely wait selectors

- Story/source: planned Story 7.3 PWA Installation & Offline Shell
- Affected artifact/section: `_bmad-output/planning-artifacts/epics.md:2113-2119`; `project-context.md:188-189`; `STATE-MAPPING.md:78`
- Stale or risky reference: story says visual validation can use `map-primary-offline` and should match active visual reference, but active refs do not include `map-primary-offline.png`.
- Current source of truth: `STATE-MAPPING.md` says offline shell has no Claude Design state and the first implementation-derived reference belongs to the offline story.
- Recommended update: draft Story 7.3 with explicit tasks to implement forced offline state, capture first mobile/desktop implementation-derived references, update `REBASELINE-LOG.md`, and add/update visual wait selectors such as an offline banner test id before review.
- Severity: blocker for Story 7.3 review
- Reference maintenance likely required: yes, add visual refs and `REBASELINE-LOG.md`; likely capture recipe/wait selector update; route-map likely unchanged.

## Cross-Cutting Recommendations

1. Update global planning visual-source language before drafting more stories. This is the highest leverage correction because future story files inherit from PRD/UX/epics text.
2. Add a short "use active route map only" note to any future story template or SM drafting checklist. Early Epic 2 story files and epics deferred notes still contain unpinned routes.
3. Treat `STATE-MAPPING.md` as mandatory pre-read for frontend stories with visual gates. It is where the MVP/Post-MVP split and skipped prototype states are actually clear.
4. For future reference changes, require the full bundle: PNG change, `REBASELINE-LOG.md`, `STATE-MAPPING.md` if state provenance changes, capture recipe if automated, and visual wait selector if the screen needs a specific readiness marker.
5. Keep MVP monetization quarantine scans in every MVP story that touches planner/date/favourites, feedback/reviews, navigation, or venue detail. The stale `PremiumProvider` and premium asset references are mostly historical, but still easy to copy.

