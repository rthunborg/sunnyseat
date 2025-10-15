# API Design
- **/api/patios**: near‑me list with state now + confidence; CDN cache 5–30s; lat/lng snapped to 50 m.  
- **/api/venues/{id}**: details + windows today/tomorrow; reason chip when no sun next 4h.  
- **/api/feedback**: idempotent yes/no; sinks to analytics.
