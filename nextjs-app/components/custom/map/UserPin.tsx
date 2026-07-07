'use client';

/**
 * Story 9.5 AC2 / Story 11.5 AC2 — the amber "you-are-here" user-location dot.
 *
 * Presentational only: a 24×24 px amber circle with a white ring, a soft drop
 * shadow, and an absolutely-positioned radial halo that pulses continuously
 * ("living" dot). Modelled on the Claude Design reference `UserPin`
 * (`docs/design/references/claude-design/project/src/Pins.jsx:110-133`) —
 * Story 11.5 scaled it up from 18→24 px and animated the halo (the reference
 * is the starting shape, not a size cap). The round amber+white-ring dot with
 * a pulsing halo stays clearly distinct from venue pins (44×50 amber teardrops
 * / grey shaded pills) at all zooms.
 *
 * The whole pin is `pointer-events: none` so it never intercepts a map drag or
 * a venue-pin tap — the dot is pure decoration over the map canvas. The
 * `UserLocationLayer` mounts ONE of these into a detached element handed to a
 * MapLibre `Marker`, so positioning is owned by the marker (centred on the
 * resolved coords via `anchor: 'center'`); this component only draws the dot.
 * The detached-root render is fine for the halo animation because the pulse is
 * a GLOBAL `@utility` + `@keyframes` in `globals.css` (`animate-user-location-
 * halo`, GPU-friendly transform/opacity — test-design R-018), and the
 * `prefers-reduced-motion: reduce` override there pins the halo to a static
 * resting state (AC2 + Design Gate → Animation).
 *
 * Token note (Story 11.5, resolving the Story-9.5 gap): the reference fill
 * `#d97706` (Tailwind amber-600) is now the `--color-amber-location-dot`
 * design token (added to the `@theme` block + the DESIGN.md colour table).
 * No raw hex remains in this component. The hue is unchanged — AC2 upgrades
 * size + halo, not the colour.
 */

const DOT_SIZE_PX = 24;
const USER_PIN_AMBER = 'var(--color-amber-location-dot)';

export function UserPin() {
  return (
    <div
      data-testid="user-location-pin"
      aria-hidden="true"
      style={{
        position: 'relative',
        width: DOT_SIZE_PX,
        height: DOT_SIZE_PX,
        pointerEvents: 'none',
      }}
    >
      {/* Soft radial halo behind the dot — pulses continuously (static under
          reduced motion via the media-query override on the utility). */}
      <div
        data-testid="user-location-halo"
        className="animate-user-location-halo"
        style={{
          position: 'absolute',
          inset: -26,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(217,119,6,0.3) 0%, rgba(217,119,6,0) 65%)',
          pointerEvents: 'none',
        }}
      />
      {/* The dot itself. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: DOT_SIZE_PX,
          height: DOT_SIZE_PX,
          borderRadius: '50%',
          background: USER_PIN_AMBER,
          border: '3px solid #fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  );
}
