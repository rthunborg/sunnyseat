# QA Test Strategy — Sunny Seat (Gothenburg)

> Role: QA · Status: Draft 1 (2025‑09‑21)

## Objectives
Verify core value (sunny now, when later) is accurate, fast, understandable; meet budgets; shift‑left with CI gates.

## Levels
Unit (algorithms), Contract/API, Integration (PostGIS + workers), E2E (web), Non‑functional (perf, a11y, SEO, resilience).

## Risk Areas
Sun/shadow precision; weather volatility; spatial perf; polygon quality; map rendering.

## Fixtures
Geo (5–10 patios), solar (equinox/solstice), weather (clear/cloudy/change, provider down), DST edges.

## Tools
xUnit, WireMock.Net, Playwright + axe, k6, Lighthouse CI, OWASP ZAP, synthetic probes.

## Gates
On PR: unit+integration+contract, Playwright smoke, Lighthouse budget.  
On main: add k6 perf, synthetic probes.
