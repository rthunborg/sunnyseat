# Front‑End Spec — Sunny Seat (Gothenburg)

> Role: UX Expert · Status: Draft 1 (2025‑09‑21)

## Purpose & Scope
Map/List experience to find **sunny now** patios and see **sun windows** today/tomorrow with **confidence**.

## IA & Routes
- `/` Home: Map + List; filters; search.  
- `/v/{slug}` Venue detail: polygon overlay; windows; confidence; share.  
- `/admin` Admin: polygon editor; import; quality flags.

## Flows
- **Find sunny now**: locate → results <2s p50 → scan cards (state, confidence, mini timeline) → pick venue.  
- **See when venue gets sun**: detail page windows; refresh every 5 min; share link.  
- **Admin mapping**: draw/edit polygon; height override; snap/undo/redo.

## Components
- `VenueCard`, `MiniTimeline` (12 bars, 10‑min slots), `ConfidenceBadge` (High ≥70, Med 40–69, Low <40, Est. cap 60%), `SunWindowsTable`, `MapMarker`, `PolygonEditor`.

## Design System (tokens)
- Color: Primary #0EA5E9; Sunny #22C55E; Partial #F59E0B; Shaded #9CA3AF.  
- Type: Headline 20/28 semibold; Body 14/20; Caption 12/16.  
- Spacing: 8‑pt grid; corners 16 px; soft shadows.

## Perf & A11y
- Initial results <2s p50 / <4s p90; map ≥50 FPS mobile.  
- WCAG AA; keyboardable list/detail; reduced‑motion respects user setting.
