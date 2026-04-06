# SunnySeat — Screen Flow Map

Use this as a wiring guide when connecting screens in Stitch's prototype mode.
Each arrow represents a user action that navigates between screens.

## Primary User Journey (happy path)

```
onboarding-first-visit
  ├─ "Use my location" ──────────────► map-primary
  └─ "Use Gothenburg centre" ────────► map-primary

map-primary
  ├─ Tap venue pin ──────────────────► venue-quickinfo
  ├─ Tap search bar / browse ────────► map-panel-venues
  ├─ Tap time slider (non-premium) ──► premium-planner-locked
  ├─ Tap time slider (premium) ──────► premium-planner
  └─ Scroll to footer / "Om" link ──► about

map-panel-venues
  ├─ Tap venue card ─────────────────► venue-quickinfo
  ├─ Close / collapse panel ─────────► map-primary
  └─ "Know a spot? Add it" CTA ─────► verification-modal

venue-quickinfo
  ├─ "See Full Details" CTA ─────────► venue-detail
  └─ Dismiss / tap elsewhere ────────► map-primary

venue-detail
  ├─ "Was this right?" ─────────────► feedback-modal
  ├─ Close / back ───────────────────► venue-quickinfo OR map-primary
  └─ "Open in Maps" ────────────────► (external: Google Maps)
```

## Premium Flow

```
premium-planner-locked
  └─ Tap locked control ────────────► premium-paywall (mobile)
                                      premium-paywall-desktop (desktop)

premium-paywall
  ├─ Swish CTA ─────────────────────► premium-paywall-processing
  └─ Close / "Not now" ────────────► map-primary

premium-paywall-desktop
  ├─ QR scanned (confirmed) ───────► premium-paywall-processing
  └─ Close / "Not now" ────────────► map-primary

premium-paywall-processing
  ├─ Payment confirmed ────────────► premium-planner (map with controls unlocked)
  ├─ Payment failed / timeout ─────► premium-paywall-error
  └─ Cancel ────────────────────────► premium-paywall

premium-paywall-error
  ├─ Retry ─────────────────────────► premium-paywall
  └─ Dismiss ───────────────────────► map-primary

premium-planner
  └─ "Now" shortcut ───────────────► map-primary (real-time view)
```

## Feedback & Verification Flow

```
feedback-modal (from venue-detail)
  ├─ Submit ────────────────────────► (success state: auto-dismiss 2s) → venue-detail
  └─ Skip / Close ─────────────────► venue-detail

verification-modal (from map-panel-venues)
  ├─ Submit ────────────────────────► (success state: auto-dismiss 2s) → map-primary
  └─ Skip / Close ─────────────────► map-primary
```

## Utility Pages

```
about
  └─ "Back to map" link ───────────► map-primary

not-found
  └─ "Find sunny spots now" CTA ──► map-primary
```

## Prototype Wiring in Stitch

In Stitch's prototype mode, connect screens by adding tap targets (hotspots)
on the interactive elements listed above. For each connection:

1. Select the source screen
2. Draw a hotspot over the button/link/area that triggers navigation
3. Set the destination screen
4. Choose transition type:
   - **Push right** for forward navigation (map → venue detail)
   - **Modal / slide up** for overlays (feedback-modal, verification-modal, paywall)
   - **Pop / slide left** for back navigation (venue detail → map)
   - **Fade** for state changes (paywall → processing → error)

Start by wiring the happy path first (onboarding → map → pin → quickinfo →
detail), then add the premium flow, then feedback/verification, then utility
pages. Walk through each path tapping through to verify it feels right before
locking the design.

## Screens with No Outbound Navigation (dead ends to check)

These screens should always have a way back. Verify each has a close/back/CTA:

- `not-found` — has "Find sunny spots" CTA ✓
- `about` — has "Back to map" link ✓
- `premium-paywall-error` — has retry + dismiss ✓
