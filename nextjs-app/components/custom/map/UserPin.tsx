'use client';

/**
 * Story 9.5 AC2 — the amber "you-are-here" user-location dot.
 *
 * Presentational only: an 18×18 px amber circle with a white border, a soft
 * drop shadow, and an absolutely-positioned radial halo. Modelled byte-for-byte
 * on the Claude Design reference `UserPin`
 * (`docs/design/references/claude-design/project/src/Pins.jsx:110-133`).
 *
 * The whole pin is `pointer-events: none` so it never intercepts a map drag or
 * a venue-pin tap — the dot is pure decoration over the map canvas. The
 * `UserLocationLayer` mounts ONE of these into a detached element handed to a
 * MapLibre `Marker`, so positioning is owned by the marker (centred on the
 * resolved coords via `anchor: 'center'`); this component only draws the dot.
 *
 * Token note (Story 9.5): the reference fill `#d97706` (Tailwind amber-600) has
 * no exact DESIGN.md token — the closest amber tokens are `--color-amber-pin
 * #f1b100` and `--color-amber-primary #ffbf00`, neither of which matches the
 * reference's deeper orange-amber. Per the story's frontend-component guidance,
 * the raw reference value is used here (it is a non-text decorative dot, so the
 * `#b45309` AA-contrast bump applied to the bottom-nav tab token in Story 1.6
 * does not apply) and the token gap is recorded in the story Completion Notes.
 * Do NOT invent a new token in this story.
 */

const USER_PIN_AMBER = '#d97706';

export function UserPin() {
  return (
    <div
      data-testid="user-location-pin"
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 18,
        height: 18,
        pointerEvents: 'none',
      }}
    >
      {/* Soft radial halo behind the dot. */}
      <div
        style={{
          position: 'absolute',
          inset: -22,
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
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: USER_PIN_AMBER,
          border: '3px solid #fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  );
}
