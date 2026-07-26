# Story 12.4 Manual Visual Evidence

Status: human-accepted manual visual package.

This package was finalized after the parent confirmed final fix commit `b64da80`. It uses only post-`b64da80` candidate screenshots. `VISUAL_VALIDATE_PROVIDER=none` means no automated LLM visual PASS/FAIL verdict was made; `passFailDecisionMade:false` is preserved in `capture-manifest.json`.

Human approval was received on 2026-07-26 Europe/Stockholm:

```text
Approve Story 12.4 visual acceptance
```

Rationale recorded for the package: the four post-fix manual comparison PNGs are accepted by human review. The approved reference PNGs remain unchanged; no rebaseline was performed or required.

## Scope

- Package: `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009`
- Base URL used for final captures: `http://localhost:43220`
- Host alignment: server bound to `localhost`; wrapper and browser surfaces used `http://localhost:43220`
- Canonical paths: unprefixed default-locale routes, no `/sv`
- Final server state: released; `dev-server-final-stop.log` records no remaining listener on port `43220`
- Screenshots/references were not altered during finalization or approval recording

## Wrapper Results

All four provider-neutral wrapper runs were executed in manual mode with:

- `VISUAL_VALIDATE_PROVIDER=none`
- `ALLOW_MANUAL_VISUAL_VALIDATION=1`
- `DEV_SERVER_URL=http://localhost:43220`

Results:

| Case | Route | Viewport | Exit |
| --- | --- | --- | ---: |
| map-primary mobile | `/?_state=map-primary&_time=14:00` | mobile | 0 |
| map-primary desktop | `/?_time=16:30` | desktop | 0 |
| venue-detail mobile | `/?venue=test-venue-sunny&_state=venue-detail&_time=14:00` | mobile | 0 |
| venue-detail desktop | `/?venue=test-venue-sunny&_state=venue-detail&_time=16:30` | desktop | 0 |

## Capture Validation

All final cases resolved with HTTP `200`, zero redirects, `title:"SunnySeat"`, `hasErrorText:false`, `onboardingVisibleCount:0`, `appShellCount:1`, `mapCanvasCount:1`, and visible SunnySeat UI selectors. Candidate dimensions match the approved reference dimensions for each viewport.

The earlier guard failure was a false positive caused by the empty Next.js dev-tools element:

```html
<nextjs-portal style="--nextjs-dev-tools-scale: 1;"></nextjs-portal>
```

Read-only audit confirmed this was not app/runtime error UI.

## Comparisons

| Case | Comparison PNG | Dimensions | SHA-256 |
| --- | --- | ---: | --- |
| map-primary mobile | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\comparisons\map-primary-mobile-comparison.png` | 1560x1744 | `ccb38e56d0fdf05365f2191d26540613e54284271d800debe9a08bac22dc3a9d` |
| map-primary desktop | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\comparisons\map-primary-desktop-comparison.png` | 5760x1856 | `4bc5159c33920ac1171a3fbba4c398fb42b3182db9b9d9a39507e145bc48f58d` |
| venue-detail mobile | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\comparisons\venue-detail-mobile-comparison.png` | 1560x1744 | `95f37dad71a30ba57aa90d693d0a5e69dde4751f3a3346e8663b8146ba2ea562` |
| venue-detail desktop | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\comparisons\venue-detail-desktop-comparison.png` | 5760x1856 | `dc893850e8b448c7caf287235bf35e7ab50479708f65f52a3640ea9dc59816e4` |

## Candidate Screenshots

| Case | Candidate PNG | Dimensions | SHA-256 |
| --- | --- | ---: | --- |
| map-primary mobile | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\screenshots\map-primary-mobile-candidate.png` | 780x1688 | `217918b1cd3f3e63f505dcc474a54186fc3126a73e4049a7ef7b649244bebc46` |
| map-primary desktop | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\screenshots\map-primary-desktop-candidate.png` | 2880x1800 | `a9ef49022b2009680a56a934e402b76c29b7708b39c46857f9ac1fc8e16e3027` |
| venue-detail mobile | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\screenshots\venue-detail-mobile-candidate.png` | 780x1688 | `7a0b900638f6d28acdb59966cca1470e86af0697d9ddea7bf0a9de7156bd1a80` |
| venue-detail desktop | `C:\Users\Rasmus\sunnyseat\_bmad-output\implementation-artifacts\validation\story-12-4-manual-visual-20260725-222009\screenshots\venue-detail-desktop-candidate.png` | 2880x1800 | `66712e1f9dbda70cc156e0393db6e77c321282991c5f4195137f3639bed81305` |

## References

| Case | Reference PNG | Dimensions | SHA-256 |
| --- | --- | ---: | --- |
| map-primary mobile | `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\map-primary.png` | 780x1688 | `3a3beb45f26229c87cf4106e775748a30cf24d3644ee604024e12acd2161392a` |
| map-primary desktop | `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\map-primary.png` | 2880x1800 | `073294af904d6f65163eceeefd6be492b5308333bf874f86f0cef7d0a1b36ec4` |
| venue-detail mobile | `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\mobile\venue-detail.png` | 780x1688 | `5ba211f13af3e4e5927f4b0cc5100be36fd8210d7a1e30e034f600314c08cc42` |
| venue-detail desktop | `C:\Users\Rasmus\sunnyseat\nextjs-app\docs\design\references\screens\desktop\venue-detail.png` | 2880x1800 | `05f3321ce879b0b52710dc2b6b973a21f3270bea16b3640653e96fde830f723e` |

## Console Classifications

| Case | Console count | Unclassified | Classifications |
| --- | ---: | ---: | --- |
| map-primary mobile | 7 | 0 | 4 `allowed-browser-webgl-readpixels-warning`; 3 `allowed-openfreemap-positron-style-worker-warning` |
| map-primary desktop | 3 | 0 | 3 `allowed-openfreemap-positron-style-worker-warning` |
| venue-detail mobile | 3 | 0 | 3 `allowed-openfreemap-positron-style-worker-warning` |
| venue-detail desktop | 3 | 0 | 3 `allowed-openfreemap-positron-style-worker-warning` |

## Human Approval

Accepted. Human approval was received on 2026-07-26 Europe/Stockholm with the verbatim text `Approve Story 12.4 visual acceptance`.

Because the visual provider was `none`, no automated visual-provider PASS/FAIL decision is claimed here. The human decision is accepted, and the package manifest records `humanVisualDecision.visualAccepted:true` while preserving `passFailDecisionMade:false`.
