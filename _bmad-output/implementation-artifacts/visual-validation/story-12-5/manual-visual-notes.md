# Story 12.5 Manual Visual Validation

Date: 2026-07-27

Provider mode:

- `VISUAL_VALIDATE_PROVIDER=none`
- `ALLOW_MANUAL_VISUAL_VALIDATION=1`
- Human/orchestrator approval for manual mode was supplied for this run because the automated Claude provider has no `ANTHROPIC_API_KEY` in the environment.

Wrapper commands passed:

- `scripts/visual-validate.sh map-primary "/?_state=map-primary&_time=14:00" mobile`
- `scripts/visual-validate.sh map-primary "/?_time=16:30" desktop`
- `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=14:00" mobile`
- `scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail&_time=16:30" desktop`

Captured implementation screenshots:

- `mobile-map-primary.png`
- `desktop-map-primary.png`
- `mobile-venue-detail.png`
- `desktop-venue-detail.png`

Reference screenshots compared:

- `nextjs-app/docs/design/references/screens/mobile/map-primary.png`
- `nextjs-app/docs/design/references/screens/desktop/map-primary.png`
- `nextjs-app/docs/design/references/screens/mobile/venue-detail.png`
- `nextjs-app/docs/design/references/screens/desktop/venue-detail.png`

Manual result:

PASS. Gate-off public map and venue-detail chrome remains in the expected layout, no `_editor=venues` panel or dev editor marker is visible, and no public surface exposes editor controls. Observed differences are non-blocking for this story: dynamic basemap tile content/pin positions, fixture placeholder imagery where references show photo assets, and normal capture scale/device-frame differences.
