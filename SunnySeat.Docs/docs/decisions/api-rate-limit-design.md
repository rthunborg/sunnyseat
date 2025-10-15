# API Rate‑Limiting Design (No Code)

Policy: token bucket (rpm targets) with small bursts; per‑IP for public endpoints; `Retry‑After` on 429.  
Quotas: `/api/patios` 60 rpm, `/api/venues/{id}` 120 rpm, `/api/feedback` 30 rpm.  
Tests: unit boundaries, k6 at 2× quota → expect 429, Playwright smoke stays under limits.
