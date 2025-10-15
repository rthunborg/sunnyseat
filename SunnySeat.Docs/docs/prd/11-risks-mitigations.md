# 11. Risks & Mitigations
- **Shadow accuracy** → LOD1 heuristics, feedback loop, per‑patio overrides.
- **Cloud granularity** → blend nowcast+forecast, cap confidence, uncertainty UI; degrade gracefully.
- **Admin load** → focus top 100; streamlined drawing/import; batch ops.
- **Map performance** → precompute, edge cache, simplify polygons.
- **Seasonality** → tomorrow/weekend planning; wind/shelter later.
