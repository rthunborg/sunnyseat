# Synthetic Probes Plan — CI/Monitoring (No Code)

Probes (15‑min cadence): GET `/api/patios?lat=57.708&lng=11.973&radius=1.5` (<800 ms, 200, has `patios`); GET `/` (200, contains marker text); GET `/api/venues/{seedId}` (200, windows or valid no‑sun). Alert on 2 consecutive failures (06:00–22:00 local). Store code/latency/snippet for 7 days; open GitHub issue on 3+ failures/24h.
