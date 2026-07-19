# Story 12.12 Venue Photo Candidate Captures

Generated as implementation evidence only. These PNGs are not promoted active references.
Maintainer approval is still required before copying them into docs/design/references/screens and updating REBASELINE-LOG.md.

Run ID: 20260719T195547
Scope: direct venue-detail captures for `venue-photo-loaded` and `venue-photo-fallback` on mobile and desktop.
Assertions before capture:
- `Kafe Magasinet` detail heading is visible in the detail surface.
- Loaded state renders the `hero.webp` image with naturalWidth 64.
- Fallback state removes the failed hero image and renders `venue-detail-hero-fallback`.
