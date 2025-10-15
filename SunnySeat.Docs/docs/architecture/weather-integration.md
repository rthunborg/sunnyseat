# Weather Integration
- **Primary:** Yr/Met.no API with dedicated service account and rate limiting
- **Fallback:** locationforecast.no when nowcast unavailable; graceful degradation with "Est." confidence cap at 60%
- **Error handling:** 503 with Retry-After when weather service completely unavailable
