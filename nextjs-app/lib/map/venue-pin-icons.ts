/**
 * SVG pin marker icons for venue map markers.
 *
 * Generates data-URL SVG icons for each sun status, suitable for
 * MapLibre `loadImage` / symbol layers. Each pin is a teardrop shape
 * with an inner dot and a white border.
 *
 * Pin dimensions: 28 × 36 px (anchor at bottom-center).
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
// SVG template
// ---------------------------------------------------------------------------

function pinSvg(fill: string, dot: string): string {
  // Teardrop pin: 28×36, anchor at (14, 36)
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
// Data URL generation
// ---------------------------------------------------------------------------

/**
 * Returns a data-URL encoded SVG for a given sun status pin icon.
 * These can be loaded into MapLibre via `map.loadImage(url)`.
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

/**
 * Pre-load all pin images into a MapLibre map instance.
 * Returns a promise that resolves when all images are loaded.
 */
export async function loadPinIcons(
  map: { loadImage: (url: string) => Promise<{ data: ImageBitmap | HTMLImageElement }>; hasImage: (id: string) => boolean; addImage: (id: string, image: ImageBitmap | HTMLImageElement, options?: { sdf?: boolean; pixelRatio?: number }) => void },
): Promise<void> {
  const urls = allPinIconDataUrls();

  await Promise.all(
    Object.entries(urls).map(async ([status, url]) => {
      const imageId = `pin-${status}`;
      if (map.hasImage(imageId)) return;

      try {
        const { data } = await map.loadImage(url);
        if (!map.hasImage(imageId)) {
          map.addImage(imageId, data, { pixelRatio: 2 });
        }
      } catch (err) {
        console.warn(`Failed to load pin icon for ${status}:`, err);
      }
    }),
  );
}

/** Pin anchor point (fraction of image size, for MapLibre icon-anchor) */
export const PIN_ANCHOR: [number, number] = [0.5, 1.0];

/** Pin size relative to original SVG (for icon-size property) */
export const PIN_ICON_SIZE = 0.85;
