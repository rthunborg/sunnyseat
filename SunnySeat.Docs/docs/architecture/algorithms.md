# Algorithms
- **Solar position**: SPA/NREL‑equivalent per‑minute ephemeris; precompute city‑level table.  
- **2.5D shadow**: extrude building footprints w/ height; cast shadow polygons; intersect with patio polygon to mark sunny/partial/shaded.  
- **Confidence**: `100*(0.6*geometryQuality + 0.4*cloudCertainty)` with caps (90% forecast‑only; 60% when estimated).
