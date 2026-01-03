# End-to-End Test Suite

This directory contains comprehensive end-to-end tests for the SunnySeat application, validating all functionality after migration to Next.js.

## Test Structure

### Test Files

- **`patio-search.spec.ts`** - End-to-end tests for patio search user flow
- **`api-endpoints.spec.ts`** - Basic API endpoint functionality tests
- **`api-contract-validation.spec.ts`** - Validates API contracts match .NET API
- **`spatial-query-accuracy.spec.ts`** - Tests spatial query accuracy and calculations
- **`performance-validation.spec.ts`** - Performance benchmarks and validation
- **`data-integrity.spec.ts`** - Data consistency and integrity verification
- **`error-handling.spec.ts`** - Error handling and edge case testing
- **`regression.spec.ts`** - Regression tests to ensure no functionality regressions

## Running Tests

### Prerequisites

1. Ensure the Next.js application is running or will be started automatically
2. Ensure test database is available (if required)
3. Install dependencies: `npm install` (from project root)

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/patio-search.spec.ts
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
```

## Test Coverage

### User Flows
- ✅ Patio search flow (location-based search)
- ✅ Map interaction and display
- ✅ Location permission handling
- ✅ Search radius adjustment

### API Endpoints
- ✅ Health endpoints (`/api/health/*`)
- ✅ Patios endpoint (`/api/patios`)
- ✅ Feedback endpoint (`/api/feedback`)
- ✅ Sun exposure endpoint (`/api/sun-exposure/patio/[id]`)
- ✅ Authentication endpoints (`/api/auth/*`)

### API Contract Validation
- ✅ Response structure validation
- ✅ Parameter validation
- ✅ Error response format
- ✅ Backward compatibility

### Spatial Queries
- ✅ Distance calculations
- ✅ Coordinate accuracy
- ✅ Radius validation
- ✅ Spatial index performance

### Performance
- ✅ API response times (p95 targets)
- ✅ Page load times
- ✅ Database query performance
- ✅ Concurrent request handling

### Data Integrity
- ✅ Data consistency
- ✅ Data accuracy
- ✅ Foreign key relationships
- ✅ Data type validation

### Error Handling
- ✅ Input validation errors
- ✅ Authentication errors
- ✅ Not found errors
- ✅ Server errors
- ✅ Error recovery

### Regression Testing
- ✅ Core functionality verification
- ✅ API response format consistency
- ✅ Query parameter handling
- ✅ Performance baseline maintenance

## Performance Targets

### API Response Times
- **Spatial queries**: <200ms p95
- **Standard queries**: <100ms p95

### Page Load Times
- **Initial load**: <2s
- **Subsequent loads**: <1s

### Database Query Performance
- **Spatial queries**: <200ms p95
- **Standard queries**: <50ms p95

## Test Environment

Tests run against:
- **Base URL**: `http://localhost:3000` (configurable via `PLAYWRIGHT_TEST_BASE_URL`)
- **Browsers**: Chromium, Firefox, WebKit (configurable)
- **Mobile**: Mobile Chrome, Mobile Safari (configurable)

## Configuration

Configuration is in `playwright.config.ts`:
- Test directory: `./tests/e2e`
- Base URL: `http://localhost:3000`
- Web server: Automatically starts Next.js dev server
- Retries: 2 retries on CI, 0 locally
- Timeouts: 15s action, 30s navigation, 60s test

## Test Results

Test results are generated in:
- **HTML Report**: `playwright-report/index.html`
- **Screenshots**: On failure, saved to `test-results/`
- **Videos**: On failure, saved to `test-results/`
- **Traces**: On retry, saved to `test-results/`

View HTML report:
```bash
npx playwright show-report
```

## Notes

- Some tests may be skipped if database is not available
- Performance tests use relaxed thresholds for E2E environment
- Some tests may return 500 errors if database is not configured
- Tests are designed to be resilient to environment differences

## Continuous Integration

Tests are configured to:
- Run in parallel on CI
- Retry failed tests (2 retries)
- Generate HTML reports
- Capture screenshots and videos on failure
- Use single worker on CI for stability
