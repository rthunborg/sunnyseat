# Coding Standards

*Version 1.0 - Created by Winston (Architect Agent)*

## Overview

This document establishes coding standards for the SunnySeat project to ensure consistency, maintainability, and quality across all development work.

## General Principles

- **Clarity over Cleverness**: Write code that is immediately understandable
- **Consistency**: Follow established patterns within the codebase
- **Performance-Conscious**: Consider performance implications, especially for real-time sun calculations
- **Security-First**: Apply secure coding practices at every level

## Technology-Specific Standards

### Frontend (React + TypeScript)

**File Organization:**
```
src/
??? components/           # Reusable UI components
??? pages/               # Route-level components  
??? hooks/               # Custom React hooks
??? services/            # API calls and external integrations
??? utils/               # Pure utility functions
??? types/               # TypeScript type definitions
??? constants/           # Application constants
```

**Naming Conventions:**
- Components: PascalCase (`PatioCard.tsx`)
- Hooks: camelCase with 'use' prefix (`usePatioData.ts`)
- Files: camelCase for utilities, PascalCase for components
- CSS Classes: kebab-case (`patio-card__header`)

**Component Structure:**
```typescript
// Import order: React, third-party, internal
import React from 'react';
import { Map } from 'maplibre-gl';
import { PatioData } from '../types/patio';

interface PatioCardProps {
  patio: PatioData;
  onSelect: (id: string) => void;
}

export const PatioCard: React.FC<PatioCardProps> = ({ patio, onSelect }) => {
  // State first, then computed values, then effects
  
  return (
    <div className="patio-card">
      {/* JSX */}
    </div>
  );
};
```

**State Management:**
- Use React Context for global state (user location, selected patio)
- Local state with useState for component-specific data
- Custom hooks for shared logic (useCurrentLocation, useSunData)

### Backend (.NET 8 Minimal APIs)

**Project Structure:**
```
src/
??? SunnySeat.Api/          # Main API project
??? SunnySeat.Core/         # Business logic and entities
??? SunnySeat.Data/         # Data access and repositories
??? SunnySeat.Workers/      # Background jobs
??? SunnySeat.Tests/        # Unit and integration tests
```

**Naming Conventions:**
- Classes: PascalCase (`PatioService`, `SunCalculator`)
- Methods: PascalCase (`CalculateSunExposure`)
- Properties: PascalCase (`IsCurrentlySunny`)
- Constants: PascalCase (`MaxSearchRadiusKm`)
- Private fields: camelCase with underscore (`_patioRepository`)

**API Endpoint Structure:**
```csharp
// Group related endpoints
var patiosGroup = app.MapGroup("/api/patios")
    .WithTags("Patios")
    .WithOpenApi();

// Clear, RESTful naming
patiosGroup.MapGet("/", GetPatiosAsync)
    .WithName("GetPatios")
    .WithSummary("Get patios within radius with current sun status");

patiosGroup.MapGet("/{id}/sun-forecast", GetPatioSunForecastAsync)
    .WithName("GetPatioSunForecast")
    .WithSummary("Get sun forecast for specific patio");
```

**Error Handling:**
```csharp
// Use Result pattern for business logic
public record Result<T>
{
    public bool IsSuccess { get; init; }
    public T? Value { get; init; }
    public string? Error { get; init; }
}

// Standardized error responses
public record ApiError(string Code, string Message, object? Details = null);
```

## Code Quality Standards

### Comments and Documentation

**When to Comment:**
- Complex sun calculation algorithms
- Non-obvious business rules
- Performance-critical sections
- Integration quirks with external APIs

**XML Documentation (C#):**
```csharp
/// <summary>
/// Calculates sun exposure percentage for a patio at specific time
/// </summary>
/// <param name="patioGeometry">Patio polygon in EPSG:4326</param>
/// <param name="timestamp">UTC timestamp for calculation</param>
/// <returns>Sun exposure percentage (0-100) with confidence level</returns>
public SunExposureResult CalculateSunExposure(Polygon patioGeometry, DateTime timestamp)
```

**JSDoc (TypeScript):**
```typescript
/**
 * Hook for fetching real-time patio sun data
 * @param location - User's current location
 * @param radiusKm - Search radius in kilometers
 * @returns Patio data with current sun status
 */
export const usePatioData = (location: Coordinates, radiusKm: number) => {
```

### Testing Standards

**Unit Tests:**
- One test class per service/component
- Arrange-Act-Assert pattern
- Descriptive test names: `CalculateSunExposure_WhenNoObstructions_Returns100Percent`

**Integration Tests:**
- Test API endpoints end-to-end
- Include database interactions
- Mock external services (weather API)

**Frontend Tests:**
- Test user interactions, not implementation details
- Use React Testing Library
- Focus on accessibility and user experience

### Performance Guidelines

**Frontend:**
- Lazy load map tiles and patio data
- Debounce search inputs (300ms)
- Memoize expensive calculations
- Use React.memo for static components

**Backend:**
- Cache sun calculations (1-hour TTL)
- Use PostGIS spatial indexes
- Paginate patio results (max 50 per request)
- Implement rate limiting (100 req/min per IP)

**Database:**
- Always use spatial indexes for geometry queries
- Partition tables by date for weather/sun data
- Use read replicas for heavy calculations

## Security Standards

### Authentication & Authorization
- No authentication required for basic patio search
- Admin endpoints protected with JWT
- Rate limiting on all public endpoints

### Data Protection
- No personal data storage (location queries are ephemeral)
- HTTPS everywhere
- Input validation on all endpoints
- SQL injection prevention through parameterized queries

### API Security
```csharp
// Input validation example
public record GetPatiosRequest
{
    [Range(-90, 90)] public double Latitude { get; init; }
    [Range(-180, 180)] public double Longitude { get; init; }
    [Range(0.1, 5)] public double RadiusKm { get; init; } = 1.0;
}
```

## Git and Workflow Standards

### Branch Naming
- Feature: `feature/patio-search-optimization`
- Bug fixes: `fix/sun-calculation-accuracy`  
- Hotfixes: `hotfix/weather-api-timeout`

### Commit Messages
```
feat: add real-time sun exposure calculation

- Implement shadow-casting algorithm using PostGIS
- Add confidence scoring based on building data quality
- Include weather cloud cover in calculations

Refs: #123
```

### Pull Request Requirements
- All tests pass
- Code coverage ?80%
- Architecture compliance verified
- Performance impact assessed for sun calculations

## Architecture Compliance

### Dependency Rules
- Core business logic has no external dependencies
- API layer depends only on Core and Data
- Workers are independent of API layer

### Data Access
- Repository pattern for all data access
- No direct SQL in business logic
- Use PostGIS functions for spatial calculations

### External Integrations
- Weather API calls only in Workers
- Retry logic with exponential backoff
- Circuit breaker for external service failures

## Tools and Automation

### Code Formatting
- Prettier for TypeScript/React
- EditorConfig for consistent formatting
- ESLint for code quality rules

### Static Analysis
- SonarQube for code quality metrics
- Dependency vulnerability scanning
- Performance profiling for sun calculations

### Build Pipeline
- Automated testing on all PRs
- Docker containers for deployment
- Blue-green deployment for zero downtime

---

**Compliance:** All code must pass these standards before merge. The dev agent will enforce these requirements during development.