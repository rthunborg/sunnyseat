# Story 3.1 QA Testing Guide

# Weather Data Integration Pipeline

**Story**: 3.1 - Weather Data Integration Pipeline  
**Status**: Ready for QA  
**Build Status**: ✅ Compiles Successfully (0 errors)  
**QA Priority**: P1 - Can proceed independently of Epic 2 regression fixes  
**Created**: October 6, 2025

---

## Quick Start for QA

### Prerequisites

1. ✅ .NET 8.0 SDK installed
2. ✅ PostgreSQL with PostGIS running
3. ✅ OpenWeatherMap API Key: `2d1b6d709917a015d422387dde381246`
4. ✅ Internet connection (for Met.no API access)

### Configuration

Verify `appsettings.json` contains:

```json
{
  "Weather": {
    "OpenWeatherMapApiKey": "2d1b6d709917a015d422387dde381246",
    "UpdateIntervalMinutes": 10,
    "DataRetentionDays": 7
  }
}
```

### Running the Application

```bash
cd d:\SunnySeat\src\backend\SunnySeat.Api
dotnet run
```

---

## Acceptance Criteria Testing

### AC1: Weather Data Ingestion (5-10 Minutes)

**Expected**: Weather data automatically fetched every 10 minutes from Met.no

**Test Steps**:

1. Start the application
2. Check logs for: `"Starting weather data ingestion..."`
3. Wait 10 minutes
4. Verify new weather data in database:
   ```sql
   SELECT * FROM "WeatherSlices"
   ORDER BY "Timestamp" DESC
   LIMIT 5;
   ```
5. Verify `Source = "Met.no"` in normal operations

**Success Criteria**:

- ✅ Logs show ingestion starting every 10 minutes
- ✅ New records appear in database
- ✅ Timestamps are within last 10 minutes

### AC2: Automatic Fallback to OpenWeatherMap

**Expected**: System uses OpenWeatherMap when Met.no is unavailable

**Test Steps**:

1. **Simulate Met.no failure** (block api.met.no in hosts file or firewall)
2. Start application
3. Check logs for: `"Met.no service unavailable, falling back to OpenWeatherMap"`
4. Verify weather data still being ingested:
   ```sql
   SELECT * FROM "WeatherSlices"
   WHERE "Source" = 'OpenWeatherMap'
   ORDER BY "Timestamp" DESC;
   ```

**Success Criteria**:

- ✅ Fallback triggered automatically
- ✅ Weather data continues to flow
- ✅ Source = "OpenWeatherMap" in database
- ✅ No application crashes

**Cleanup**: Restore Met.no access after test

### AC3: Gothenburg Area Coverage

**Expected**: Weather data covers Gothenburg coordinates (57.7089°N, 11.9746°E)

**Test Steps**:

1. Check ingested weather data coordinates:
   ```sql
   SELECT "Latitude", "Longitude", "Source"
   FROM "WeatherSlices"
   ORDER BY "Timestamp" DESC
   LIMIT 1;
   ```
2. Verify coordinates are approximately:
   - Latitude: 57.7089 ± 0.1
   - Longitude: 11.9746 ± 0.1

**Success Criteria**:

- ✅ Coordinates match Gothenburg area
- ✅ Both Met.no and OpenWeatherMap use correct location

### AC4: API Rate Limits and Retry Logic

**Expected**: 10-minute intervals, timeout handling

**Test Steps**:

1. Monitor logs for ingestion timing:
   ```
   2025-10-06 14:00:00 - Weather ingestion completed
   2025-10-06 14:10:00 - Weather ingestion completed
   2025-10-06 14:20:00 - Weather ingestion completed
   ```
2. Verify interval is ~10 minutes (±30 seconds tolerance)
3. Check for timeout handling in logs (should see graceful failures, not crashes)

**Success Criteria**:

- ✅ Consistent 10-minute intervals
- ✅ No rate limit errors from APIs
- ✅ Graceful timeout handling
- ✅ Application remains stable after API errors

### AC5: 7-Day Retention Policy

**Expected**: Weather data older than 7 days automatically deleted

**Test Steps**:

1. Insert test data older than 7 days:
   ```sql
   INSERT INTO "WeatherSlices"
   ("Timestamp", "Latitude", "Longitude", "Source", "TemperatureCelsius")
   VALUES
   (NOW() - INTERVAL '8 days', 57.7089, 11.9746, 'Test', 20.0),
   (NOW() - INTERVAL '6 days', 57.7089, 11.9746, 'Test', 21.0);
   ```
2. Wait for next cleanup cycle (runs during ingestion)
3. Verify old data removed:
   ```sql
   SELECT COUNT(*) FROM "WeatherSlices"
   WHERE "Timestamp" < NOW() - INTERVAL '7 days';
   ```

**Success Criteria**:

- ✅ Count = 0 (8-day-old record deleted)
- ✅ 6-day-old record still exists
- ✅ Cleanup runs automatically

---

## Health Check Testing

### Endpoint: `/health`

**Expected**: Returns weather service status

**Test Steps**:

1. Navigate to: `http://localhost:5000/health`
2. Verify JSON response includes weather status:
   ```json
   {
     "status": "Healthy",
     "results": {
       "weather": {
         "status": "Healthy",
         "description": "Met.no: Available, OpenWeatherMap: Available, Data Count: 144, Last Update: 2025-10-06T14:30:00Z"
       }
     }
   }
   ```

**Test Scenarios**:
| Scenario | Expected Status | Description |
|----------|----------------|-------------|
| Both APIs available + recent data | Healthy | Normal operation |
| Met.no down, OpenWeatherMap up | Degraded | Fallback active |
| Both APIs down, recent data exists | Degraded | Using cached data |
| Both APIs down, stale data | Unhealthy | No fresh data |

**Success Criteria**:

- ✅ Health endpoint responds
- ✅ Correct status for each scenario
- ✅ Diagnostic data included

---

## Integration Testing

### Background Service Lifecycle

**Test Steps**:

1. Start application
2. Verify `WeatherIngestionService` starts:
   ```
   LOG: Hosted service WeatherIngestionService starting
   ```
3. Stop application gracefully (Ctrl+C)
4. Verify service stops cleanly:
   ```
   LOG: Hosted service WeatherIngestionService stopping
   ```

**Success Criteria**:

- ✅ Service starts automatically
- ✅ Service runs in background
- ✅ Service stops cleanly on shutdown
- ✅ No hanging processes

### Database Integration

**Test Steps**:

1. Verify weather data persists across restarts
2. Check for database errors in logs
3. Verify spatial queries work:
   ```sql
   SELECT * FROM "WeatherSlices"
   WHERE ST_DWithin(
     Geography(ST_MakePoint("Longitude", "Latitude")),
     Geography(ST_MakePoint(11.9746, 57.7089)),
     1000  -- 1km radius
   );
   ```

**Success Criteria**:

- ✅ Data persists correctly
- ✅ No database connection errors
- ✅ Spatial queries execute successfully

---

## Performance Testing

### Response Time Requirements

| Operation                  | Requirement | Test Method  |
| -------------------------- | ----------- | ------------ |
| API call to Met.no         | < 5 seconds | Monitor logs |
| API call to OpenWeatherMap | < 5 seconds | Monitor logs |
| Database write (batch)     | < 1 second  | Monitor logs |
| Cleanup operation          | < 5 seconds | Monitor logs |

**Test Steps**:

1. Enable detailed timing logs
2. Monitor ingestion cycle times
3. Verify performance meets requirements

**Success Criteria**:

- ✅ All operations within time limits
- ✅ No performance degradation over time
- ✅ CPU/memory usage remains stable

---

## Error Handling Testing

### Scenarios to Test

1. **Network Timeout**

   - Disconnect network briefly during ingestion
   - Verify: Graceful error, retry on next cycle

2. **Invalid API Response**

   - Mock corrupted JSON from API (if possible)
   - Verify: Error logged, application stable

3. **Database Connection Lost**

   - Stop PostgreSQL during ingestion
   - Verify: Error logged, retry logic works, no crash

4. **Invalid Configuration**
   - Remove API key from config
   - Verify: OpenWeatherMap fails gracefully, Met.no still works

**Success Criteria**:

- ✅ No unhandled exceptions
- ✅ Errors logged clearly
- ✅ Application recovers automatically
- ✅ User-friendly error messages

---

## Known Issues & Limitations

### ⚠️ Pre-existing Epic 2 Test Failures

- **Status**: 94 tests failing in Epic 2 (solar calculations)
- **Impact on Story 3.1**: **NONE** - Weather integration has no dependencies on solar math
- **QA Action**: **IGNORE** Epic 2 failures during Story 3.1 testing
- **Reference**: See `docs/qa/epic-2-regression-bugs.md`

### 🔧 Weather Service Unit Tests

- **Status**: 3/5 tests require WireMock or live APIs
- **Reason**: HttpClient factory pattern prevents simple mocking
- **Impact**: Unit tests validate service logic but not HTTP integration
- **QA Action**: Perform **manual integration testing** with live APIs (this guide)
- **Future Enhancement**: Implement WireMock.NET for automated integration tests

---

## Test Data Verification

### Sample Weather Data Check

After successful ingestion, verify data quality:

```sql
SELECT
    "Timestamp",
    "Source",
    "TemperatureCelsius",
    "CloudCoverPercentage",
    "WindSpeedMetersPerSecond",
    "Latitude",
    "Longitude"
FROM "WeatherSlices"
ORDER BY "Timestamp" DESC
LIMIT 10;
```

**Expected Values** (Gothenburg, October):

- Temperature: 5-15°C (reasonable for season)
- Cloud Cover: 0-100%
- Wind Speed: 0-20 m/s (reasonable range)
- Coordinates: Gothenburg area

**Validation**:

- ✅ All fields populated (not null)
- ✅ Values within reasonable ranges
- ✅ Timestamps sequential
- ✅ Both sources represented over time

---

## Regression Testing

### Verify No Impact on Existing Features

1. **Health Checks**

   - Test all other health checks still work
   - Verify overall `/health` endpoint includes weather status

2. **Application Startup**

   - Application starts in < 30 seconds
   - No new errors in startup logs
   - All existing services still running

3. **Database**
   - No schema conflicts
   - Existing tables unaffected
   - No performance degradation

**Success Criteria**:

- ✅ All existing features work as before
- ✅ No performance regressions
- ✅ Clean integration with existing code

---

## Sign-Off Checklist

### Functional Requirements

- [ ] AC1: Weather ingestion every 10 minutes (PASS/FAIL)
- [ ] AC2: Automatic fallback to OpenWeatherMap (PASS/FAIL)
- [ ] AC3: Gothenburg area coverage (PASS/FAIL)
- [ ] AC4: API rate limits and retry logic (PASS/FAIL)
- [ ] AC5: 7-day retention policy (PASS/FAIL)

### Non-Functional Requirements

- [ ] Performance within acceptable limits (PASS/FAIL)
- [ ] Error handling graceful and clear (PASS/FAIL)
- [ ] Health check endpoint working (PASS/FAIL)
- [ ] Background service lifecycle correct (PASS/FAIL)
- [ ] No regression in existing features (PASS/FAIL)

### Quality Gates

- [ ] Build succeeds with 0 errors ✅
- [ ] No new warnings introduced (PASS/FAIL)
- [ ] Integration testing completed (PASS/FAIL)
- [ ] Performance testing completed (PASS/FAIL)
- [ ] Error scenario testing completed (PASS/FAIL)

### QA Recommendation

- [ ] **APPROVE** - Ready for Production
- [ ] **APPROVE WITH NOTES** - Ready with minor observations
- [ ] **REJECT** - Issues found, return to development

---

## QA Notes Section

**Tester**: **\*\***\_**\*\***  
**Date**: **\*\***\_**\*\***  
**Environment**: **\*\***\_**\*\***  
**Build Version**: **\*\***\_**\*\***

### Issues Found

| #   | Severity | Description | Steps to Reproduce |
| --- | -------- | ----------- | ------------------ |
| 1   |          |             |                    |
| 2   |          |             |                    |

### Observations

_Notes on performance, usability, edge cases, etc._

---

## Contact Information

**Developer**: James (Dev Agent)  
**Story Owner**: Sarah (PO)  
**QA Lead**: **\*\***\_**\*\***

**Reference Documents**:

- Story: `docs/stories/3.1.weather-data-integration-pipeline.md`
- Epic 2 Bugs: `docs/qa/epic-2-regression-bugs.md`
- Architecture: `docs/architecture.md`

---

**Document Version**: 1.0  
**Last Updated**: October 6, 2025  
**Status**: Ready for QA Testing
