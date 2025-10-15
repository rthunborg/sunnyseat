# 6. Non‑Functional Requirements
- **Performance (client):** initial results <2s p50 / <4s p90 on 4G; map pan/zoom ≥50 FPS mobile, ≥60 FPS desktop where possible.
- **Performance (server):** `/api/patios` **p95 <400 ms** at 100 RPS; cache hits **>70%** at edge.
- **Availability:** 99% for public app during **06:00–22:00** local.
- **Cost:** target infra cost ≤ **$100/month** at MVP scale (~5k MAU, 50k req/mo).
- **Privacy:** no PII required; store coarse location only (nearest 50 m when persisted).
- **Accessibility:** WCAG **AA**; keyboard navigation on list/detail; map alternatives.
- **Observability:** structured logs, request tracing id, **4 dashboards** (traffic, latency, cache hit ratio, accuracy).
