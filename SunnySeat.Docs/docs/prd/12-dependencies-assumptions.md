# 12. Dependencies & Assumptions
- **Building Data:** Lantmäteriet/OSM buildings (.gpkg local) with validation pipeline for height data quality
- **Weather Provider:** Primary - Yr/Met.no with API key setup and testing; Fallback - generic locationforecast when nowcast unavailable
- **Database:** PostgreSQL + PostGIS setup with migration framework for .NET Framework compatibility  
- **Infrastructure:** Azure/Postgres within budget; CDN/edge cache; admin authentication mechanism
- **API Integration:** Weather API testing and fallback behavior before confidence calculations dependency
