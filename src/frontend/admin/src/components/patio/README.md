# Patio Information Cards - Component Documentation

**Story 4.2: Patio Information Cards & Results**

This directory contains React components for displaying patio search results with sun status information, forecasts, and user-friendly interactions.

## Components Overview

### PatioCard

Main component for displaying individual patio information.

**Features:**

- Venue name and address display
- Distance formatting (meters/kilometers)
- Current sun status with color-coded indicator
- Confidence badge with tooltip
- Mini timeline for 2-hour forecast
- Geofence warning for venues >10km
- Keyboard accessible and ARIA compliant

**Props:**

```typescript
interface PatioCardProps {
  patio: PatioData;
  onClick: (patioId: string) => void;
  showTimeline?: boolean; // default: true
}
```

**Usage:**

```tsx
<PatioCard
  patio={patioData}
  onClick={(id) => console.log("Selected:", id)}
  showTimeline={true}
/>
```

---

### PatioList

Container component for displaying multiple patio cards with sorting, filtering, and pagination.

**Features:**

- Automatic sorting (sunny first, then by distance)
- Geofence filtering (configurable radius)
- Empty state when <3 sunny patios
- Load more pagination
- Loading skeleton screens
- Result count display

**Props:**

```typescript
interface PatioListProps {
  patios: PatioData[];
  onPatioSelect: (patioId: string) => void;
  onAdjustLocation?: () => void;
  isLoading?: boolean; // default: false
  maxGeofenceKm?: number; // default: 10
  itemsPerPage?: number; // default: 20
}
```

**Usage:**

```tsx
<PatioList
  patios={patios}
  onPatioSelect={handleSelect}
  onAdjustLocation={handleLocationChange}
  maxGeofenceKm={10}
/>
```

---

### MiniTimeline

Visualization component for 2-hour sun forecast.

**Features:**

- 12 vertical bars (10-minute resolution)
- Color-coded by sun status (Sunny/Partial/Shaded)
- Height based on sun exposure percentage
- Time labels at 30-minute intervals
- Hover tooltips with details
- Loading and empty states
- Legend for color meanings

**Props:**

```typescript
interface MiniTimelineProps {
  patioId: string;
  startTime: Date;
  duration?: number; // minutes, default: 120
  resolution?: number; // minutes per bar, default: 10
  timelineData?: MiniTimelineData;
  isLoading?: boolean;
}
```

**Usage:**

```tsx
<MiniTimeline
  patioId="123"
  startTime={new Date()}
  timelineData={miniTimelineData}
/>
```

---

### ConfidenceBadge

Badge component displaying prediction confidence level.

**Features:**

- Three levels: High (≥70%), Medium (40-69%), Low (<40%)
- Color coding: Green, Amber, Gray
- Tooltip with explanation and weather factors
- Cap at 60% for estimated values
- Accessible with ARIA labels

**Props:**

```typescript
interface ConfidenceBadgeProps {
  confidence: number; // 0-100
  showTooltip?: boolean; // default: true
  weatherFactors?: string[];
  isEstimated?: boolean; // default: false
}
```

**Usage:**

```tsx
<ConfidenceBadge
  confidence={75}
  showTooltip={true}
  weatherFactors={["Clear skies", "No obstructions"]}
/>
```

---

### EmptyState

Display component for when insufficient sunny patios are available.

**Features:**

- Displays when <3 sunny patios found
- Calculates ETA to next sun window
- Shows alternative (shaded/partial) patios
- Location adjustment action
- Helpful messaging and graphics

**Props:**

```typescript
interface EmptyStateProps {
  patios: PatioData[];
  onAdjustLocation?: () => void;
}
```

**Usage:**

```tsx
<EmptyState patios={patios} onAdjustLocation={handleLocationChange} />
```

---

## Utilities

### sunWindowUtils.ts

Helper functions for sun-related calculations and formatting.

**Functions:**

- `calculateNextSunETA(patios)` - Calculate time until next sun window
- `getConfidenceLevel(confidence, isEstimated)` - Get confidence level classification
- `getConfidenceBadgeColor(level)` - Get Tailwind color class for badge
- `getConfidenceDescription(level)` - Get human-readable description
- `formatDistance(meters)` - Format distance as "450m" or "1.2km"
- `getSunStatusColor(status)` - Get Tailwind color class for sun status
- `getSunStatusTextColor(status)` - Get text color class
- `sortPatiosByPriority(patios)` - Sort patios by sun status then distance
- `hasEnoughSunnyPatios(patios)` - Check if ≥3 sunny patios

---

## Hooks

### useMiniTimeline

Custom hook for fetching and managing mini timeline data.

**Features:**

- Fetches 2-hour forecast data
- 5-minute cache duration
- Error handling
- Manual refetch capability

**Usage:**

```tsx
const { timelineData, isLoading, isError, error, refetch } = useMiniTimeline({
  patioId: "123",
  startTime: new Date(),
  enabled: true,
});
```

---

## Type Definitions

See `types/timeline.ts` for full type definitions:

- `PatioData` - Main patio information interface
- `MiniTimelineData` - Timeline forecast data
- `TimelineSlot` - Individual time slot data
- `NextSunWindow` - Next sun window information
- `ConfidenceLevel` - Type for confidence levels

---

## Design System

### Colors

- **Sunny:** `#22C55E` (green-500)
- **Partial:** `#F59E0B` (amber-500)
- **Shaded:** `#9CA3AF` (gray-400)

### Typography

- **Headline:** 20px/28px (text-xl)
- **Body:** 14px/20px (text-sm)
- **Caption:** 12px/16px (text-xs)

### Spacing

All spacing follows 8pt grid system:

- Card padding: 16px (p-4)
- Gap between elements: 16px (space-y-4)
- Border radius: 16px (rounded-2xl)

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- Keyboard navigable (Tab, Enter, Space)
- ARIA labels and roles
- Focus indicators
- Color contrast ratios met
- Screen reader friendly

---

## Testing

Test documentation files are provided for each component. To run tests, you need to install:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @vitest/ui jsdom
```

Then add to `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
```

Run tests:

```bash
npm run test
```

---

## Example Integration

See `pages/PatioSearchResultsExample.tsx` for a complete example of integrating all components.

**Basic usage:**

```tsx
import { PatioList } from "./components/patio/PatioList";

function App() {
  const [patios, setPatios] = useState([]);

  useEffect(() => {
    // Fetch from API
    fetch("/api/patios?lat=59.3293&lng=18.0686&radius=10")
      .then((res) => res.json())
      .then((data) => setPatios(data));
  }, []);

  return (
    <PatioList
      patios={patios}
      onPatioSelect={(id) => console.log("Selected:", id)}
    />
  );
}
```

---

## Performance Considerations

- Mini timeline data is cached for 5 minutes
- Pagination limits initial render to 20 items
- Skeleton screens for perceived performance
- Debounced hover interactions
- Optimized re-renders with React.memo (if needed)

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Future Enhancements

Potential improvements for future stories:

- Virtual scrolling for large result sets
- Map integration for spatial context
- Real-time updates via WebSocket
- Favorites/bookmarking functionality
- Share patio suggestions
- Mobile-specific optimizations
- PWA offline support

---

## Questions or Issues?

Contact the development team or refer to:

- Architecture docs: `docs/architecture.md`
- Design spec: `docs/front-end-spec.md`
- Story: `docs/stories/4.2.patio-information-cards.md`
