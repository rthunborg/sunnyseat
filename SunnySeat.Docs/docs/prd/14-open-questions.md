# 14. Open Questions
- District & price level seed sources?  
- Venue owner access in V1: read‑only vs invite‑only admin?  
- Confidence weights initial values (e.g., 0.6 geometry / 0.4 cloud) and tuning plan.

---

## Addendum (Final)
**A1) Rate Limits & 429**  
- Defaults: 60 rpm/IP (`/api/patios`), 120 rpm/IP (`/api/venues/{id}`), 30 rpm/IP (`/api/feedback`).  
- 429 JSON: `{ "error":"rate_limited","retry_after": <seconds> }` + `Retry‑After` header; clients backoff with jitter ≤3 retries.

**A2) Data Retention & Backups**  
- Weather slices 14 days; feedback 1 year; daily backups + PITR ≥7 days.

**A3) SLO & Error Budget**  
- 99% during 06:00–22:00 local; 1%/month error budget; SLIs: p95 <400 ms, edge cache hit >50%, accuracy ≥85%.
