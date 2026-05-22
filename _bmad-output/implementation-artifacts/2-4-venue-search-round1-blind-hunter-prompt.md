# Story 2.4 Round 1 Blind Hunter Prompt

You are the Blind Hunter. Review only the unified diff below. Do not use project files, story specs, prior context, or external documentation.

Focus: bugs, regressions, broken assumptions, missing edge handling, accessibility failures visible from the diff, test holes, and suspicious implementation choices.

Output findings as a Markdown list. Each finding must include: severity, one-line title, file/line evidence from the diff, and why it matters. If no findings, say so explicitly.

``diff

diff --git a/.claude/scripts/visual-validate.sh b/.claude/scripts/visual-validate.sh
index cadeb99..224b6b2 100644
--- a/.claude/scripts/visual-validate.sh
+++ b/.claude/scripts/visual-validate.sh
@@ -80,6 +80,13 @@ case "$SCREEN_ID" in
   map-with-selected-venue)
     WAIT_ARGS+=(--wait-for-selector '[data-testid="venue-quick-info"]' --wait-for-timeout 500)
     ;;
+  venue-detail)
+    if [ "$VIEWPORT_TYPE" = "desktop" ]; then
+      WAIT_ARGS+=(--wait-for-selector '[data-testid="desktop-venue-detail-panel"]' --wait-for-timeout 500)
+    else
+      WAIT_ARGS+=(--wait-for-selector '[data-testid="mobile-venue-detail-sheet"]' --wait-for-timeout 500)
+    fi
+    ;;
   map-*)
     WAIT_ARGS+=(--wait-for-selector '[data-testid="venue-pin"]' --wait-for-timeout 500)
     ;;
diff --git a/.codex/config.toml b/.codex/config.toml
index ab0448c..24aa12a 100644
--- a/.codex/config.toml
+++ b/.codex/config.toml
@@ -3,6 +3,8 @@

 model_reasoning_effort = "medium"

+approval_policy = "never"
+sandbox_mode = "workspace-write"
 [features]
 # Hook support is intentionally conservative; see .codex/hooks.json and
 # CODEX_MIGRATION_NOTES.md for the manual verification still required.
@@ -10,3 +12,6 @@ codex_hooks = true

 [shell_environment_policy]
 inherit = "core"
+
+[sandbox_workspace_write]
+network_access = true
diff --git a/nextjs-app/app/api/venues/route.ts b/nextjs-app/app/api/venues/route.ts
index a3c25bf..fecc7ac 100644
--- a/nextjs-app/app/api/venues/route.ts
+++ b/nextjs-app/app/api/venues/route.ts
@@ -23,6 +23,7 @@ import type { GetVenuesResponse, VenueDataDto } from '@/lib/types/api';
 const DEFAULT_RADIUS_KM = 1.5;
 const MAX_RADIUS_KM = 3.0;
 const MAX_RESULTS = 50;
+const MAX_QUERY_LENGTH = 80;
 const RATE_LIMIT_WINDOW_MS = 60_000;
 const RATE_LIMIT_MAX_REQUESTS = 120;
 const COORDINATE_COLLISION_PRECISION = 6;
@@ -31,6 +32,8 @@ const RATE_LIMIT_SWEEP_INTERVAL_MS = RATE_LIMIT_WINDOW_MS;
 const TIME_WINDOW_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
 const MAX_THUMBNAIL_ALT_LENGTH = 120;
 const MAX_THUMBNAIL_INITIALS_LENGTH = 3;
+const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/u;
+const DIACRITIC_PATTERN = /[\u0300-\u036f]/gu;
 let lastRateLimitSweepAt = 0;

 const SUN_STATUS_ORDER: Record<VenueDataDto['currentSunStatus'], number> = {
@@ -59,6 +62,25 @@ function parseStrictNumber(
   return { success: true, value: parsed };
 }

+function parseSearchQuery(
+  params: URLSearchParams,
+): { success: true; value: string | undefined } | { success: false; error: string } {
+  const values = params.getAll('q');
+  if (values.length > 1) {
+    return { success: false, error: 'Use a single canonical q parameter' };
+  }
+  const raw = values[0];
+  if (raw === undefined) return { success: true, value: undefined };
+  if (Array.from(raw).length > MAX_QUERY_LENGTH) {
+    return { success: false, error: `q must be at most ${MAX_QUERY_LENGTH} characters` };
+  }
+  if (CONTROL_CHARACTER_PATTERN.test(raw)) {
+    return { success: false, error: 'q contains invalid control characters' };
+  }
+  const trimmed = raw.trim();
+  return { success: true, value: trimmed || undefined };
+}
+
 type RateLimitBucket = {
   count: number;
   resetAt: number;
@@ -237,12 +259,16 @@ export async function GET(request: NextRequest) {
     return badRequest(`Radius must be greater than 0 and at most ${MAX_RADIUS_KM} km`);
   }

+  const q = parseSearchQuery(params);
+  if (!q.success) return badRequest(q.error);
+
   const matchedVenues = VENUE_FIXTURE
     .map((v) => ({
       ...normalizeVenueForResponse(v),
       distanceMeters: greatCircleMeters(lat.value, lng.value, v.location.lat, v.location.lng),
     }))
-    .filter((v) => v.distanceMeters <= radiusKm * 1000);
+    .filter((v) => v.distanceMeters <= radiusKm * 1000)
+    .filter((v) => matchesVenueQuery(v, q.value));

   const totalCount = matchedVenues.length;

@@ -287,6 +313,26 @@ export async function GET(request: NextRequest) {
   });
 }

+function matchesVenueQuery(venue: VenueDataDto, q: string | undefined): boolean {
+  if (!q) return true;
+  const terms = normalizeSearchText(q).split(/\s+/).filter(Boolean);
+  if (terms.length === 0) return true;
+  const searchable = normalizeSearchText([
+    venue.venueName,
+    venue.neighborhood,
+    venue.venueSlug,
+    venue.slug,
+  ].join(' '));
+  return terms.every((term) => searchable.includes(term));
+}
+
+function normalizeSearchText(value: string): string {
+  return value
+    .normalize('NFD')
+    .replace(DIACRITIC_PATTERN, '')
+    .toLocaleLowerCase('sv-SE');
+}
+
 function greatCircleMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
   const earthRadiusMeters = 6_371_000;
   const toRad = (deg: number) => (deg * Math.PI) / 180;
diff --git a/nextjs-app/components/custom/layout/DesktopNavBar.tsx b/nextjs-app/components/custom/layout/DesktopNavBar.tsx
index 5f8b66e..597b292 100644
--- a/nextjs-app/components/custom/layout/DesktopNavBar.tsx
+++ b/nextjs-app/components/custom/layout/DesktopNavBar.tsx
@@ -1,17 +1,15 @@
 'use client';

 import { useTranslations } from 'next-intl';
+import { LocateFixed, Settings, SlidersHorizontal } from 'lucide-react';
+import type { ReactNode } from 'react';
 import { Link } from '@/i18n/navigation';
+import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';

 /**
- * Desktop top navigation (viewport ≥ 1024 px). 84 px tall, holds the
- * SunnySeat wordmark and a visual placeholder for the search combobox.
- *
- * The search placeholder is a plain `<div>` — not `role="search"` and
- * not an `<input>`. A real search landmark without a focusable input
- * misleads assistive tech (VoiceOver rotor sends users here expecting
- * to type). Story 2.4 replaces this stub with a real cmdk combobox and
- * re-introduces the landmark then.
+ * Desktop top navigation (viewport >= 1024 px). 84 px tall, holds the
+ * SunnySeat wordmark, the Story 2.4 venue search combobox, and inert
+ * accessible chrome buttons that match the accepted desktop header.
  *
  * Visibility is controlled by `hidden lg:flex` so both navbars render
  * in SSR and CSS picks the correct one before any JS runs.
@@ -33,12 +31,37 @@ export function DesktopNavBar() {
         sunnyseat
       </Link>

-      <div
-        data-testid="desktop-nav-search-placeholder"
-        className="bg-surface-muted rounded-pill px-8 py-4 text-body-sm text-text-body w-[384px]"
-      >
-        <span>{t('nav.searchPlaceholder')}</span>
+      <VenueSearchShell variant="desktop" />
+
+      <div className="ml-auto flex items-center gap-2">
+        <HeaderIconButton label={t('nav.filter')}>
+          <SlidersHorizontal aria-hidden="true" className="size-5" />
+        </HeaderIconButton>
+        <HeaderIconButton label={t('nav.myLocation')}>
+          <LocateFixed aria-hidden="true" className="size-5" />
+        </HeaderIconButton>
+        <HeaderIconButton label={t('nav.settings')}>
+          <Settings aria-hidden="true" className="size-5" />
+        </HeaderIconButton>
       </div>
     </header>
   );
 }
+
+function HeaderIconButton({
+  label,
+  children,
+}: {
+  label: string;
+  children: ReactNode;
+}) {
+  return (
+    <button
+      type="button"
+      aria-label={label}
+      className="flex size-11 items-center justify-center rounded-pill text-text-body outline-none transition-colors duration-fast ease-default hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-text-primary"
+    >
+      {children}
+    </button>
+  );
+}
diff --git a/nextjs-app/components/custom/map/MapView.tsx b/nextjs-app/components/custom/map/MapView.tsx
index 8811a44..695d85f 100644
--- a/nextjs-app/components/custom/map/MapView.tsx
+++ b/nextjs-app/components/custom/map/MapView.tsx
@@ -13,6 +13,8 @@ import {
   type MobileBottomSheetState,
 } from '@/components/custom/sheets/MobileBottomSheet';
 import { VenueDetailOverlay } from '@/components/custom/venue/VenueDetailOverlay';
+import { VenueListControls, type VenueListSortMode } from '@/components/composed/venue/VenueListControls';
+import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';
 import {
   currentTimeLabel,
   resolveForcedVisualVenueDetail,
@@ -87,6 +89,7 @@ export function MapView() {
     useState<VenueQuickInfoDesktopPlacement>('above');
   const [mobileSheetState, setMobileSheetState] =
     useState<MobileBottomSheetState>('peek');
+  const [venueSortMode, setVenueSortMode] = useState<VenueListSortMode>('sun');
   const venueQuery = useVenueSearch({
     lat: geolocation.coords.lat,
     lng: geolocation.coords.lng,
@@ -307,6 +310,10 @@ export function MapView() {
     <div className="relative h-dvh lg:h-[calc(100dvh-var(--size-desktop-nav-h))] w-full">
       <MapContainer />
       <VenuePinLayer venues={venues} />
+      <VenueSearchShell
+        variant="mobile"
+        className="absolute left-4 right-4 top-4 z-glass-panel"
+      />
       <MobileBottomSheet
         state={mobileSheetState}
         onStateChange={setMobileSheetState}
@@ -320,9 +327,16 @@ export function MapView() {
             {tVenueList('subtitle', { count: sunnyVenueCount })}
           </p>
         </div>
+        <VenueListControls
+          mode="mobile"
+          sortMode={venueSortMode}
+          onSortModeChange={setVenueSortMode}
+          labels={venueListControlLabels(tVenueList)}
+        />
         <VenueList
           venues={listVenues}
           mode="mobile"
+          sortMode={venueSortMode}
           isLoading={venueQuery.isFetching && listVenues.length === 0}
           animateCards={mobileSheetState === 'full'}
           onSelectVenue={handleSelectVenueFromList}
@@ -340,10 +354,17 @@ export function MapView() {
             {tVenueList('subtitle', { count: sunnyVenueCount })}
           </p>
         </div>
+        <VenueListControls
+          mode="desktop"
+          sortMode={venueSortMode}
+          onSortModeChange={setVenueSortMode}
+          labels={venueListControlLabels(tVenueList)}
+        />
         <div className="min-h-0 flex-1 overflow-y-auto p-2">
           <VenueList
             venues={listVenues}
             mode="desktop"
+            sortMode={venueSortMode}
             isLoading={venueQuery.isFetching && listVenues.length === 0}
             onSelectVenue={handleSelectVenueFromList}
           />
@@ -378,7 +399,7 @@ export function MapView() {
             routeDisabled
           />
         )}
-        {selectedPinData && (
+        {selectedPinData && !isVenueDetailRequested && (
           <VenueQuickInfo
             key="quick-info-mobile"
             mode="mobile"
@@ -394,7 +415,7 @@ export function MapView() {
             labels={quickInfoLabels(tVenue)}
           />
         )}
-        {selectedPinData && (
+        {selectedPinData && !isVenueDetailRequested && (
           <VenueQuickInfo
             key="quick-info-desktop"
             mode="desktop"
@@ -523,6 +544,19 @@ function venueDetailLabels(t: ReturnType<typeof useTranslations<'venue.detail'>>
   };
 }

+function venueListControlLabels(t: ReturnType<typeof useTranslations<'venue.list'>>) {
+  return {
+    nearTab: t('controls.nearTab'),
+    favouritesTab: t('controls.favouritesTab'),
+    topPicks: t('controls.topPicks'),
+    sortBySun: t('controls.sortBySun'),
+    sortByDistance: t('controls.sortByDistance'),
+    categoryCafe: t('controls.categoryCafe'),
+    openNow: t('controls.openNow'),
+    unavailable: t('controls.unavailable'),
+  };
+}
+
 type LoadingPillProps = {
   isFetching: boolean;
   dataUpdatedAt: number;
diff --git a/nextjs-app/components/custom/onboarding/OnboardingGate.tsx b/nextjs-app/components/custom/onboarding/OnboardingGate.tsx
index 35cb094..111e995 100644
--- a/nextjs-app/components/custom/onboarding/OnboardingGate.tsx
+++ b/nextjs-app/components/custom/onboarding/OnboardingGate.tsx
@@ -57,19 +57,18 @@ function OnboardingGateInner() {
   const isForced = forcedState === 'onboarding';
   const { mapInstance } = useMapInstance();

-  // Lazy initialiser keeps the first client render synchronous so the
-  // overlay paints immediately (no post-mount delay that could leak
-  // through to a slow-Playwright screenshot or a low-end device's
-  // first frame). On the server `typeof window === 'undefined'` →
-  // `readFlag()` returns false → `hasOnboarded=false`, which combined
-  // with no forced URL produces an SSR-safe `null` from this gate
-  // until hydration corrects it.
-  const [hasOnboarded, setHasOnboarded] = useState(() => readFlag());
+  // The server cannot read localStorage, so render nothing until the
+  // first client effect reads the flag. Otherwise returning-user visual
+  // captures render the onboarding screen on the server, remove it on
+  // the client, and trigger a hydration overlay in development.
+  const [hasHydrated, setHasHydrated] = useState(false);
+  const [hasOnboarded, setHasOnboarded] = useState(false);
   const [dismissed, setDismissed] = useState(false);
   const [pendingFly, setPendingFly] = useState<{ lat: number; lng: number } | null>(null);

   useEffect(() => {
     setHasOnboarded(readFlag());
+    setHasHydrated(true);
   }, []);

   // Defer the map flyTo until both the granted coords and the map
@@ -123,7 +122,7 @@ function OnboardingGateInner() {
     setPendingFly(null);
   }, []);

-  const shouldShow = !dismissed && (isForced || !hasOnboarded);
+  const shouldShow = hasHydrated && !dismissed && (isForced || !hasOnboarded);
   if (!shouldShow) return null;

   return (
diff --git a/nextjs-app/components/custom/venue/VenueList.tsx b/nextjs-app/components/custom/venue/VenueList.tsx
index 1dfa198..84f5643 100644
--- a/nextjs-app/components/custom/venue/VenueList.tsx
+++ b/nextjs-app/components/custom/venue/VenueList.tsx
@@ -3,6 +3,7 @@
 import { useMemo } from 'react';
 import { useTranslations } from 'next-intl';
 import { VenueCard, VenueCardSkeleton } from '@/components/composed/venue/VenueCard';
+import type { VenueListSortMode } from '@/components/composed/venue/VenueListControls';
 import type { VenueDataDto } from '@/lib/types/api';
 import { cn } from '@/lib/utils';

@@ -14,6 +15,7 @@ export type VenueListProps = {
   onSelectVenue: (venue: VenueDataDto) => void;
   isLoading?: boolean;
   animateCards?: boolean;
+  sortMode?: VenueListSortMode;
 };

 export function VenueList({
@@ -22,9 +24,10 @@ export function VenueList({
   onSelectVenue,
   isLoading = false,
   animateCards = false,
+  sortMode = 'sun',
 }: VenueListProps) {
   const t = useTranslations('venue.list');
-  const sortedVenues = useMemo(() => sortVenuesForSunList(venues), [venues]);
+  const sortedVenues = useMemo(() => sortVenuesForList(venues, sortMode), [venues, sortMode]);
   const compact = mode === 'desktop';

   if (isLoading) {
@@ -88,7 +91,18 @@ export function VenueList({
 }

 export function sortVenuesForSunList(venues: VenueDataDto[]): VenueDataDto[] {
+  return sortVenuesForList(venues, 'sun');
+}
+
+export function sortVenuesForList(
+  venues: VenueDataDto[],
+  sortMode: VenueListSortMode,
+): VenueDataDto[] {
   return [...venues].sort((a, b) => {
+    if (sortMode === 'distance') {
+      return (a.distanceMeters ?? Number.POSITIVE_INFINITY) -
+        (b.distanceMeters ?? Number.POSITIVE_INFINITY);
+    }
     const sunDelta = Number(isVenueSunnyForList(b)) - Number(isVenueSunnyForList(a));
     if (sunDelta !== 0) return sunDelta;
     return (a.distanceMeters ?? Number.POSITIVE_INFINITY) -
diff --git a/nextjs-app/hooks/queries/useVenueSearch.ts b/nextjs-app/hooks/queries/useVenueSearch.ts
index fc82cca..cca0093 100644
--- a/nextjs-app/hooks/queries/useVenueSearch.ts
+++ b/nextjs-app/hooks/queries/useVenueSearch.ts
@@ -13,6 +13,7 @@ type Params = {
   lat: number;
   lng: number;
   radiusKm?: number;
+  q?: string;
 };

 // Round coordinates to 4 decimals (~11 m at Gothenburg's latitude — well
@@ -52,10 +53,17 @@ export function useVenueSearch(
   const inputsValid = Number.isFinite(params.lat) && Number.isFinite(params.lng);
   const lat = inputsValid ? bucket(params.lat) : 0;
   const lng = inputsValid ? bucket(params.lng) : 0;
+  const q = normalizeTextQuery(params.q);
   return useQuery<GetVenuesResponse, Error>({
-    queryKey: queryKeys.venues.list({ lat, lng, radiusKm }),
+    queryKey: queryKeys.venues.list({ lat, lng, q, radiusKm }),
     queryFn: async ({ signal }) => {
-      const url = `/api/venues?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`;
+      const searchParams = new URLSearchParams({
+        lat: String(lat),
+        lng: String(lng),
+        radiusKm: String(radiusKm),
+      });
+      if (q) searchParams.set('q', q);
+      const url = `/api/venues?${searchParams.toString()}`;
       const res = await fetch(url, { signal });
       if (!res.ok) {
         throw new Error(`Venue search failed: ${res.status} ${res.statusText}`);
@@ -75,3 +83,8 @@ export function useVenueSearch(
     enabled: inputsValid,
   });
 }
+
+function normalizeTextQuery(value: string | undefined): string | undefined {
+  const trimmed = value?.trim();
+  return trimmed ? trimmed : undefined;
+}
diff --git a/nextjs-app/lib/query-keys.ts b/nextjs-app/lib/query-keys.ts
index f784095..55ac688 100644
--- a/nextjs-app/lib/query-keys.ts
+++ b/nextjs-app/lib/query-keys.ts
@@ -5,8 +5,12 @@
 export const queryKeys = {
   venues: {
     all: ['venues'] as const,
-    list: (filters?: Record<string, unknown>) =>
-      [...queryKeys.venues.all, 'list', filters] as const,
+    list: (filters?: Record<string, unknown>) => {
+      const normalized = normalizeQueryFilters(filters);
+      return normalized === undefined
+        ? [...queryKeys.venues.all, 'list'] as const
+        : [...queryKeys.venues.all, 'list', normalized] as const;
+    },
     detail: (slug: string) =>
       [...queryKeys.venues.all, 'detail', slug] as const,
     search: (query: string) =>
@@ -26,3 +30,26 @@ export const queryKeys = {
     status: () => [...queryKeys.premium.all, 'status'] as const,
   },
 } as const;
+
+function normalizeQueryFilters(value: unknown): unknown {
+  if (value === undefined) return undefined;
+  if (Array.isArray(value)) {
+    return value
+      .map((item) => normalizeQueryFilters(item))
+      .filter((item) => item !== undefined);
+  }
+  if (!isPlainObject(value)) return value;
+
+  const normalized: Record<string, unknown> = {};
+  for (const key of Object.keys(value).sort()) {
+    const child = normalizeQueryFilters(value[key]);
+    if (child !== undefined) normalized[key] = child;
+  }
+  return normalized;
+}
+
+function isPlainObject(value: unknown): value is Record<string, unknown> {
+  if (value === null || typeof value !== 'object') return false;
+  const prototype = Object.getPrototypeOf(value);
+  return prototype === Object.prototype || prototype === null;
+}
diff --git a/nextjs-app/messages/en/common.json b/nextjs-app/messages/en/common.json
index 898b171..a21fd6c 100644
--- a/nextjs-app/messages/en/common.json
+++ b/nextjs-app/messages/en/common.json
@@ -10,6 +10,9 @@
     "favoriter": "Favourites",
     "om": "About",
     "logoAria": "SunnySeat — go to map",
-    "searchPlaceholder": "Search a place or address"
+    "searchPlaceholder": "Search place or area in Gothenburg...",
+    "filter": "Filter",
+    "myLocation": "My location",
+    "settings": "Settings"
   }
 }
diff --git a/nextjs-app/messages/en/venue.json b/nextjs-app/messages/en/venue.json
index cdc6a29..6a02244 100644
--- a/nextjs-app/messages/en/venue.json
+++ b/nextjs-app/messages/en/venue.json
@@ -1,4 +1,13 @@
 {
+  "search": {
+    "label": "Search venue",
+    "placeholder": "Search place or area in Gothenburg...",
+    "clear": "Clear search",
+    "loading": "Searching places",
+    "noResults": "No results for \"{query}\"",
+    "resultCount": "{count, plural, one {# result} other {# results}}",
+    "settings": "Settings"
+  },
   "quickInfo": {
     "route": "Show Route",
     "moreInfo": "More Info",
@@ -21,7 +30,17 @@
     "confidence": "Confidence",
     "distance": "Distance",
     "sunUnavailable": "Sun time unavailable",
-    "cardAria": "Select {name}, {sun}, Confidence {confidence}%, Distance {distance}"
+    "cardAria": "Select {name}, {sun}, Confidence {confidence}%, Distance {distance}",
+    "controls": {
+      "nearTab": "Near me",
+      "favouritesTab": "Favourites",
+      "topPicks": "Top picks near you",
+      "sortBySun": "Most sun",
+      "sortByDistance": "Closest",
+      "categoryCafe": "Cafe",
+      "openNow": "Open now",
+      "unavailable": "Coming later"
+    }
   },
   "detail": {
     "sectionTitle": "SUN TIMES TODAY",
diff --git a/nextjs-app/messages/sv/common.json b/nextjs-app/messages/sv/common.json
index c5a8e52..6629de9 100644
--- a/nextjs-app/messages/sv/common.json
+++ b/nextjs-app/messages/sv/common.json
@@ -10,6 +10,9 @@
     "favoriter": "Favoriter",
     "om": "Om",
     "logoAria": "SunnySeat — gå till kartan",
-    "searchPlaceholder": "Sök plats eller adress"
+    "searchPlaceholder": "Sök plats eller område i Göteborg...",
+    "filter": "Filter",
+    "myLocation": "Min plats",
+    "settings": "Inställningar"
   }
 }
diff --git a/nextjs-app/messages/sv/venue.json b/nextjs-app/messages/sv/venue.json
index 155695c..3b4dac3 100644
--- a/nextjs-app/messages/sv/venue.json
+++ b/nextjs-app/messages/sv/venue.json
@@ -1,4 +1,13 @@
 {
+  "search": {
+    "label": "Sök plats",
+    "placeholder": "Sök plats eller område i Göteborg...",
+    "clear": "Rensa sökning",
+    "loading": "Söker platser",
+    "noResults": "Inga resultat för \"{query}\"",
+    "resultCount": "{count, plural, one {# resultat} other {# resultat}}",
+    "settings": "Inställningar"
+  },
   "quickInfo": {
     "route": "Visa Rutt",
     "moreInfo": "Mer Info",
@@ -21,7 +30,17 @@
     "confidence": "Säkerhet",
     "distance": "Avstånd",
     "sunUnavailable": "Soltid saknas",
-    "cardAria": "Välj {name}, {sun}, Säkerhet {confidence}%, Avstånd {distance}"
+    "cardAria": "Välj {name}, {sun}, Säkerhet {confidence}%, Avstånd {distance}",
+    "controls": {
+      "nearTab": "Nära mig",
+      "favouritesTab": "Favoriter",
+      "topPicks": "Toppval nära dig",
+      "sortBySun": "Mest sol",
+      "sortByDistance": "Närmast",
+      "categoryCafe": "Kafé",
+      "openNow": "Öppet nu",
+      "unavailable": "Kommer senare"
+    }
   },
   "detail": {
     "sectionTitle": "SOLTIDER IDAG",
diff --git a/nextjs-app/test/components/DesktopNavBar.test.tsx b/nextjs-app/test/components/DesktopNavBar.test.tsx
index 3801d9f..38a43ac 100644
--- a/nextjs-app/test/components/DesktopNavBar.test.tsx
+++ b/nextjs-app/test/components/DesktopNavBar.test.tsx
@@ -1,8 +1,52 @@
-import { describe, it, expect, vi } from 'vitest';
-import { screen } from '@testing-library/react';
+import { describe, it, expect, vi, beforeEach } from 'vitest';
+import { fireEvent, screen, waitFor } from '@testing-library/react';
 import type { AnchorHTMLAttributes } from 'react';
 import { renderWithProviders } from '@/test/setup/test-utils';
 import { DesktopNavBar } from '@/components/custom/layout/DesktopNavBar';
+import type { GetVenuesResponse } from '@/lib/types/api';
+
+const mockState = vi.hoisted(() => ({
+  selectVenue: vi.fn(),
+  easeTo: vi.fn(),
+}));
+
+vi.mock('@/hooks/useGeolocation', async (importOriginal) => {
+  const actual = await importOriginal<typeof import('@/hooks/useGeolocation')>();
+  return {
+    ...actual,
+    useGeolocation: () => ({
+    status: 'idle',
+    coords: { lat: 57.7089, lng: 11.9746 },
+    requestLocation: () => {},
+    useCentrum: () => {},
+    }),
+  };
+});
+
+vi.mock('@/hooks/queries/useVenueSearch', () => ({
+  useVenueSearch: () => ({
+    data: makeVenueResponse(),
+    isFetching: false,
+    isError: false,
+    dataUpdatedAt: 1,
+  }),
+}));
+
+vi.mock('@/lib/contexts/MapSelectionContext', () => ({
+  useMapSelection: () => ({
+    selectedVenueId: null,
+    selectVenue: mockState.selectVenue,
+    toggleVenue: () => {},
+  }),
+}));
+
+vi.mock('@/lib/contexts/MapInstanceContext', () => ({
+  useMapInstance: () => ({
+    mapRef: { current: null },
+    mapInstance: { easeTo: mockState.easeTo },
+    setMapInstance: () => {},
+  }),
+}));

 vi.mock('next-intl/navigation', () => ({
   createNavigation: () => ({
@@ -27,12 +71,31 @@ const NAV_MESSAGES = {
       favoriter: 'Favoriter',
       om: 'Om',
       logoAria: 'SunnySeat — gå till kartan',
-      searchPlaceholder: 'Sök plats eller adress',
+      searchPlaceholder: 'Sök plats eller område i Göteborg...',
+      filter: 'Filter',
+      myLocation: 'Min plats',
+      settings: 'Inställningar',
+    },
+  },
+  venue: {
+    search: {
+      label: 'Sök plats',
+      placeholder: 'Sök plats eller område i Göteborg...',
+      clear: 'Rensa sökning',
+      loading: 'Söker platser',
+      noResults: 'Inga resultat för "{query}"',
+      resultCount: '{count, plural, one {# resultat} other {# resultat}}',
+      settings: 'Inställningar',
     },
   },
 };

 describe('DesktopNavBar', () => {
+  beforeEach(() => {
+    mockState.selectVenue.mockClear();
+    mockState.easeTo.mockClear();
+  });
+
   it('renders the SunnySeat wordmark inside a link to /', () => {
     renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

@@ -43,27 +106,31 @@ describe('DesktopNavBar', () => {
     expect(logo).toHaveTextContent('sunnyseat');
   });

-  it('renders the search placeholder as plain text without the search landmark', () => {
+  it('renders the search combobox in the desktop navbar', () => {
     renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

-    const placeholder = screen.getByTestId('desktop-nav-search-placeholder');
-    expect(placeholder).toHaveTextContent('Sök plats eller adress');
-    // Stub placeholder must not advertise itself as a search landmark — an
-    // inert landmark misleads assistive tech. Story 2.4 adds the real combobox.
-    expect(placeholder).not.toHaveAttribute('role', 'search');
-    expect(placeholder).not.toHaveAttribute('aria-label');
+    const search = screen.getByRole('combobox', { name: 'Sök plats' });
+    expect(search).toHaveAttribute('placeholder', 'Sök plats eller område i Göteborg...');
+    expect(screen.getByRole('search', { name: 'Sök plats' })).toBeInTheDocument();
   });

-  it('does not render a real <input> or searchbox inside the placeholder', () => {
+  it('supports keyboard focus and selection from the navbar searchbox', async () => {
     renderWithProviders(<DesktopNavBar />, { messages: NAV_MESSAGES });

-    expect(screen.queryByRole('searchbox')).toBeNull();
-    expect(screen.queryByRole('search')).toBeNull();
-    expect(
-      screen
-        .getByTestId('desktop-nav-search-placeholder')
-        .querySelector('input'),
-    ).toBeNull();
+    const search = screen.getByRole('combobox', { name: 'Sök plats' });
+    fireEvent.focus(search);
+    fireEvent.change(search, { target: { value: 'magasinet' } });
+    await screen.findByRole('option', { name: /Kafé Magasinet/ });
+    fireEvent.keyDown(search, { key: 'ArrowDown' });
+    fireEvent.keyDown(search, { key: 'Enter' });
+
+    expect(mockState.selectVenue).toHaveBeenCalledWith('venue-1');
+    expect(mockState.easeTo).toHaveBeenCalledWith({
+      center: [11.97, 57.7],
+      duration: 500,
+    });
+    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
+    expect(search).not.toHaveFocus();
   });

   it('labels the outer <header> with the Swedish header aria-label', () => {
@@ -75,3 +142,29 @@ describe('DesktopNavBar', () => {
     );
   });
 });
+
+function makeVenueResponse(): GetVenuesResponse {
+  return {
+    venues: [
+      {
+        id: 'venue-1',
+        venueId: 'venue-1',
+        venueName: 'Kafé Magasinet',
+        venueSlug: 'test-venue-sunny',
+        slug: 'test-venue-sunny',
+        neighborhood: 'Inom Vallgraven',
+        location: { lat: 57.7, lng: 11.97 },
+        currentSunStatus: 'Sunny',
+        isPartner: false,
+        confidence: 92,
+        distanceMeters: 180,
+        sunExposurePercent: 95,
+        sunWindow: { start: '13:00', end: '18:30' },
+        thumbnail: { alt: 'Kafé Magasinet uteservering', initials: 'KM' },
+      },
+    ],
+    meta: { count: 1, radiusKm: 1.5 },
+    timestamp: 'now',
+    totalCount: 1,
+  };
+}
diff --git a/nextjs-app/test/components/MapView.test.tsx b/nextjs-app/test/components/MapView.test.tsx
index a6a24e0..1ec5536 100644
--- a/nextjs-app/test/components/MapView.test.tsx
+++ b/nextjs-app/test/components/MapView.test.tsx
@@ -1,8 +1,9 @@
 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
-import { act, fireEvent, render, screen } from '@testing-library/react';
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
 import type { ReactNode } from 'react';
 import type maplibregl from 'maplibre-gl';
 import { NextIntlClientProvider } from 'next-intl';
+import commonMessages from '@/messages/sv/common.json';
 import mapMessages from '@/messages/sv/map.json';
 import venueMessages from '@/messages/sv/venue.json';
 import type { GetVenueDetailResponse, GetVenuesResponse } from '@/lib/types/api';
@@ -13,6 +14,12 @@ type VenueQueryShape = {
   isError: boolean;
   dataUpdatedAt: number;
 };
+type VenueSearchParams = {
+  lat: number;
+  lng: number;
+  radiusKm?: number;
+  q?: string;
+};

 const useGeolocationMock = vi.fn(() => ({
   status: 'idle' as const,
@@ -21,7 +28,7 @@ const useGeolocationMock = vi.fn(() => ({
   useCentrum: () => {},
 }));

-const useVenueSearchMock = vi.fn<() => VenueQueryShape>(() => ({
+const useVenueSearchMock = vi.fn<(params?: VenueSearchParams) => VenueQueryShape>(() => ({
   data: undefined,
   isFetching: false,
   isError: false,
@@ -97,7 +104,7 @@ vi.mock('@/hooks/useGeolocation', () => ({
 }));

 vi.mock('@/hooks/queries/useVenueSearch', () => ({
-  useVenueSearch: () => useVenueSearchMock(),
+  useVenueSearch: (params?: VenueSearchParams) => useVenueSearchMock(params),
 }));

 vi.mock('@/hooks/queries/useVenueDetail', () => ({
@@ -146,7 +153,10 @@ import { MapView } from '@/components/custom/map/MapView';

 function Wrapper({ children }: { children: ReactNode }) {
   return (
-    <NextIntlClientProvider locale="sv" messages={{ map: mapMessages, venue: venueMessages }}>
+    <NextIntlClientProvider
+      locale="sv"
+      messages={{ common: commonMessages, map: mapMessages, venue: venueMessages }}
+    >
       {children}
     </NextIntlClientProvider>
   );
@@ -480,6 +490,7 @@ describe('<MapView />', () => {
       rerender(<MapView />);
       expect(screen.getByTestId('mobile-venue-detail-sheet')).toBeInTheDocument();
       expect(screen.getByTestId('desktop-venue-detail-panel')).toBeInTheDocument();
+      expect(screen.queryByTestId('venue-quick-info')).not.toBeInTheDocument();
     });

     it('renders seeded forced venue detail before list and detail data resolve', () => {
@@ -648,6 +659,51 @@ describe('<MapView />', () => {
       expect(screen.getByTestId('map-container-stub')).toBeInTheDocument();
     });

+    it('selects a venue from mobile search, recenters the map, closes results, and blurs the input', async () => {
+      useVenueSearchMock.mockImplementation((params?: VenueSearchParams) => ({
+        data: makeVenueResponse([
+          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
+        ]),
+        isFetching: Boolean(params?.q) && false,
+        isError: false,
+        dataUpdatedAt: 1,
+      }));
+
+      render(<MapView />, { wrapper: Wrapper });
+      const input = screen.getByRole('combobox', { name: 'Sök plats' });
+      fireEvent.focus(input);
+      fireEvent.change(input, { target: { value: 'magasinet' } });
+      fireEvent.click(await screen.findByRole('option', { name: /Kafé Magasinet/ }));
+
+      expect(selectVenueMock).toHaveBeenCalledWith('venue-1');
+      expect(stubMap.easeTo).toHaveBeenCalledWith({
+        center: [11.97, 57.7],
+        duration: 500,
+      });
+      await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
+      expect(input).not.toHaveFocus();
+    });
+
+    it('does not mutate map selection when mobile search has no results', () => {
+      useVenueSearchMock.mockImplementation((params?: VenueSearchParams) => ({
+        data: makeVenueResponse(params?.q ? [] : [
+          makeVenue({ id: 'venue-1', name: 'Kafé Magasinet', slug: 'test-venue-sunny' }),
+        ]),
+        isFetching: false,
+        isError: false,
+        dataUpdatedAt: 1,
+      }));
+
+      render(<MapView />, { wrapper: Wrapper });
+      const input = screen.getByRole('combobox', { name: 'Sök plats' });
+      fireEvent.focus(input);
+      fireEvent.change(input, { target: { value: 'nope' } });
+
+      expect(screen.getByText('Inga resultat för "nope"')).toBeInTheDocument();
+      expect(selectVenueMock).not.toHaveBeenCalled();
+      expect(stubMap.easeTo).not.toHaveBeenCalled();
+    });
+
     it('filters invalid location rows out of the venue list before selection can recenter', () => {
       useVenueSearchMock.mockReturnValue({
         data: makeVenueResponse([
diff --git a/nextjs-app/test/components/OnboardingGate.test.tsx b/nextjs-app/test/components/OnboardingGate.test.tsx
index aeae8ea..d06700a 100644
--- a/nextjs-app/test/components/OnboardingGate.test.tsx
+++ b/nextjs-app/test/components/OnboardingGate.test.tsx
@@ -1,5 +1,5 @@
 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
-import { render, screen, fireEvent } from '@testing-library/react';
+import { render, screen, fireEvent, waitFor } from '@testing-library/react';
 import { OnboardingGateWithSuspense } from '@/components/custom/onboarding/OnboardingGate';
 import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

@@ -75,69 +75,69 @@ describe('<OnboardingGate />', () => {
     vi.restoreAllMocks();
   });

-  it('first visit (no flag, no _state): renders the onboarding screen', () => {
+  it('first visit (no flag, no _state): renders the onboarding screen', async () => {
     render(<OnboardingGateWithSuspense />);
-    expect(screen.getByTestId('onboarding-screen-stub')).toBeInTheDocument();
+    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
   });

-  it('returning user (flag set, no _state): renders nothing', () => {
+  it('returning user (flag set, no _state): renders nothing', async () => {
     store.set(ONBOARDED_FLAG_KEY, '1');
     render(<OnboardingGateWithSuspense />);
-    expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
+    await waitFor(() => expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull());
   });

-  it('forced state ("_state=onboarding") overrides the flag and renders the screen', () => {
+  it('forced state ("_state=onboarding") overrides the flag and renders the screen', async () => {
     store.set(ONBOARDED_FLAG_KEY, '1');
     useForcedStateMock.mockReturnValue('onboarding');
     render(<OnboardingGateWithSuspense />);
-    expect(screen.getByTestId('onboarding-screen-stub')).toBeInTheDocument();
+    expect(await screen.findByTestId('onboarding-screen-stub')).toBeInTheDocument();
   });

-  it('grant in the real flow writes the localStorage flag', () => {
+  it('grant in the real flow writes the localStorage flag', async () => {
     render(<OnboardingGateWithSuspense />);
-    fireEvent.click(screen.getByTestId('grant'));
+    fireEvent.click(await screen.findByTestId('grant'));
     expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
   });

-  it('deny in the real flow writes the localStorage flag', () => {
+  it('deny in the real flow writes the localStorage flag', async () => {
     render(<OnboardingGateWithSuspense />);
-    fireEvent.click(screen.getByTestId('deny'));
+    fireEvent.click(await screen.findByTestId('deny'));
     expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
   });

-  it('dismiss alone does NOT write the localStorage flag (decoupled from resolution)', () => {
+  it('dismiss alone does NOT write the localStorage flag (decoupled from resolution)', async () => {
     render(<OnboardingGateWithSuspense />);
-    fireEvent.click(screen.getByTestId('dismiss'));
+    fireEvent.click(await screen.findByTestId('dismiss'));
     expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
     expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
   });

-  it('grant + dismiss flow writes flag and unmounts the screen', () => {
+  it('grant + dismiss flow writes flag and unmounts the screen', async () => {
     render(<OnboardingGateWithSuspense />);
-    fireEvent.click(screen.getByTestId('grant'));
+    fireEvent.click(await screen.findByTestId('grant'));
     fireEvent.click(screen.getByTestId('dismiss'));
     expect(store.get(ONBOARDED_FLAG_KEY)).toBe('1');
     expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
   });

-  it('grant in the forced-state flow does NOT write the localStorage flag', () => {
+  it('grant in the forced-state flow does NOT write the localStorage flag', async () => {
     useForcedStateMock.mockReturnValue('onboarding');
     render(<OnboardingGateWithSuspense />);
-    fireEvent.click(screen.getByTestId('grant'));
+    fireEvent.click(await screen.findByTestId('grant'));
     expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
   });

-  it('deny in the forced-state flow does NOT write the localStorage flag', () => {
+  it('deny in the forced-state flow does NOT write the localStorage flag', async () => {
     useForcedStateMock.mockReturnValue('onboarding');
     render(<OnboardingGateWithSuspense />);
-    fireEvent.click(screen.getByTestId('deny'));
+    fireEvent.click(await screen.findByTestId('deny'));
     expect(store.get(ONBOARDED_FLAG_KEY)).toBeUndefined();
   });

-  it('a non-matching forced state does NOT show the screen for a returning user', () => {
+  it('a non-matching forced state does NOT show the screen for a returning user', async () => {
     store.set(ONBOARDED_FLAG_KEY, '1');
     useForcedStateMock.mockReturnValue('premium-paywall');
     render(<OnboardingGateWithSuspense />);
-    expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull();
+    await waitFor(() => expect(screen.queryByTestId('onboarding-screen-stub')).toBeNull());
   });
 });
diff --git a/nextjs-app/test/components/VenueList.test.tsx b/nextjs-app/test/components/VenueList.test.tsx
index 30faa33..5fb269a 100644
--- a/nextjs-app/test/components/VenueList.test.tsx
+++ b/nextjs-app/test/components/VenueList.test.tsx
@@ -2,6 +2,7 @@ import { fireEvent, render, screen } from '@testing-library/react';
 import { NextIntlClientProvider } from 'next-intl';
 import { describe, expect, it, vi } from 'vitest';
 import { VenueList } from '@/components/custom/venue/VenueList';
+import { VenueListControls } from '@/components/composed/venue/VenueListControls';
 import venueMessages from '@/messages/sv/venue.json';
 import type { VenueDataDto } from '@/lib/types/api';

@@ -52,6 +53,53 @@ describe('<VenueList />', () => {
     ]);
   });

+  it('sorts closest first when distance sort mode is selected explicitly', () => {
+    render(
+      <VenueList
+        venues={[
+          makeVenue({ id: 'sun-far', name: 'Sol Långt', status: 'Sunny', distanceMeters: 300 }),
+          makeVenue({ id: 'shaded-near', name: 'Skugga Nära', status: 'Shaded', distanceMeters: 50 }),
+          makeVenue({ id: 'partial-mid', name: 'Delvis Mitten', status: 'Partial', distanceMeters: 120 }),
+        ]}
+        mode="mobile"
+        sortMode="distance"
+        onSelectVenue={vi.fn()}
+      />,
+      { wrapper: Wrapper },
+    );
+
+    expect(screen.getAllByTestId('venue-card').map((card) => card.textContent)).toEqual([
+      expect.stringContaining('Skugga Nära'),
+      expect.stringContaining('Delvis Mitten'),
+      expect.stringContaining('Sol Långt'),
+    ]);
+  });
+
+  it('renders mobile discovery chips with unavailable future filters disabled', () => {
+    render(
+      <VenueListControls
+        mode="mobile"
+        sortMode="sun"
+        onSortModeChange={vi.fn()}
+        labels={{
+          nearTab: 'Nära mig',
+          favouritesTab: 'Favoriter',
+          topPicks: 'Toppval nära dig',
+          sortBySun: 'Mest sol',
+          sortByDistance: 'Nära mig',
+          categoryCafe: 'Kafé',
+          openNow: 'Öppet nu',
+          unavailable: 'Kommer senare',
+        }}
+      />,
+    );
+
+    expect(screen.getByRole('button', { name: 'Mest sol' })).toHaveAttribute('aria-pressed', 'true');
+    expect(screen.getByRole('button', { name: 'Nära mig' })).toHaveAttribute('aria-pressed', 'false');
+    expect(screen.getByRole('button', { name: 'Kafé, Kommer senare' })).toBeDisabled();
+    expect(screen.getByRole('button', { name: 'Öppet nu, Kommer senare' })).toBeDisabled();
+  });
+
   it('renders an empty state and calls selection with the selected DTO', () => {
     const onSelectVenue = vi.fn();
     const venue = makeVenue({ id: 'venue-1', name: 'Bellora', status: 'Sunny', distanceMeters: 90 });
diff --git a/nextjs-app/test/e2e/map-primary.spec.ts b/nextjs-app/test/e2e/map-primary.spec.ts
index 5eb58a0..462569d 100644
--- a/nextjs-app/test/e2e/map-primary.spec.ts
+++ b/nextjs-app/test/e2e/map-primary.spec.ts
@@ -117,6 +117,7 @@ test.describe('map-primary', () => {

     const quickInfo = page.getByTestId('venue-quick-info').first();
     await expect(quickInfo).toBeVisible();
+    await expect(page.getByRole('search', { name: /Sök plats|Search venue/ })).toBeVisible();
     await expect(quickInfo.getByRole('button', { name: /Kafé Magasinet/i })).toBeVisible();
     await expect(quickInfo.getByRole('button', { name: 'Visa Rutt' })).toBeVisible();

@@ -300,6 +301,25 @@ test.describe('map-primary', () => {
     await expect(page.getByTestId('venue-quick-info').last()).toBeVisible();
   });

+  test('desktop: navbar search selects a venue and opens QuickInfo without navigation', async ({
+    page,
+  }, testInfo) => {
+    test.skip(
+      testInfo.project.name !== 'desktop',
+      'Desktop search handoff runs only in the desktop Playwright project',
+    );
+
+    await bypassOnboarding(page);
+    await page.goto('/');
+    await page.waitForSelector('[data-testid="venue-pin"]', { timeout: 15000 });
+    const combobox = page.getByRole('combobox', { name: /Sök plats|Search venue/ });
+    await combobox.fill('magasinet');
+    await page.getByRole('option', { name: /Kafé Magasinet/i }).click();
+
+    await expect(page).not.toHaveURL(/venue=/);
+    await expect(page.getByTestId('venue-quick-info').last()).toBeVisible();
+  });
+
   test('mobile: pin morphs from pill to circle when selected (Story 1.4 AC3)', async ({
     page,
   }, testInfo) => {
@@ -371,7 +391,7 @@ test.describe('map-primary', () => {
     expect(canvasBox).not.toBeNull();
     if (!canvasBox) return;
     await canvas.click({
-      position: { x: 20, y: 20 },
+      position: { x: 20, y: 140 },
     });

     await expect(
diff --git a/nextjs-app/test/e2e/responsive-layout.spec.ts b/nextjs-app/test/e2e/responsive-layout.spec.ts
index 2afe72b..d1dd6f3 100644
--- a/nextjs-app/test/e2e/responsive-layout.spec.ts
+++ b/nextjs-app/test/e2e/responsive-layout.spec.ts
@@ -124,18 +124,22 @@ test.describe('Desktop responsive layout', () => {
     await expect(page.getByTestId('mobile-nav-bar')).toBeHidden();
   });

-  test('D3: the search placeholder shows placeholder text without a search landmark', async ({
+  test('D3: desktop navbar exposes the real search combobox', async ({
     page,
   }) => {
     await page.goto('/');
-    const placeholder = page.getByTestId('desktop-nav-search-placeholder');
-    await expect(placeholder).toBeVisible();
-    // Placeholder must not claim to be a search landmark — Story 2.4 adds
-    // the real combobox and re-introduces the landmark then.
-    await expect(placeholder).not.toHaveAttribute('role', /./);
-    await expect(placeholder).not.toHaveAttribute('aria-label', /./);
-    // It should render the placeholder text so users see the search bar stub.
-    await expect(placeholder).not.toBeEmpty();
+    const searchLandmark = page.getByRole('search', {
+      name: /Sök plats|Search venue/,
+    });
+    await expect(searchLandmark).toBeVisible();
+    const combobox = searchLandmark.getByRole('combobox', {
+      name: /Sök plats|Search venue/,
+    });
+    await expect(combobox).toBeVisible();
+    await expect(combobox).toHaveAttribute(
+      'placeholder',
+      /Sök plats eller område i Göteborg|Search place or area in Gothenburg/,
+    );
   });

   test('D4: the desktop logo link is keyboard-reachable with a visible focus ring (AC5)', async ({
diff --git a/nextjs-app/test/setup/setup.ts b/nextjs-app/test/setup/setup.ts
index ec861f4..711b6b1 100644
--- a/nextjs-app/test/setup/setup.ts
+++ b/nextjs-app/test/setup/setup.ts
@@ -29,4 +29,21 @@ beforeEach(() => {
     writable: true,
     value: new MemoryStorage(),
   });
+  if (!('ResizeObserver' in window)) {
+    class TestResizeObserver implements ResizeObserver {
+      observe(): void {}
+      unobserve(): void {}
+      disconnect(): void {}
+    }
+    Object.defineProperty(window, 'ResizeObserver', {
+      configurable: true,
+      writable: true,
+      value: TestResizeObserver,
+    });
+    Object.defineProperty(globalThis, 'ResizeObserver', {
+      configurable: true,
+      writable: true,
+      value: TestResizeObserver,
+    });
+  }
 });
diff --git a/nextjs-app/test/unit/api/venues-route.test.ts b/nextjs-app/test/unit/api/venues-route.test.ts
index 6bd4175..1dca104 100644
--- a/nextjs-app/test/unit/api/venues-route.test.ts
+++ b/nextjs-app/test/unit/api/venues-route.test.ts
@@ -128,6 +128,45 @@ describe('GET /api/venues', () => {
     expect(venue.thumbnail?.url).toMatch(/^https:\/\//);
   });

+  it('filters venues by canonical q across venue name and neighborhood', async () => {
+    const byName = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=magasinsgatan'));
+    expect(byName.status).toBe(200);
+    const byNameBody = (await byName.json()) as GetVenuesResponse;
+    expect(byNameBody.venues.map((venue) => venue.venueName)).toEqual([
+      'Solplats Magasinsgatan',
+    ]);
+
+    const byArea = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=haga'));
+    expect(byArea.status).toBe(200);
+    const byAreaBody = (await byArea.json()) as GetVenuesResponse;
+    expect(byAreaBody.venues.map((venue) => venue.venueName)).toEqual([
+      'Brygghuset Lerum',
+    ]);
+  });
+
+  it('returns an empty venue list when q has no matches and leaves the request otherwise successful', async () => {
+    const res = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=zzzzzz'));
+    expect(res.status).toBe(200);
+    const body = (await res.json()) as GetVenuesResponse;
+    expect(body.venues).toEqual([]);
+    expect(body.meta.count).toBe(0);
+    expect(body.totalCount).toBe(0);
+  });
+
+  it('rejects overlong or malformed q values with 400', async () => {
+    const overlong = await GET(makeRequest(`?lat=57.7089&lng=11.9746&q=${'a'.repeat(81)}`));
+    expect(overlong.status).toBe(400);
+    expect((await overlong.json()) as { detail: string }).toEqual(
+      expect.objectContaining({ detail: expect.stringMatching(/q/i) }),
+    );
+
+    const malformed = await GET(makeRequest('?lat=57.7089&lng=11.9746&q=magasin%0A'));
+    expect(malformed.status).toBe(400);
+    expect((await malformed.json()) as { detail: string }).toEqual(
+      expect.objectContaining({ detail: expect.stringMatching(/q/i) }),
+    );
+  });
+
   it('sets ETag and returns 304 for unchanged revalidation', async () => {
     const first = await GET(makeRequest('?lat=57.7089&lng=11.9746'));
     expect(first.status).toBe(200);
diff --git a/nextjs-app/test/unit/queries/useVenueSearch.test.ts b/nextjs-app/test/unit/queries/useVenueSearch.test.ts
index 7566999..dcbea5f 100644
--- a/nextjs-app/test/unit/queries/useVenueSearch.test.ts
+++ b/nextjs-app/test/unit/queries/useVenueSearch.test.ts
@@ -76,6 +76,43 @@ describe('useVenueSearch', () => {
     expect(expected).toEqual(['venues', 'list', { lat: 57.7089, lng: 11.9746, radiusKm: 1.5 }]);
   });

+  it('adds trimmed text query to the request URL and normalized query key', async () => {
+    fetchSpy.mockResolvedValueOnce(
+      new Response(JSON.stringify(SAMPLE_RESPONSE), {
+        status: 200,
+        headers: { 'Content-Type': 'application/json' },
+      }),
+    );
+
+    const { result } = renderHook(
+      () => useVenueSearch({
+        lat: 57.708912,
+        lng: 11.974601,
+        radiusKm: 1.5,
+        q: ' Kafé Magasinet ',
+      }),
+      { wrapper: makeWrapper() },
+    );
+
+    await waitFor(() => expect(result.current.isSuccess).toBe(true));
+    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
+    const parsed = new URL(calledUrl, 'http://localhost');
+    expect(parsed.searchParams.get('q')).toBe('Kafé Magasinet');
+
+    expect(
+      queryKeys.venues.list({
+        radiusKm: 1.5,
+        q: 'Kafé Magasinet',
+        lng: 11.9746,
+        lat: 57.7089,
+      }),
+    ).toEqual([
+      'venues',
+      'list',
+      { lat: 57.7089, lng: 11.9746, q: 'Kafé Magasinet', radiusKm: 1.5 },
+    ]);
+  });
+
   it('forwards the AbortSignal from TanStack to fetch (request cancellation)', async () => {
     fetchSpy.mockResolvedValueOnce(
       new Response(JSON.stringify(SAMPLE_RESPONSE), {


diff --git a/nextjs-app/components/composed/search/VenueSearchCombobox.tsx b/nextjs-app/components/composed/search/VenueSearchCombobox.tsx
new file mode 100644
index 0000000..fe6bdbb
--- /dev/null
+++ b/nextjs-app/components/composed/search/VenueSearchCombobox.tsx
@@ -0,0 +1,221 @@
+'use client';
+
+import { useEffect, useMemo, useRef, useState } from 'react';
+import { Command } from 'cmdk';
+import { motion, useReducedMotion } from 'motion/react';
+import { Search, X } from 'lucide-react';
+import {
+  DURATION_DEFAULT_S,
+  DURATION_FAST_S,
+  EASE_ENTER,
+  EASE_EXIT,
+} from '@/lib/constants/animation';
+import type { VenueDataDto } from '@/lib/types/api';
+import { cn } from '@/lib/utils';
+
+export type VenueSearchComboboxLabels = {
+  label: string;
+  placeholder: string;
+  clear: string;
+  loading: string;
+  noResults: (query: string) => string;
+  resultCount: (count: number) => string;
+};
+
+export type VenueSearchComboboxProps = {
+  venues: VenueDataDto[];
+  query: string;
+  onQueryChange: (query: string) => void;
+  onSelectVenue: (venue: VenueDataDto) => void;
+  labels: VenueSearchComboboxLabels;
+  variant: 'mobile' | 'desktop';
+  isLoading?: boolean;
+  filterResults?: boolean;
+  className?: string;
+};
+
+export function VenueSearchCombobox({
+  venues,
+  query,
+  onQueryChange,
+  onSelectVenue,
+  labels,
+  variant,
+  isLoading = false,
+  filterResults = true,
+  className,
+}: VenueSearchComboboxProps) {
+  const inputRef = useRef<HTMLInputElement | null>(null);
+  const rootRef = useRef<HTMLDivElement | null>(null);
+  const shouldReduceMotion = useReducedMotion() ?? false;
+  const [open, setOpen] = useState(false);
+  const trimmedQuery = query.trim();
+  const visibleVenues = useMemo(
+    () => (filterResults ? filterVenuesForQuery(venues, trimmedQuery) : venues),
+    [filterResults, trimmedQuery, venues],
+  );
+  const shouldShowResults = open && trimmedQuery.length > 0;
+
+  useEffect(() => {
+    const handlePointerDown = (event: PointerEvent) => {
+      const target = event.target instanceof Node ? event.target : null;
+      if (!target || rootRef.current?.contains(target)) return;
+      setOpen(false);
+    };
+    document.addEventListener('pointerdown', handlePointerDown);
+    return () => document.removeEventListener('pointerdown', handlePointerDown);
+  }, []);
+
+  const handleSelectVenue = (venue: VenueDataDto) => {
+    setOpen(false);
+    inputRef.current?.blur();
+    onSelectVenue(venue);
+  };
+
+  const handleClear = () => {
+    onQueryChange('');
+    setOpen(false);
+    inputRef.current?.focus();
+  };
+
+  return (
+    <Command
+      ref={rootRef}
+      label={labels.label}
+      shouldFilter={false}
+      role="search"
+      aria-label={labels.label}
+      className={cn('relative text-text-primary', className)}
+    >
+      <div
+        className={cn(
+          'flex min-h-11 items-center gap-2 rounded-pill bg-surface-muted px-4 text-body-sm text-text-body shadow-subtle',
+          'focus-within:ring-2 focus-within:ring-text-primary',
+          variant === 'mobile' && 'bg-glass-standard backdrop-blur-standard shadow-button-float',
+        )}
+      >
+        <Search aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
+        <Command.Input
+          ref={inputRef}
+          value={query}
+          onValueChange={(nextQuery) => {
+            onQueryChange(nextQuery);
+            setOpen(nextQuery.trim().length > 0);
+          }}
+          onFocus={() => {
+            if (trimmedQuery.length > 0) setOpen(true);
+          }}
+          onKeyDown={(event) => {
+            if (event.key === 'Escape') {
+              event.preventDefault();
+              setOpen(false);
+              inputRef.current?.blur();
+            }
+          }}
+          aria-label={labels.label}
+          placeholder={labels.placeholder}
+          className="min-h-11 min-w-0 flex-1 bg-transparent text-body-sm text-text-body outline-none placeholder:text-text-muted"
+        />
+        {query.length > 0 && (
+          <button
+            type="button"
+            aria-label={labels.clear}
+            onMouseDown={(event) => event.preventDefault()}
+            onClick={handleClear}
+            className="flex size-11 shrink-0 items-center justify-center rounded-pill text-text-body outline-none transition-colors duration-fast ease-default hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-text-primary"
+          >
+            <X aria-hidden="true" className="size-4" />
+          </button>
+        )}
+      </div>
+
+      <motion.div
+        aria-hidden={!shouldShowResults}
+        initial={false}
+        animate={
+          shouldShowResults
+            ? { display: 'block', opacity: 1, y: 0 }
+            : {
+                opacity: 0,
+                y: shouldReduceMotion ? 0 : -4,
+                transitionEnd: { display: 'none' },
+              }
+        }
+        transition={{
+          duration: shouldReduceMotion ? DURATION_FAST_S : DURATION_DEFAULT_S,
+          ease: shouldShowResults ? EASE_ENTER : EASE_EXIT,
+        }}
+        className="absolute left-0 right-0 top-full z-glass-panel mt-2 overflow-hidden rounded-card border border-divider bg-surface-cream shadow-card"
+      >
+        <Command.List
+          data-testid="venue-search-results"
+          data-reduced-motion={String(shouldReduceMotion)}
+          aria-label={labels.resultCount(visibleVenues.length)}
+          className="max-h-72 overflow-y-auto p-2"
+        >
+          {shouldShowResults && isLoading && (
+            <div
+              role="status"
+              className="px-3 py-3 text-body-sm text-text-muted"
+            >
+              {labels.loading}
+            </div>
+          )}
+          {shouldShowResults && !isLoading && visibleVenues.length === 0 && (
+            <Command.Empty className="px-3 py-3 text-body-sm text-text-body">
+              {labels.noResults(trimmedQuery)}
+            </Command.Empty>
+          )}
+          {shouldShowResults && !isLoading && visibleVenues.map((venue) => (
+            <Command.Item
+              key={venue.id}
+              value={venue.id}
+              keywords={[venue.venueName, venue.neighborhood, venue.slug]}
+              onSelect={() => handleSelectVenue(venue)}
+              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-venue-image px-3 py-2 text-body-sm text-text-body outline-none data-[selected=true]:bg-surface-muted"
+            >
+              <span className="flex size-8 shrink-0 items-center justify-center rounded-badge bg-amber-primary text-label-xs text-amber-cta-text">
+                {initialsForVenue(venue)}
+              </span>
+              <span className="min-w-0 flex-1">
+                <span className="block truncate text-body-sm-medium text-text-primary">
+                  {venue.venueName}
+                </span>
+                <span className="block truncate text-label-xs-medium text-text-muted">
+                  {venue.neighborhood}
+                </span>
+              </span>
+            </Command.Item>
+          ))}
+        </Command.List>
+      </motion.div>
+    </Command>
+  );
+}
+
+function filterVenuesForQuery(venues: VenueDataDto[], query: string): VenueDataDto[] {
+  if (!query) return venues;
+  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
+  if (terms.length === 0) return venues;
+  return venues.filter((venue) => {
+    const searchable = normalizeSearchText([
+      venue.venueName,
+      venue.neighborhood,
+      venue.venueSlug,
+      venue.slug,
+    ].join(' '));
+    return terms.every((term) => searchable.includes(term));
+  });
+}
+
+function normalizeSearchText(value: string): string {
+  return value
+    .normalize('NFD')
+    .replace(/[\u0300-\u036f]/gu, '')
+    .toLocaleLowerCase('sv-SE');
+}
+
+function initialsForVenue(venue: VenueDataDto): string {
+  const fallback = venue.thumbnail?.initials || venue.venueName;
+  return Array.from(fallback.trim() || 'SS').slice(0, 2).join('').toUpperCase();
+}


diff --git a/nextjs-app/components/composed/venue/VenueListControls.tsx b/nextjs-app/components/composed/venue/VenueListControls.tsx
new file mode 100644
index 0000000..69310e6
--- /dev/null
+++ b/nextjs-app/components/composed/venue/VenueListControls.tsx
@@ -0,0 +1,179 @@
+'use client';
+
+import { Clock, Coffee, Heart, Navigation, Sun } from 'lucide-react';
+import type { ReactNode } from 'react';
+import { cn } from '@/lib/utils';
+
+export type VenueListSortMode = 'sun' | 'distance';
+
+export type VenueListControlsLabels = {
+  nearTab: string;
+  favouritesTab: string;
+  topPicks: string;
+  sortBySun: string;
+  sortByDistance: string;
+  categoryCafe: string;
+  openNow: string;
+  unavailable: string;
+};
+
+export type VenueListControlsProps = {
+  mode: 'mobile' | 'desktop';
+  sortMode: VenueListSortMode;
+  onSortModeChange: (mode: VenueListSortMode) => void;
+  labels: VenueListControlsLabels;
+};
+
+export function VenueListControls({
+  mode,
+  sortMode,
+  onSortModeChange,
+  labels,
+}: VenueListControlsProps) {
+  if (mode === 'desktop') {
+    return (
+      <div className="space-y-3 border-b border-divider px-3 pb-3">
+        <div className="flex gap-1" role="tablist" aria-label={labels.topPicks}>
+          <TabButton active icon={<Navigation aria-hidden="true" className="size-4" />}>
+            {labels.nearTab}
+          </TabButton>
+          <TabButton
+            disabled
+            icon={<Heart aria-hidden="true" className="size-4" />}
+            unavailable={labels.unavailable}
+          >
+            {labels.favouritesTab}
+          </TabButton>
+        </div>
+        <div className="flex flex-wrap gap-2">
+          <SortButton
+            active={sortMode === 'sun'}
+            onClick={() => onSortModeChange('sun')}
+            icon={<Sun aria-hidden="true" className="size-4" />}
+          >
+            {labels.sortBySun}
+          </SortButton>
+          <SortButton
+            active={sortMode === 'distance'}
+            onClick={() => onSortModeChange('distance')}
+            icon={<Navigation aria-hidden="true" className="size-4" />}
+          >
+            {labels.sortByDistance}
+          </SortButton>
+        </div>
+      </div>
+    );
+  }
+
+  return (
+    <div className="flex gap-2 overflow-x-auto pb-3" aria-label={labels.topPicks}>
+      <SortButton
+        active={sortMode === 'sun'}
+        onClick={() => onSortModeChange('sun')}
+        compact
+      >
+        {labels.sortBySun}
+      </SortButton>
+      <SortButton
+        active={sortMode === 'distance'}
+        onClick={() => onSortModeChange('distance')}
+        compact
+      >
+        {labels.nearTab}
+      </SortButton>
+      <SortButton
+        disabled
+        unavailable={labels.unavailable}
+        icon={<Coffee aria-hidden="true" className="size-4" />}
+        compact
+      >
+        {labels.categoryCafe}
+      </SortButton>
+      <SortButton
+        disabled
+        unavailable={labels.unavailable}
+        icon={<Clock aria-hidden="true" className="size-4" />}
+        compact
+      >
+        {labels.openNow}
+      </SortButton>
+    </div>
+  );
+}
+
+function SortButton({
+  active = false,
+  disabled = false,
+  unavailable,
+  onClick,
+  icon,
+  compact = false,
+  children,
+}: {
+  active?: boolean;
+  disabled?: boolean;
+  unavailable?: string;
+  onClick?: () => void;
+  icon?: ReactNode;
+  compact?: boolean;
+  children: string;
+}) {
+  return (
+    <button
+      type="button"
+      aria-pressed={disabled ? undefined : active}
+      aria-label={unavailable ? `${children}, ${unavailable}` : children}
+      disabled={disabled}
+      onClick={onClick}
+      className={cn(
+        'flex min-h-11 shrink-0 items-center rounded-pill outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
+        compact ? 'gap-1.5 px-2 text-label-md' : 'gap-2 px-4 text-label-lg',
+        active
+          ? 'bg-text-primary text-white'
+          : 'border border-divider bg-white text-text-body hover:bg-surface-muted',
+        disabled && 'cursor-not-allowed opacity-50 hover:bg-white',
+      )}
+    >
+      {icon && (
+        <span className={active ? 'text-amber-primary' : 'text-amber-dark'}>
+          {icon}
+        </span>
+      )}
+      {children}
+    </button>
+  );
+}
+
+function TabButton({
+  active = false,
+  disabled = false,
+  unavailable,
+  icon,
+  children,
+}: {
+  active?: boolean;
+  disabled?: boolean;
+  unavailable?: string;
+  icon: ReactNode;
+  children: string;
+}) {
+  return (
+    <button
+      type="button"
+      role="tab"
+      aria-selected={active}
+      aria-label={unavailable ? `${children}, ${unavailable}` : children}
+      disabled={disabled}
+      className={cn(
+        'flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-2 text-label-lg outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
+        active
+          ? 'border-amber-gold text-text-primary'
+          : 'border-transparent text-text-muted',
+        disabled && 'cursor-not-allowed opacity-50',
+      )}
+    >
+      {icon}
+      {children}
+    </button>
+  );
+}


diff --git a/nextjs-app/components/custom/search/VenueSearchShell.tsx b/nextjs-app/components/custom/search/VenueSearchShell.tsx
new file mode 100644
index 0000000..7e3cf87
--- /dev/null
+++ b/nextjs-app/components/custom/search/VenueSearchShell.tsx
@@ -0,0 +1,110 @@
+'use client';
+
+import { useState } from 'react';
+import { useTranslations } from 'next-intl';
+import { Navigation, Settings } from 'lucide-react';
+import {
+  VenueSearchCombobox,
+  type VenueSearchComboboxLabels,
+} from '@/components/composed/search/VenueSearchCombobox';
+import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
+import { useGeolocation } from '@/hooks/useGeolocation';
+import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
+import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
+import { DURATION_FLY_MS } from '@/lib/constants/animation';
+import type { VenueDataDto } from '@/lib/types/api';
+import { cn } from '@/lib/utils';
+
+const SEARCH_RADIUS_KM = 1.5;
+
+export type VenueSearchShellProps = {
+  variant: 'mobile' | 'desktop';
+  className?: string;
+};
+
+export function VenueSearchShell({ variant, className }: VenueSearchShellProps) {
+  const t = useTranslations('venue.search');
+  const tNav = useTranslations('common.nav');
+  const [query, setQuery] = useState('');
+  const geolocation = useGeolocation();
+  const { mapInstance } = useMapInstance();
+  const { selectVenue } = useMapSelection();
+  const trimmedQuery = query.trim();
+  const venueQuery = useVenueSearch({
+    lat: geolocation.coords.lat,
+    lng: geolocation.coords.lng,
+    radiusKm: SEARCH_RADIUS_KM,
+    q: trimmedQuery || undefined,
+  });
+  const venues = Array.isArray(venueQuery.data?.venues) ? venueQuery.data.venues : [];
+  const labels: VenueSearchComboboxLabels = {
+    label: t('label'),
+    placeholder: t('placeholder'),
+    clear: t('clear'),
+    loading: t('loading'),
+    noResults: (value) => t('noResults', { query: value }),
+    resultCount: (count) => t('resultCount', { count }),
+  };
+
+  const handleSelectVenue = (venue: VenueDataDto) => {
+    selectVenue(venue.id);
+    if (mapInstance && hasValidVenueLocation(venue)) {
+      mapInstance.easeTo({
+        center: [venue.location.lng, venue.location.lat],
+        duration: DURATION_FLY_MS,
+      });
+    }
+    setQuery('');
+  };
+
+  if (variant === 'mobile') {
+    return (
+      <div className={cn('flex items-start gap-2 lg:hidden', className)}>
+        <VenueSearchCombobox
+          venues={venues}
+          query={query}
+          onQueryChange={setQuery}
+          onSelectVenue={handleSelectVenue}
+          labels={labels}
+          variant="mobile"
+          isLoading={venueQuery.isFetching && trimmedQuery.length > 0}
+          filterResults={false}
+          className="min-w-0 flex-1"
+        />
+        <button
+          type="button"
+          aria-label={tNav('myLocation')}
+          onClick={geolocation.requestLocation}
+          className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-float backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
+        >
+          <Navigation aria-hidden="true" className="size-5" />
+        </button>
+        <button
+          type="button"
+          aria-label={t('settings')}
+          className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-float backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
+        >
+          <Settings aria-hidden="true" className="size-5" />
+        </button>
+      </div>
+    );
+  }
+
+  return (
+    <VenueSearchCombobox
+      venues={venues}
+      query={query}
+      onQueryChange={setQuery}
+      onSelectVenue={handleSelectVenue}
+      labels={labels}
+      variant="desktop"
+      isLoading={venueQuery.isFetching && trimmedQuery.length > 0}
+      filterResults={false}
+      className={cn('w-[384px]', className)}
+    />
+  );
+}
+
+function hasValidVenueLocation(venue: VenueDataDto): boolean {
+  return Number.isFinite(venue.location?.lat) && Number.isFinite(venue.location?.lng);
+}


diff --git a/nextjs-app/test/components/VenueSearchCombobox.test.tsx b/nextjs-app/test/components/VenueSearchCombobox.test.tsx
new file mode 100644
index 0000000..58985a0
--- /dev/null
+++ b/nextjs-app/test/components/VenueSearchCombobox.test.tsx
@@ -0,0 +1,168 @@
+import { fireEvent, render, screen, waitFor } from '@testing-library/react';
+import { useState } from 'react';
+import { describe, expect, it, vi } from 'vitest';
+import { VenueSearchCombobox } from '@/components/composed/search/VenueSearchCombobox';
+import type { VenueDataDto } from '@/lib/types/api';
+
+const motionState = vi.hoisted(() => ({ reducedMotion: false }));
+
+vi.mock('motion/react', async () => {
+  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
+  return {
+    ...actual,
+    useReducedMotion: () => motionState.reducedMotion,
+  };
+});
+
+const LABELS = {
+  label: 'Sök plats',
+  placeholder: 'Sök plats eller område i Göteborg...',
+  clear: 'Rensa sökning',
+  loading: 'Söker platser',
+  noResults: (query: string) => `Inga resultat för "${query}"`,
+  resultCount: (count: number) => `${count} resultat`,
+};
+
+describe('<VenueSearchCombobox />', () => {
+  it('filters by venue name and neighborhood and selects a clicked result', async () => {
+    const onSelectVenue = vi.fn();
+    render(
+      <Harness
+        venues={[
+          makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' }),
+          makeVenue({ id: '2', name: 'Brygghuset Lerum', neighborhood: 'Haga' }),
+        ]}
+        onSelectVenue={onSelectVenue}
+      />,
+    );
+
+    const input = screen.getByRole('combobox', { name: 'Sök plats' });
+    fireEvent.focus(input);
+    fireEvent.change(input, { target: { value: 'haga' } });
+
+    expect(screen.getByTestId('venue-search-results')).toBeInTheDocument();
+    expect(await screen.findByRole('option', { name: /Brygghuset Lerum/ })).toBeInTheDocument();
+    expect(screen.queryByRole('option', { name: /Kafé Magasinet/ })).toBeNull();
+
+    fireEvent.click(screen.getByRole('option', { name: /Brygghuset Lerum/ }));
+    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
+    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
+    expect(input).not.toHaveFocus();
+  });
+
+  it('supports keyboard navigation with arrow keys and Enter', () => {
+    const onSelectVenue = vi.fn();
+    render(
+      <Harness
+        venues={[
+          makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' }),
+          makeVenue({ id: '2', name: 'Café Halvvägs', neighborhood: 'Vasastaden' }),
+        ]}
+        onSelectVenue={onSelectVenue}
+      />,
+    );
+
+    const input = screen.getByRole('combobox', { name: 'Sök plats' });
+    fireEvent.focus(input);
+    fireEvent.change(input, { target: { value: 'kafé' } });
+    fireEvent.keyDown(input, { key: 'ArrowDown' });
+    fireEvent.keyDown(input, { key: 'Enter' });
+
+    expect(onSelectVenue).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
+  });
+
+  it('dismisses on Escape, clears query from the clear button, and renders no-results copy', async () => {
+    const onSelectVenue = vi.fn();
+    render(
+      <Harness
+        venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
+        onSelectVenue={onSelectVenue}
+      />,
+    );
+
+    const input = screen.getByRole('combobox', { name: 'Sök plats' });
+    fireEvent.focus(input);
+    fireEvent.change(input, { target: { value: 'zzz' } });
+    expect(screen.getByText('Inga resultat för "zzz"')).toBeInTheDocument();
+
+    fireEvent.keyDown(input, { key: 'Escape' });
+    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
+    expect(onSelectVenue).not.toHaveBeenCalled();
+
+    fireEvent.focus(input);
+    fireEvent.change(input, { target: { value: 'kafé' } });
+    fireEvent.click(screen.getByRole('button', { name: 'Rensa sökning' }));
+    expect(input).toHaveValue('');
+    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
+  });
+
+  it('marks the reduced-motion dropdown path for instant/opacity-only transitions', () => {
+    motionState.reducedMotion = true;
+    render(
+      <Harness
+        venues={[makeVenue({ id: '1', name: 'Kafé Magasinet', neighborhood: 'Inom Vallgraven' })]}
+        onSelectVenue={vi.fn()}
+      />,
+    );
+
+    const input = screen.getByRole('combobox', { name: 'Sök plats' });
+    fireEvent.focus(input);
+    fireEvent.change(input, { target: { value: 'kafé' } });
+
+    expect(screen.getByTestId('venue-search-results')).toHaveAttribute(
+      'data-reduced-motion',
+      'true',
+    );
+    motionState.reducedMotion = false;
+  });
+});
+
+function Harness({
+  venues,
+  onSelectVenue,
+}: {
+  venues: VenueDataDto[];
+  onSelectVenue: (venue: VenueDataDto) => void;
+}) {
+  const [query, setQuery] = useState('');
+  return (
+    <VenueSearchCombobox
+      venues={venues}
+      query={query}
+      onQueryChange={setQuery}
+      onSelectVenue={onSelectVenue}
+      labels={LABELS}
+      variant="mobile"
+    />
+  );
+}
+
+function makeVenue({
+  id,
+  name,
+  neighborhood,
+}: {
+  id: string;
+  name: string;
+  neighborhood: string;
+}): VenueDataDto {
+  return {
+    id,
+    venueId: id,
+    venueName: name,
+    venueSlug: id,
+    slug: id,
+    neighborhood,
+    location: { lat: 57.7, lng: 11.97 },
+    currentSunStatus: 'Sunny',
+    isPartner: false,
+    confidence: 92,
+    distanceMeters: 180,
+    sunExposurePercent: 95,
+    sunWindow: { start: '13:00', end: '18:30' },
+    thumbnail: {
+      alt: `${name} uteservering`,
+      initials: name.slice(0, 2),
+    },
+  };
+}


diff --git a/nextjs-app/test/unit/query-keys.test.ts b/nextjs-app/test/unit/query-keys.test.ts
new file mode 100644
index 0000000..ff5acc4
--- /dev/null
+++ b/nextjs-app/test/unit/query-keys.test.ts
@@ -0,0 +1,61 @@
+import { describe, expect, it } from 'vitest';
+import { queryKeys } from '@/lib/query-keys';
+
+describe('queryKeys', () => {
+  it('normalizes venue list filters by dropping undefined values and sorting keys', () => {
+    const first = queryKeys.venues.list({
+      lat: 57.7089,
+      lng: 11.9746,
+      radiusKm: 1.5,
+      q: undefined,
+    });
+    const second = queryKeys.venues.list({
+      radiusKm: 1.5,
+      lng: 11.9746,
+      lat: 57.7089,
+    });
+
+    expect(first).toEqual(second);
+    expect(first).toEqual([
+      'venues',
+      'list',
+      { lat: 57.7089, lng: 11.9746, radiusKm: 1.5 },
+    ]);
+  });
+
+  it('sorts nested object keys recursively while preserving array order', () => {
+    const first = queryKeys.venues.list({
+      bounds: {
+        east: 11.99,
+        west: undefined,
+        north: 57.72,
+        south: 57.7,
+      },
+      tags: [
+        { value: 'cafe', disabled: undefined },
+        { value: 'open-now' },
+      ],
+    });
+    const second = queryKeys.venues.list({
+      tags: [
+        { disabled: undefined, value: 'cafe' },
+        { value: 'open-now' },
+      ],
+      bounds: {
+        south: 57.7,
+        north: 57.72,
+        east: 11.99,
+      },
+    });
+
+    expect(first).toEqual(second);
+    expect(first).toEqual([
+      'venues',
+      'list',
+      {
+        bounds: { east: 11.99, north: 57.72, south: 57.7 },
+        tags: [{ value: 'cafe' }, { value: 'open-now' }],
+      },
+    ]);
+  });
+});

``
