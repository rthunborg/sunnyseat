/**
 * Pin marker icons for venue map markers.
 *
 * Draws teardrop pin icons directly via Canvas 2D API and produces
 * ImageData for MapLibre symbol layers. Pure canvas — no SVG decoding,
 * no blob URLs — so it works reliably in every browser.
 *
 * Pin dimensions: 28 × 36 logical px, rendered at 2x (56 × 72 actual
 * pixels) for crisp display on high-DPI screens.
 */

// ---------------------------------------------------------------------------
// Pin colors per status
// ---------------------------------------------------------------------------

const PIN_COLORS: Record<string, { fill: string; dot: string }> = {
  sunny: { fill: '#16A34A', dot: '#FFFFFF' },
  partial: { fill: '#D97706', dot: '#FFFFFF' },
  shaded: { fill: '#6B7280', dot: '#FFFFFF' },
  upcoming: { fill: '#8B5CF6', dot: '#FFFFFF' },
  partner: { fill: '#FFD700', dot: '#B8960F' },
};

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

/** Render at 2x for retina */
const SCALE = 2;
const W = 28 * SCALE; // 56
const H = 36 * SCALE; // 72

/**
 * Draw a teardrop pin shape on a canvas context.
 * The shape: a circle (head) that tapers to a point at the bottom.
 * Coordinates in the 56×72 canvas space.
 */
function drawTeardropPath(ctx: CanvasRenderingContext2D) {
  const cx = W / 2;     // 28 — center X
  const cy = 26;        // center of the circle head (in 2x space)
  const r = 22;          // radius of the circle head
  const tipY = H - 4;   // bottom tip Y (leave 4px for shadow)

  ctx.beginPath();

  // Arc for the round head (from ~210° to ~330°, i.e. the top portion)
  // We draw the full top arc then taper to the tip
  const startAngle = Math.PI * 0.72;
  const endAngle = Math.PI * 0.28;

  ctx.arc(cx, cy, r, startAngle, endAngle, true);

  // Right side curve to tip
  ctx.quadraticCurveTo(cx + 4, cy + r + 6, cx, tipY);

  // Left side curve back up
  ctx.quadraticCurveTo(cx - 4, cy + r + 6, cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle));

  ctx.closePath();
}

/**
 * Render a pin icon to ImageData using pure Canvas 2D drawing.
 * No SVG, no Image elements, no blob URLs — just canvas paths.
 */
function renderPinToImageData(fill: string, dot: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback: return a solid-colored rectangle
    const data = new Uint8ClampedArray(W * H * 4);
    return new ImageData(data, W, H);
  }

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 3 * SCALE;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1 * SCALE;

  // Fill the teardrop
  drawTeardropPath(ctx);
  ctx.fillStyle = fill;
  ctx.fill();

  // White stroke (no shadow on stroke)
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2 * SCALE;
  ctx.strokeStyle = '#FFFFFF';
  drawTeardropPath(ctx);
  ctx.stroke();

  // Inner dot
  const cx = W / 2;
  const cy = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, 4 * SCALE, 0, Math.PI * 2);
  ctx.fillStyle = dot;
  ctx.fill();

  return ctx.getImageData(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// SVG template (kept for data URL generation / tests)
// ---------------------------------------------------------------------------

function pinSvg(fill: string, dot: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
  <defs>
    <filter id="ds" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.25"/>
    </filter>
  </defs>
  <path d="M14 34 C14 34, 3 20, 3 13 A11 11 0 1 1 25 13 C25 20, 14 34, 14 34Z"
        fill="${fill}" stroke="#FFFFFF" stroke-width="2" filter="url(#ds)"/>
  <circle cx="14" cy="13" r="4" fill="${dot}"/>
</svg>`;
}

// ---------------------------------------------------------------------------
// Data URL generation (kept for external use / tests)
// ---------------------------------------------------------------------------

/**
 * Returns a data-URL encoded SVG for a given sun status pin icon.
 */
export function pinIconDataUrl(status: string): string {
  const colors = PIN_COLORS[status] ?? PIN_COLORS.shaded;
  const svg = pinSvg(colors.fill, colors.dot);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Returns all pin icon data URLs keyed by status.
 */
export function allPinIconDataUrls(): Record<string, string> {
  return Object.fromEntries(
    Object.keys(PIN_COLORS).map((status) => [status, pinIconDataUrl(status)]),
  );
}

// ---------------------------------------------------------------------------
// Map loading
// ---------------------------------------------------------------------------

/** MapLibre map interface (subset needed for pin icon loading) */
interface MapLike {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: ImageBitmap | HTMLImageElement | ImageData | { width: number; height: number; data: Uint8Array | Uint8ClampedArray },
    options?: { sdf?: boolean; pixelRatio?: number },
  ) => void;
}

/**
 * Pre-load all pin images into a MapLibre map instance.
 * Draws pins via Canvas 2D — synchronous, no image decoding needed.
 */
export function loadPinIcons(map: MapLike): void {
  for (const [status, colors] of Object.entries(PIN_COLORS)) {
    const imageId = `pin-${status}`;
    if (map.hasImage(imageId)) continue;

    try {
      const imageData = renderPinToImageData(colors.fill, colors.dot);
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, imageData, { pixelRatio: 2 });
      }
    } catch (err) {
      console.warn(`Failed to render pin icon for ${status}:`, err);
    }
  }
}

/** Pin anchor point (fraction of image size, for MapLibre icon-anchor) */
export const PIN_ANCHOR: [number, number] = [0.5, 1.0];

/** Pin size relative to original SVG (for icon-size property) */
export const PIN_ICON_SIZE = 0.85;
