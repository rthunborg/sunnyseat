/**
 * About page ("Hur fungerar SunnySeat?") constants.
 */

/**
 * ⚠️ PLACEHOLDER accuracy figure for the "TRÄFFSÄKERHET" section.
 *
 * The real headline figure must come from the validated, coverage-gated
 * confidence model (Stories 3.0.5/3.0.6). That number only exists once the
 * Epic 8 production cutover lands (flip the `SUNNYSEAT_*` flags + run the live
 * round-trips). Until then this single, clearly-named illustrative value stands
 * in. Swapping in the validated figure is a one-line change HERE — never
 * hardcode a marketing number anywhere else.
 *
 * [Source: epics.md:1995,2143; Story 7.1 Task 5.1]
 */
export const ABOUT_ACCURACY_PLACEHOLDER = 85;

/**
 * Count-up duration (ms) for the accuracy stat. Not a standard `--duration-*`
 * token — the UX spec pins this scroll-triggered count-up at 800 ms with
 * `easing-enter` (= ease-out). [Source: ux-design-specification.md §about; Story 7.1 Task 5.2]
 */
export const ABOUT_ACCURACY_COUNTUP_MS = 800;

/**
 * Hero photo assets (maintainer-provided sunset scenes under `public/about/`),
 * art-directed per viewport: a portrait crop on mobile, a landscape crop on
 * desktop. Served via a `<picture>` element so the browser fetches exactly one.
 * [Source: Story 7.1 Task 3.1]
 */
export const ABOUT_HERO_SRC_MOBILE = '/about/hero_sunset_mobile.jpeg';
export const ABOUT_HERO_SRC_DESKTOP = '/about/hero_sunset_desktop.jpeg';
