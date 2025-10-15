# 9. APIs (proposed)
- `GET /api/patios?lat=..&lng=..&radius=..` → list patios with current state + confidence; **422** if radius>3km; **503** when weather unavailable (with Retry‑After).
- `GET /api/venues/{id}` → venue details + today/tomorrow windows.
- `POST /api/feedback` → stores yes/no accuracy feedback; idempotent by time bucket.
- Admin: import & patio CRUD (auth required).
