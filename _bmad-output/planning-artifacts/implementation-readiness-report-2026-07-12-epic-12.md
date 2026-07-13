---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
assessmentMode: delta
assessmentScope: Epic 12
assessmentStatus: ready-for-story-drafting
documentsIncluded:
  prd: prd.md
  architecture: architecture.md
  epics: epics.md
  ux: ux-design-specification.md
---

# Implementation Readiness Assessment Report — Epic 12 Delta

**Date:** 2026-07-12 · Product-policy amendment: 2026-07-13
**Project:** SunnySeat

## Document Discovery

The delegated assessment brief selects the following canonical whole documents for the Epic 12 delta assessment. No competing sharded forms were found.

| Type | Canonical document | Size | Modified |
|---|---|---:|---|
| PRD | `prd.md` | 58,165 bytes | 2026-07-13 16:25 |
| Architecture | `architecture.md` | 124,587 bytes | 2026-07-13 16:42 |
| Epics and stories | `epics.md` | 353,599 bytes | 2026-07-12 14:24 |
| UX design | `ux-design-specification.md` | 97,980 bytes | 2026-07-13 16:27 |

Additional governing delta evidence named in the brief: the approved 2026-07-12 sprint change proposal, completed Epic 12 provider-policy technical research, updated `project-context.md`, Epic 12 test design, and the active MVP QA pointer.

**Discovery result:** complete; no whole-versus-sharded duplicate conflict and no required document missing.

### Canonical Evidence Links

- [Approved 2026-07-12 sprint change proposal](sprint-change-proposal-2026-07-12.md)
- [PRD v3.2](prd.md)
- [Revised UX design specification](ux-design-specification.md)
- [Architecture with Epic 12 decision spine](architecture.md)
- [Epic and retained story prose](epics.md)
- [Provider-policy technical research](research/technical-google-places-api-policy-epic-12-research-2026-07-12.md)
- [Epic 12 test-design delta](../qa/epic-12-test-design-2026-07-12.md)
- [Active MVP QA scope pointer](../qa/mvp-test-design-scope-correction-2026-05-19.md)
- [Updated project context](../../project-context.md)

## PRD Analysis

### Functional Requirements

The revised PRD v3.2 contains 51 numbered FR entries (FR1–FR50 plus FR12a), including explicitly retained/retired entries, and six Epic 12 launch-readiness requirements (LR1–LR6).

- **FR1:** Users can view venues with outdoor seating on an interactive map, distinguished by the selected-instant public sun state (sunny vs. not sunny) without relying on colour alone.
- **FR2:** Users can view a list of nearby venues ranked by sun exposure relevance, showing venue name, selected-instant sun information, distance, and availability; the list does not show a user-facing or screen-reader confidence number.
- **FR3:** Users can search by name or area; an exact by-name match closed at the selected instant remains labelled and openable, while area/ranked discovery follows availability eligibility.
- **FR4:** Users can see their current location on the map and discover venues relative to their position.
- **FR5:** Users can view venue locations and quickly compare multiple nearby sunny venues to find alternatives.
- **FR6:** The system requests geolocation permission on first visit and offers a default location fallback (Gothenburg centrum) if denied.
- **FR7:** Users can view the selected-instant sun state and, where the venue is sunny, the percentage of its seating in direct sun. Internal model confidence is not displayed visually or to screen readers.
- **FR8:** Users can view a sun timeline for a venue showing when sun exposure starts, peaks, and ends for today.
- **FR9:** Users can scrub through time to see how venue sun states change throughout the current day.
- **FR10:** Users can select a future date and simulate sun exposure states for all venues on that date.
- **FR11:** Users can scrub through time on a selected future date to see predicted sun states.
- **FR12:** The system computes confidence internally for diagnostics, coverage assessment, uncertainty reasons, and maintainer prioritization. The public UI communicates weather obstruction and prediction uncertainty without a confidence percentage; missing weather remains unknown and is never fabricated as clear.
- **FR12a:** The system supports optional per-venue seating-surface elevation so elevated seating is predicted from seating-surface height rather than ground level; absent elevation retains ground-level behavior.
- **FR13:** The system auto-refreshes venue sun states periodically while the app is active, without requiring manual reload.
- **FR14:** Users can view detailed venue information including photos, description, opening hours, and address.
- **FR15:** Users can navigate to a venue using in-app routing with estimated walk/bike time.
- **FR16:** Users can open a venue's location in their device's native map application.
- **FR17:** Users can submit accuracy feedback on whether a venue's sun prediction was correct when they arrived.
- **FR18:** Users can confirm that a venue has outdoor seating, contributing to the verified venue database.
- **FR19:** Users can read reviews written by other users about a venue's outdoor seating experience.
- **FR20:** Users can write and submit a review for a venue they have visited.
- **FR21:** Future users can view a soft upsell prompt if a future paid feature boundary is introduced.
- **FR22:** Future users can purchase a Season Pass via Swish for a one-time fee.
- **FR23:** Future monetization supports mobile Swish deep-link and desktop QR payment.
- **FR24:** Future monetization confirms payment and activates paid access within seconds.
- **FR25:** Future users can recover paid status without an account.
- **FR26:** Future monetization handles payment failures with clear retryable errors.
- **FR27:** Partner venues are visually distinguished with Golden Pin styling.
- **FR28:** Partner venues display “Sunny Now” only when more than 50% is sunlit at the selected instant and the venue is not weather-gated.
- **FR29:** Partner venues can be deep-linked from external sources.
- **FR30:** Partners can view analytics segmented by sun state.
- **FR31:** Users can save venues to favourites; a saved closed venue remains visible with an accessible greyed treatment, `Stängt vid vald tid`, and enabled detail navigation.
- **FR32:** Users can view recently viewed venues.
- **FR33:** Users can receive push notifications when a favourite changes to sunny.
- **FR34:** Users can opt in or out of push notifications.
- **FR35:** Users can share a venue's sun status through native share.
- **FR36:** Retired; new venue ingestion occurs through direct database maintenance.
- **FR37:** Users can verify or flag outdoor seating for existing venues.
- **FR38:** Retired; there is no venue candidate approval queue.
- **FR39–FR45:** Retired; no product-scope admin authentication, venue CRUD/configuration, geometry editor, building upload, accuracy dashboard, candidate review, or precomputation controls.
- **FR46:** First visit presents branded onboarding and location access.
- **FR47:** Users can view an About page covering operation, sources, and accuracy statistics.
- **FR48:** Invalid routes show a friendly 404 with navigation to the map.
- **FR49:** The app is installable as a PWA on supported mobile browsers.
- **FR50:** Offline mode keeps the app shell functional and shows a no-connection message.

Epic 12-specific launch requirements:

- **LR1 — Availability truth:** Map pins, ranked discovery, and availability counts hide venues explicitly closed at the selected Stockholm instant. Exact by-name matches remain labelled/openable and saved closed favourites remain greyed, labelled, and inspectable; unknown hours remain visible and past-midnight sessions use the previous weekday where appropriate.
- **LR2 — Pin truth:** Amber means `>50%` sunlit and not weather-gated; grey means not sunny with no percentage; icon, label, and accessible-name distinctions cannot rely on colour alone.
- **LR3 — Guided first use:** A skippable, accessible, responsive coach-mark guide describes controls actually mounted in the current layout and can be reopened from Settings.
- **LR4 — Live venue identity:** Reviews and feedback resolve live venues by ID or slug and consistently reject hidden or unknown venues.
- **LR5 — Venue media:** Photos use stable hosted renditions selected deterministically by surface, with graceful absent/unavailable fallback.
- **LR6 — Maintainer operations:** Any localhost/dev-only venue editor is maintenance-only, behind an unconditional production deny, and does not restore a production admin surface.

### Non-Functional Requirements

The PRD contains 39 numbered NFR entries:

- **NFR1:** Warm/edge-hit venue search and sun endpoints are `<200ms p95`; fully cold real-scale central viewport is approximately `<=5s p95` using persisted ungated geometry plus read-time weather gating.
- **NFR2:** Mobile 4G LCP `<=4.5s`, measured through the documented Lighthouse CI threshold.
- **NFR3:** INP `<=200ms`.
- **NFR4:** CLS `<=0.1`.
- **NFR5:** Map pan/zoom at 60fps on stated mid-range devices.
- **NFR6:** Fifty venue pins render within 100ms.
- **NFR7:** App shell renders within 2s on 4G; warm map/data within 4s; fully cold venue path may use NFR1's approximately 5s bound.
- **NFR8:** Initial JS `<=280KB` gzipped excluding MapLibre; MapLibre chunk `<=320KB`; total `<=600KB`; MapLibre loads asynchronously.
- **NFR9:** Sun states auto-refresh every five minutes while active.
- **NFR10:** No PII stored; no accounts, emails, or names.
- **NFR11:** IPs are SHA-256 + salt hashed before storage.
- **NFR12:** Public APIs are limited to 100 requests/min/IP unless a stricter route limit is documented.
- **NFR13:** Retired with admin; any future paid-status tokens remain future scope.
- **NFR14:** HTTPS only; no mixed content.
- **NFR15:** Future Swish data follows its security terms and stores no bank/card details.
- **NFR16:** GDPR compliance with no consent-requiring cookies beyond session; privacy policy accessible from About.
- **NFR17:** Future paid-status recovery cannot expose another user's purchase.
- **NFR18:** Support `<=10,000 MAU` within `$100/month`.
- **NFR19:** Handle 5x sunny-day concurrency without degraded response times using Vercel scaling and Supabase pooling.
- **NFR20:** Persist ungated geometry for every venue/date in the selectable window and continuously roll complete coverage across Stockholm midnight.
- **NFR21:** Map tiles are served by an external CDN.
- **NFR22:** WCAG 2.1 AA on all customer-facing screens.
- **NFR23:** All interactive elements are keyboard accessible with visible focus.
- **NFR24:** Screen-reader support for venue list/detail/map controls.
- **NFR25:** AA colour contrast minimums.
- **NFR26:** Reduced-motion preference disables/simplifies non-essential motion.
- **NFR27:** Map pins are not differentiated by colour alone.
- **NFR28:** Met.no attribution is present; unavailable weather remains explicitly unknown and never fabricated as clear.
- **NFR29:** Future Swish supports test mode and idempotent webhooks.
- **NFR30:** MapLibre tile source covers Gothenburg zoom 10–18 and tile failures show a fallback surface.
- **NFR31:** Push permission revocation is handled and failed deliveries do not retry indefinitely.
- **NFR32:** OSM stays a non-writing hours pilot until coverage, compatibility, attribution, classification, and ODbL gates are approved; it uses an appropriate bulk source and never public Nominatim for scheduled work.
- **NFR33:** 99.5% monthly uptime excluding properly announced maintenance.
- **NFR34:** Missing/stale weather affects accessible uncertainty state, never a visible confidence number, and is never fabricated as clear.
- **NFR35:** Persisted geometry is date-specific; missing venue/date coverage is observable; weather gates at read time; scheduled reporting covers the complete selectable window and midnight rollover.
- **NFR36:** Future Swish polling times out after five minutes with a retryable not-confirmed message.
- **NFR37:** Service worker caches the shell and invalidates on deployment.
- **NFR38:** Canonical hours use permitted evidence with provenance/review timestamps; weekly automation reports review states and never silently/partially overwrites; no Google hours calls are allowed and only Place IDs may be retained.
- **NFR39:** Supported cold map/detail flows emit no app-origin React errors or MapLibre warnings; third-party allow-lists must be explicit, narrow, and attribution-compliant.

### Additional Requirements and Constraints

- Forty-two live venues are current evidence; 50 verified venues remains the launch target.
- The single-interval-per-ISO-weekday hours model is the launch default. Unsupported split, 24/7, seasonal, or holiday schedules require whole-venue manual review rather than flattening or guessing.
- Weekly hours work is a provenance/staleness/manual-review workflow, not restricted-provider ingestion.
- Same-date time scrub remains zero venue requests; a selected-date change remains exactly one.
- Google-derived hours and URLs cannot be persisted, logged, queued, fixture-backed, exposed, or used on MapLibre-associated surfaces; retained Google Place IDs are identity/reference only.
- OSM is non-writing until explicit legal, attribution, data-classification, share-alike, coverage, and schedule-compatibility approval.
- Production admin remains retired; any Story 12.5 editor is localhost/dev-only and production-impossible.
- Public confidence numbers are removed visually and from screen-reader copy while internal confidence and uncertainty remain.
- The 2026-07-13 Product amendment resolves Story 12.14's two retained open questions: exact by-name closed search returns a labelled/openable result, and saved closed favourites remain greyed, labelled, and inspectable without restoring a map pin.

### PRD Completeness Assessment

PRD v3.2 is complete for Epic 12 traceability and story drafting. It correctly distinguishes live-real-path status from public-launch readiness, adopts the provider pivot, preserves the request-count and honesty constraints, and records the resolved closed-search/favourite behavior. It does not by itself authorize full Epic 12 implementation because dedicated audited story briefs, dependency ordering, baseline gates, and implementation evidence are still required.

## Epic Coverage Validation

### FR Coverage Matrix

| PRD requirement | Epic/story coverage | Status |
|---|---|---|
| FR1, FR4–FR6, FR46 | Epic 1 | Covered |
| FR2–FR3, FR7–FR14, FR31 | Epic 2, with Epic 12 refinements in 12.3, 12.6, 12.10, 12.12–12.14 | Covered |
| FR12a | Shipped Stories 8.6/8.7; consumed by Epic 12 Stories 12.2/12.5 | Covered in story prose, missing from the forward FR inventory/map |
| FR15–FR20, FR37 | Epic 3, with live-identity correction in Story 12.7 | Covered |
| FR21–FR26 | Future Monetization / Epic 4, explicitly post-MVP | Covered as deferred scope |
| FR27–FR30 | Epic 5 | Covered |
| FR32–FR35 | Epic 6 | Covered |
| FR36, FR38–FR45 | Explicitly retired; Story 12.5 is the narrow dev-only, production-denied exception to FR40/FR41 | Covered as retired/controlled exception |
| FR47–FR50 | Epic 7, with Story 12.8 About-page clarification | Covered |

### Epic 12 Launch-Requirement Matrix

| Requirement | Epic 12 coverage | Status |
|---|---|---|
| LR1 availability truth | Story 12.14; shared selected-instant hours contract with 12.1 | Covered; exact-search/favourite policy resolved 2026-07-13 |
| LR2 pin truth | Stories 12.6 and 12.8, with 12.13 confidence removal | Covered |
| LR3 guided first use | Story 12.11 | Covered |
| LR4 live venue identity | Story 12.7 shared resolver, consumed by 12.5/12.10/12.14 | Covered |
| LR5 venue media | Story 12.12 | Covered |
| LR6 maintainer operations | Story 12.5 and architecture production hard deny | Covered |

### Inventory and Coverage-Map Drift

The top `epics.md` inventory is not a fully synchronized copy of PRD v3.2. It omits FR12a and LR1–LR6; retains older wording for FR1/FR28 and NFR1/NFR7/NFR20/NFR28/NFR32; and omits NFR38–NFR39. This is a documentation/traceability defect, not an uncovered implementation path, because:

1. the approved proposal §4.7 deliberately authorized only constrained forward-inventory changes;
2. PRD v3.2, UX, architecture E12-AD-01…13, Epic 12 story prose, test design, and `project-context.md` provide unambiguous current precedence; and
3. the missing/different obligations are explicitly owned by the Epic 12 stories and decision spine.

Accordingly, these out-of-scope retained preamble lines are treated as a **controlled superseded baseline**, not as implementation instructions. Future story briefs must cite the current canonical sources and must not resurrect the stale wording.

### Missing Requirements

- **No PRD functional requirement lacks an implementation path.**
- **Traceability gap:** FR12a and LR1–LR6 are absent from the preamble coverage map. This should remain visible as documentation debt, but it does not block Epic 12 story drafting under the approved canonical-precedence rule.
- **No open product-policy gap:** FR3, FR31, and LR1 now settle map/ranked discovery, exact by-name search, saved favourites, labels, and detail access for an explicitly closed venue.

### Coverage Statistics

- Total PRD FR entries: 51 (FR1–FR50 plus FR12a)
- Covered/deferred/retired with a traceable path: 51
- Epic 12 launch requirements: 6 of 6 mapped to stories
- Functional coverage: 100% implementation-path coverage
- Forward-inventory exactness: incomplete because of the controlled retained preamble drift above

## UX Alignment Assessment

### UX Document Status

Found and revised on 2026-07-12. The UX specification contains explicit Epic 12 contracts for two-state pins, row-quantized sheet behavior, coach marks, optimized venue photos, bounded detail preload, selected-instant hours, confidence removal, accessibility, screen states, and visual-validation coverage.

### UX ↔ PRD Alignment

| Concern | Alignment result |
|---|---|
| Availability | Aligned: one Europe/Stockholm selected instant; closed hidden from map/ranked discovery and availability counts; saved closed favourites remain greyed, labelled, inspectable, and pin-free; unknown visible; prior-day spillover supported. |
| Search | Aligned: an exact by-name closed venue remains labelled `Stängt vid vald tid` and openable; area/partial/fuzzy discovery excludes closed venues. |
| Sunny presentation | Aligned: amber only above 50% and not weather-gated; grey otherwise; grey is percentage-free and colour-independent. |
| Confidence | Aligned: no public or assistive confidence number; internal diagnostics and non-numeric uncertainty remain. |
| Coach marks | Aligned: mounted responsive targets only, skip at every step, reopen from Settings, focus/ESC/reduced-motion rules. |
| Detail preload | Aligned: initial-settle-only, six candidates/two concurrent, visible-order plus favourites, exact detail key, no scrub/date restart, immediate accessible skeleton shell on miss. |
| Media | Aligned: explicit card/hero renditions, legacy fallback, deterministic surface selection, broken-image fallback, no raw original. |
| Mobile sheet | Aligned: complete-row height model, handle-only state, anchored bottom, keyboard parity, safe-area and recenter implications. |

The UX shorthand `!weatherGated` must be implemented using architecture's explicit `weatherGateState !== 'gated'` tri-state and must retain unknown-weather copy; it cannot be implemented as a boolean that reconstructs unknown as known-clear.

### UX ↔ Architecture Alignment

- `E12-AD-07` supplies the precise availability predicate, selected-instant copy rules, candidate-cap separation, selection continuity, and the resolved exact-search/favourite surface policy required by UX.
- `E12-AD-08` supplies the shared public-sunny predicate, server/client comparator tuple, qualifying window/peak algorithm, accessible presentation, and explicit unknown-weather treatment.
- `E12-AD-09` adopts the UX preload default exactly: initial-settle only, budget six, concurrency two, already-returned candidates, no 10 km expansion, and no request-gate change.
- `E12-AD-10` turns the UX photo recommendation into a concrete immutable Storage contract with card/hero dimensions, byte caps, keys, selection rules, fallbacks, and write-denial posture.
- `E12-AD-05`, `E12-AD-06`, and `E12-AD-11` support the UX-visible hidden-venue behavior, public display coordinate, and production-impossible editor without crossing the client/server boundary.
- Existing design-token, Swedish-first, WCAG 2.1 AA, reduced-motion, shadcn/Tailwind, API-boundary, and visual-gate rules remain binding.

### Alignment Issues and Warnings

1. **No UX/architecture blocker is unowned.** All UX-significant Epic 12 behavior has an adopted architectural home.
2. **Story prose precedence is load-bearing.** Retained Story 12.1 Google-sync prose, Story 12.10 option text, and Story 12.14 open questions conflict with the adopted UX/architecture choices. Their future story briefs must include the required “Superseded Epic Text” section and implement `E12-AD-01`/`E12-AD-09`/`E12-AD-07`, not the retained options literally.
3. **Readiness wording requires scope clarification.** Architecture says its planning substrate is ready for story creation and all product decisions are adopted. That does not prove the epic is implementation-ready: the same architecture lists extensive unexecuted launch gates and mandatory story-brief supersession controls. This readiness report therefore separates story-drafting readiness from implementation and public-launch readiness.

## Epic Quality Review

### Epic Structure

Epic 12 is a brownfield launch-readiness epic with a coherent user outcome: make the live 42-venue product fast, truthful, usable, and operationally safe enough for public launch. Several stories are infrastructure or maintainer-facing, but each ties directly to public latency, identity, availability, truth, or reliability. The maintainer explicitly approved keeping all 14 stories in one epic; this assessment does not split or renumber it.

The epic is not implementation-independent story by story. Shared contract ownership creates intentional sequencing. This is acceptable only if story briefs preserve the owners below and consumers do not implement local substitutes.

### Story-by-Story Quality and Dependency Review

| Story | Quality/readiness finding | Required ordering or control |
|---|---|---|
| 12.1 | User outcome and failure/manual-review cases are testable, but retained Google-sync title/AC text is prohibited as literal implementation. | Brief must contain **Superseded Epic Text** and implement `E12-AD-01`/`13`: provider-neutral provenance and weekly staleness review, no Google hours. Shared hours contract binds 12.14. |
| 12.2 | Clear ongoing accuracy-loop value; not a public-launch hard gate. ACs correctly require verdict evidence and current geometry hash. | Starts after 12.7 resolver; consumes 12.3 hash and 12.6/`E12-AD-08` sunny predicate. Must not redefine any. |
| 12.3 | Large but cohesive public-performance/security story; measurable cold p95, exact coverage, fail-closed, RLS, parity, and rollover ACs. | First owner of persisted geometry, canonical hash, atomic publication, scheduled coverage, and weather snapshot architecture. Public-launch blocker. |
| 12.4 | Independently valuable runtime-hygiene story with source-first diagnosis and regression guard. | Can proceed independently after baseline checks; exact-source allow-list only. |
| 12.5 | Broad maintenance story but bounded by production denial and explicit fields. ACs cover coordinate, hidden-route, cache, polygon, media, and hash seams. | Consumes 12.3 hash/publication, 12.7 resolver/visibility, and 12.12 rendition contract. Draft tasks must be dependency-ordered. |
| 12.6 | Clear public semantic simplification with boundary, server/client ordering, ARIA, and visual gates. | Owns/lands shared sunny presentation before 12.2 and 12.8 consume it; must implement `E12-AD-08`, not raw status. |
| 12.7 | Small, testable live-identity correction expanded correctly to reviews GET/POST and feedback. | Natural early owner of `E12-AD-05`; must cover every public path, not just the originally named routes. Public-launch blocker. |
| 12.8 | Clear education/truth outcome; prevents probability misreading and fabricated accuracy. | Follows 12.6/12.13 semantics. It may label accuracy preliminary instead of depending on 12.2, avoiding a mandatory forward dependency. |
| 12.9 | Cohesive responsive/touch redesign with measurable row, drag, keyboard, safe-area, recenter, and forced-state ACs. | Coordinate with standing Epic 11 touch/request gates and visual-state migration; no architectural blocker. |
| 12.10 | Good latency outcome, but retained option text is superseded and unsafe to choose anew. | Brief must contain **Superseded Epic Text** and implement `E12-AD-09`: initial settle only, existing candidates, 6 total/2 concurrent, no scrub/date restart or 10 km expansion. Uses 12.7 guard. |
| 12.11 | Clear first-run value with target-presence, responsive, persistence, keyboard, and reduced-motion ACs. | Anchor only mounted controls; align pin step to 12.6 and row targets to 12.9 if those surfaces have landed. |
| 12.12 | Complete media value with performance, deterministic selection, Storage security, and fallback cases. | Implements `E12-AD-10` before 12.5 edits media fields. Visual and Storage evidence required. |
| 12.13 | Complete confidence-removal sweep including visible, assistive, route, i18n, stale utility/test, and uncertainty-retention cases. | Should precede 12.2/12.8 public copy work. Internal confidence remains; public DTO removal follows `E12-AD-12`. |
| 12.14 | Complete selected-instant behavior: all sources, prior-day spillover, unknown/closed, counts/tags, candidate cap, request counts, selection continuity, exact-name labelled return, and retained greyed/inspectable favourites. | Consumes 12.1 hours contract and 12.7 visibility. Brief must supersede both the retained `/favoriter` filtering AC and open questions, then implement `E12-AD-07` exactly. |

### Best-Practice Findings by Severity

#### Critical

- **No unmitigated epic-structure critical defect.** The epic is intentionally mixed but has one launch outcome and approved stable scope.
- **Literal implementation of retained Story 12.1 Google hours or Story 12.10 option text would be a critical process defect.** Architecture and test design require an auditable supersession section before implementation.

#### Major

- **Forward dependency risk:** 12.2, 12.5, 12.8, 12.10, 12.11, 12.12, and 12.14 consume shared contracts owned elsewhere. Story briefs must turn these into explicit prerequisites/tasks and may not fork a local resolver, hash, predicate, media shape, or prefetch policy.
- **Story 12.14 retained prose is superseded.** The product choice is complete, but its future brief must explicitly replace the old open questions with the adopted labelled exact-search and retained closed-favourite contract before implementation.
- **Story 12.3 is unusually large.** Its size is justified by the atomic availability boundary—persisted geometry, hash, weather snapshots, scheduled complete coverage, and fail-closed reads must land coherently—but its brief should sequence migration, security, compute, scheduling, and live evidence as independently verifiable tasks.

#### Minor / Controlled

- `epics.md` forward inventory is a controlled superseded baseline rather than a perfectly synchronized traceability inventory.
- The active MVP QA pointer retains historical Story 2.6 confidence clauses below an explicit forward supersession notice. The notice and Epic 12 test delta make the forward expectation unambiguous.

### Test-Design Adequacy

The completed Epic 12 test design maps all 14 stories to 22 risks, including ten score-6-or-higher risks and all proposal-required P0/P1 areas. It correctly:

- marks 12.3 and 12.7 as public-launch blockers and 12.2 as an ongoing loop;
- encodes the signed exact-name closed-search and retained closed-favourite branch, including accessible non-colour status and enabled detail navigation;
- prohibits live Met.no/Google/provider calls;
- preserves scrub=0/date-change=1 and fixes detail prefetch at 6/2 initial-settle-only;
- covers hash golden vectors, atomic promotion, RLS/REST denial, complete visibility routes, hours boundaries, sunny comparator/window/peak parity, production editor denial, media policy, coach focus, touch, console, full cross-epic sweeps, and human-reviewed rebaselines;
- distinguishes deterministic CI, live performance, physical-device, visual, and public-launch evidence lanes.

No required story lacks a risk/evidence path. Missing implementation evidence is correctly not interpreted as PASS.

## Summary and Recommendations

### Overall Readiness Status

> **READY FOR STORY DRAFTING; NOT READY FOR EPIC 12 IMPLEMENTATION OR PUBLIC-LAUNCH SIGN-OFF.**

The planning substrate is materially aligned: PRD v3.2, UX, architecture `E12-AD-01`…`E12-AD-13`, test design, project context, and all 14 story paths agree on the target behavior. All ten proposal decisions are fully adopted. The final 2026-07-13 Product decision keeps exact by-name closed results labelled/openable and saved closed favourites greyed/labelled/inspectable while map/ranked discovery remains filtered.

### Ten-Decision Verification Matrix

| # | Proposal decision | Canonical evidence and adopted outcome | Readiness |
|---:|---|---|---|
| 1 | Single-interval hours default/manual review | PRD provider-neutral hours; UX selected-instant contract; `E12-AD-01`; test default 3; project-context invariant 1. One interval per ISO weekday; whole field absent unknown; missing/null weekday closed; prior-day spillover; split/24/7/seasonal/holiday whole-venue manual review. | **Adopted** |
| 2 | Shared visibility resolver ownership | `E12-AD-05`; Story 12.7 owns one live ID-or-slug, hidden-aware server guard for list/detail/reviews/feedback/favourites/prefetch; 12.5/12.10/12.14 consume it. | **Adopted** |
| 3 | Canonical geometry hash/version/atomic publication | `E12-AD-03` defines `geometry_input_hash` as `g1:<lowercase SHA-256>` over the canonical full input set; `E12-AD-04` requires complete scheduled coverage; staged precompute and one-transaction promotion prevent mixed generations. | **Adopted** |
| 4 | Request-count/prefetch choice | UX `VenueDetailPreload`, `E12-AD-09`, and test default 5 select initial-settle-only prefetch, exact shared key, existing list/favourite candidates, budget 6, concurrency 2, no restart on scrub/date. Scrub remains 0; date change remains 1 list/favourites request. | **Adopted** |
| 5 | Sunny predicate/comparator/window-label policy | `E12-AD-08`; public sunny is `sunExposurePercent > 50 && weatherGateState !== 'gated'`; server/client comparison tuple is shared/parity-tested; unqualified window/peak uses the same qualifying steps with deterministic longest-run/earliest-tie rules. | **Adopted** |
| 6 | Display vs engine coordinates | `E12-AD-06`; public DTO, discovery, distance, routing, and markers use `display_lat/display_lng`; engine/weather uses server-only seating centroid; display edits do not change prediction/hash. | **Adopted** |
| 7 | Card/hero rendition contract | UX `VenuePhoto` and `E12-AD-10`; explicit `cardUrl`/`heroUrl` with legacy `url` fallback, immutable versioned Storage keys, card/hero byte/dimension caps, deterministic per-surface selection and fallback. | **Adopted** |
| 8 | Closed favourites and search policy | PRD FR3/FR31/LR1, UX, and `E12-AD-07` adopt one concrete policy: map/ranked/area/partial discovery hides explicitly closed venues; exact by-name search returns them labelled `Stängt vid vald tid`; saved favourites remain greyed, labelled, inspectable, and pin-free; unknown stays visible without a claim. | **Adopted** |
| 9 | Provider pivot viability | Completed research finds Google weekly `regularOpeningHours` persistence non-viable under current ordinary EEA/MapLibre terms. `E12-AD-01`/`13` adopt independently sourced canonical hours plus weekly stale/manual-review workflow; Place IDs only; OSM non-writing until licence/coverage approval. Manual/venue-confirmed fallback is viable at 42 venues. | **Adopted** |
| 10 | Candidate source | UX preload contract and `E12-AD-09` choose already-returned list/favourites candidates; no radius expansion or 10 km endpoint. | **Adopted** |

### Blocker Taxonomy

#### Public-launch blockers

1. **Story 12.3:** cold real-scale persisted geometry, hash/atomicity, coverage, security, weather snapshots, request-count parity, and approximately five-second cold p95 evidence are not implemented or proven.
2. **Story 12.7:** the shared live ID/slug visibility resolver and full public-route matrix are not implemented or proven; live review/feedback identity defects remain.
3. **Public-launch evidence:** all P0 scenarios and required live/security/device/visual/migration/provider-policy evidence remain outstanding. In particular, the one-time hours provenance remediation must leave zero Google-derived or unprovenanced public schedules.

Story 12.2 is **not** a hard public-launch gate. It is the ongoing field-accuracy loop and should continue after the basic public truth/identity/performance foundations land.

#### Implementation blockers

- Epic 12 has no dedicated, audited story briefs yet; the repository workflow requires story creation/audit and baseline typecheck/lint before implementation.
- Consumers must wait for or explicitly depend on their shared owners: 12.3 hash/publication, 12.7 resolver/visibility, 12.6 shared sunny semantics, 12.12 media contract, and 12.1/12.14 shared hours representation.

#### Story-drafting controls

- **12.1:** mandatory **Superseded Epic Text** section naming the rejected Google intent and controlling proposal/research/`E12-AD-01`/`13`; literal Google-hours implementation is prohibited.
- **12.10:** mandatory **Superseded Epic Text** section naming the discarded option text and controlling `E12-AD-09`; initial-settle 6/2 existing-candidate behavior is fixed.
- **12.14:** mandatory **Superseded Epic Text** section naming both the retained all-source `/favoriter` filter and the resolved search/favourites open questions, with controlling PRD FR3/FR31/LR1 plus `E12-AD-07`; implement the concrete labelled exact-search and retained closed-favourite branch, not the conflicting filter or a parameterized alternative.
- The remaining story paths are ready to be drafted with their adopted decision IDs and dependency order.

#### Non-blocking hardening and polish

- Stories 12.4, 12.8, 12.9, 12.11, 12.12, and 12.13 are not the named score-9 launch blockers, and Story 12.5 is maintainer enablement. They may be drafted while owner stories progress.
- This classification does **not** make their acceptance criteria optional for epic completion or launch evidence. Console cleanliness, accessibility, visual rebaselines, honest About copy, touch behavior, media security/performance, and confidence removal remain required under the test design's P1/visual lanes.

### Critical Issues Requiring Immediate Action

1. Draft and audit 12.3 and 12.7 first as the public-launch owner stories.
2. Draft 12.1, 12.10, and 12.14 only with their mandatory supersession sections and static/behavioral guards.
3. Preserve the adopted owner/consumer sequence; do not permit local duplicate hash, resolver, availability, sunny, coordinate, media, or prefetch implementations.

### Recommended Next Steps

1. Create dedicated story briefs in dependency-aware order, beginning with 12.3 and 12.7, and run the required story-file audit immediately after each brief.
2. Put `E12-AD` citations, test-design risks, migration/schema implications, visual states, and exact evidence lanes into every story brief; add the extra supersession audit for 12.1/12.10/12.14.
3. Before each implementation story, run baseline typecheck and lint. After implementation, collect the story-specific deterministic/live/device/visual evidence rather than treating planning completeness as test PASS.
4. Re-run implementation/public-launch readiness after the P0 owner stories land; use the test design exit criteria for final public-launch sign-off.

### Final Assessment Note

This delta identifies five controlled attention areas across three categories: three mandatory retained-prose supersession controls, one forward-inventory traceability drift, and one unexecuted implementation/evidence program. None requires changing or renumbering Epic 12. The canonical precedence chain is sufficient for disciplined story drafting, but not for implementation or public launch without the controls and evidence above.

**Assessor:** Codex implementation-readiness workflow

**Assessment completed:** 2026-07-12 · Product-policy amendment completed: 2026-07-13
