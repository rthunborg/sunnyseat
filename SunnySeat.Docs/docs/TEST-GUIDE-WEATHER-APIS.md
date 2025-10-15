# Weather-Enhanced Sun Exposure API Testing Guide

## Overview

This guide documents the testing strategy and test scenarios for the weather-enhanced sun exposure calculation APIs implemented in Story 3.4.

## Test Structure

### 1. Controller Unit Tests

**Location**: `src/backend/SunnySeat.Api.Tests/Endpoints/`

**Purpose**: Validate API endpoint behavior, request validation, and response formatting.

#### SunExposureControllerTests.cs

Tests for `/api/sun-exposure/*` endpoints:

| Test                                                                  | Scenario                      | Expected Result                      |
| --------------------------------------------------------------------- | ----------------------------- | ------------------------------------ |
| `GetPatioSunExposure_ValidRequest_ReturnsOkWithData`                  | Valid patio ID and timestamp  | 200 OK with PatioSunExposureResponse |
| `GetPatioSunExposure_PatioNotFound_ReturnsNotFound`                   | Invalid patio ID              | 404 Not Found                        |
| `GetPatioSunExposure_NoTimestamp_UsesCurrentTime`                     | Request without timestamp     | Uses DateTime.UtcNow                 |
| `GetCurrentSunExposure_ValidPatioId_ReturnsOkWithCurrentData`         | Current exposure request      | 200 OK with current timestamp        |
| `GetSunExposureReliability_NoTimestamp_ReturnsReliabilityInfo`        | Reliability without timestamp | Returns confidence/reliability data  |
| `GetSunExposureReliability_WithTimestamp_UsesProvidedTime`            | Reliability with timestamp    | Uses specified timestamp             |
| `GetSunExposureReliability_MultipleCalls_ReturnsDeterministicResults` | Multiple calls same params    | Identical results (no randomness)    |

**Running Tests**:

```bash
dotnet test src/backend/SunnySeat.Api.Tests --filter "FullyQualifiedName~SunExposureControllerTests"
```

#### TimelineControllerTests.cs

Tests for `/api/timeline/*` endpoints:

| Test                                                             | Scenario               | Expected Result              |
| ---------------------------------------------------------------- | ---------------------- | ---------------------------- |
| `GetPatioTimeline_ValidParameters_ReturnsOkWithTimeline`         | Full timeline request  | 200 OK with timeline data    |
| `GetPatioTimeline_InvalidPatioId_ReturnsBadRequest`              | Invalid patio ID       | 400 Bad Request              |
| `GetPatioTimeline_NoParameters_UsesDefaults`                     | Request with defaults  | Uses default time range      |
| `GetTodayTimeline_ValidPatioId_ReturnsOkWithTodayTimeline`       | Today's timeline       | Timeline for current day     |
| `GetTomorrowTimeline_ValidPatioId_ReturnsOkWithTomorrowTimeline` | Tomorrow's timeline    | Timeline for next day        |
| `GetNext12HoursTimeline_ValidPatioId_ReturnsOkWithTimeline`      | 12-hour timeline       | Timeline for next 12 hours   |
| `GetBestSunWindows_ValidParameters_ReturnsOkWithWindows`         | Best sun windows       | Optimal sun exposure windows |
| `GetPatioTimeline_MultipleCalls_ReturnsConsistentResults`        | Deterministic behavior | Identical results on repeat  |

**Running Tests**:

```bash
dotnet test src/backend/SunnySeat.Api.Tests --filter "FullyQualifiedName~TimelineControllerTests"
```

### 2. Integration Tests

**Location**: `tests/SunnySeat.Integration.Tests/`

**Purpose**: Validate end-to-end functionality with real database and HTTP requests.

#### WeatherEnhancedTimelineIntegrationTests.cs

Full integration tests using TestContainers and PostgreSQL:

| Test                                                      | Scenario                 | Expected Result                    |
| --------------------------------------------------------- | ------------------------ | ---------------------------------- |
| `GetSunExposure_WithWeatherData_ReturnsAdjustedExposure`  | Exposure with weather    | Weather-adjusted sun exposure      |
| `GetSunTimeline_Today_ReturnsCompleteTimeline`            | Today's full timeline    | Complete timeline with data points |
| `GetSunTimeline_Tomorrow_ReturnsNextDayTimeline`          | Tomorrow's timeline      | Next day forecast                  |
| `GetSunTimeline_Next12Hours_ReturnsLimitedTimeline`       | Short-term timeline      | 12-hour projection                 |
| `GetBestSunWindows_ReturnsOptimalTimeSlots`               | Best windows calculation | Optimal sun exposure periods       |
| `GetSunExposureReliability_ReturnsWeatherConfidence`      | Reliability scoring      | Confidence metrics                 |
| `WeatherEnhancedTimeline_WithCloudCover_AdjustsExposure`  | High cloud cover         | Reduced exposure values            |
| `WeatherEnhancedTimeline_ConsistentResults_MultipleCalls` | Deterministic behavior   | Identical results                  |
| `GetSunTimeline_InvalidPatioId_ReturnsNotFound`           | Error handling           | 404 for missing patio              |

**Running Tests**:

```bash
# Requires Docker for TestContainers
dotnet test tests/SunnySeat.Integration.Tests --filter "FullyQualifiedName~WeatherEnhancedTimelineIntegrationTests"
```

**Prerequisites**:

- Docker Desktop running
- PostgreSQL image available (postgis/postgis:15-3.4)

### 3. Performance Benchmarks

**Location**: `tests/SunnySeat.Performance.Benchmarks/`

**Purpose**: Validate performance requirements (95th percentile <200ms).

#### SunExposurePerformanceBenchmarks.cs

| Benchmark                        | Measures                    | Target     |
| -------------------------------- | --------------------------- | ---------- |
| `GetSunExposure_WithWeatherData` | Sun exposure with timestamp | P95 <200ms |
| `GetSunExposure_CurrentTime`     | Current time exposure       | P95 <200ms |
| `GetSunTimeline_Today`           | Full day timeline           | P95 <200ms |
| `GetSunTimeline_Next12Hours`     | 12-hour timeline            | P95 <200ms |
| `GetReliabilityInfo`             | Reliability calculation     | Mean <10ms |

**Running Benchmarks**:

```bash
cd tests/SunnySeat.Performance.Benchmarks
dotnet run -c Release
```

**Note**: Always run in Release configuration for accurate measurements.

## Test Scenarios

### Weather Integration Scenarios

#### 1. Clear Weather

- **Cloud Cover**: 0-20%
- **Expected**: Minimal adjustment to baseline sun exposure
- **Reliability**: High confidence scores

#### 2. Partly Cloudy

- **Cloud Cover**: 20-60%
- **Expected**: Moderate adjustment to sun exposure
- **Reliability**: Medium confidence scores

#### 3. Overcast

- **Cloud Cover**: 60-100%
- **Expected**: Significant reduction in sun exposure
- **Reliability**: Lower confidence for long-term forecasts

#### 4. Missing Weather Data

- **Scenario**: No weather data available
- **Expected**: Graceful degradation to baseline calculation
- **Reliability**: Marked as "estimated" or "no weather data"

### Timeline Calculation Scenarios

#### Today's Timeline

- **Time Range**: Midnight to midnight (local time)
- **Resolution**: 10-minute intervals
- **Data Points**: ~144 points per day
- **Weather**: Current conditions + short-term forecast

#### Tomorrow's Timeline

- **Time Range**: Tomorrow midnight to midnight
- **Resolution**: 10-minute intervals
- **Weather**: Forecast data only
- **Reliability**: Lower than today due to forecast uncertainty

#### Next 12 Hours

- **Time Range**: Now to +12 hours
- **Resolution**: 10-minute intervals
- **Weather**: Mix of current + short-term forecast
- **Reliability**: High for first few hours, decreasing

#### Best Sun Windows

- **Purpose**: Find optimal sun exposure periods
- **Criteria**: Highest average exposure, longest duration
- **Minimum Duration**: Configurable (default: 30 minutes)
- **Weather Impact**: Filters out periods with poor weather

## Coverage Metrics

### Target Coverage

- **Controller Layer**: >90% code coverage
- **Service Layer**: >80% code coverage
- **Integration Flows**: All critical paths tested

### Running Coverage Reports

```bash
# Generate coverage report
dotnet test --collect:"XPlat Code Coverage" --settings coverlet.runsettings

# View results in coverage report
# (specific tool depends on your coverage reporter)
```

## Test Data

### Test Patio Geometry

All tests use realistic patio geometries:

```csharp
// Simple square patio (10m x 10m approximately)
Coordinates:
- Southwest: (11.9745, 57.7089)
- Southeast: (11.9755, 57.7089)
- Northeast: (11.9755, 57.7099)
- Northwest: (11.9745, 57.7099)
- Close: (11.9745, 57.7089)
```

### Test Weather Data

```csharp
WeatherSlice:
- CloudCover: 20.0 (default clear)
- Temperature: 20.0°C
- PrecipitationProbability: 0.0
- IsForecast: false (nowcast)
- Source: "test"
```

## Continuous Integration

### CI/CD Pipeline Integration

Add to your CI/CD workflow:

```yaml
- name: Run Unit Tests
  run: dotnet test --filter "Category=Unit"

- name: Run Integration Tests
  run: dotnet test --filter "Category=Integration"
  # Requires Docker

- name: Generate Coverage
  run: dotnet test --collect:"XPlat Code Coverage"

- name: Run Performance Benchmarks (optional)
  run: |
    cd tests/SunnySeat.Performance.Benchmarks
    dotnet run -c Release
  # Only on tagged releases or manual trigger
```

## Troubleshooting

### Integration Tests Failing

**"Docker not available"**

- Ensure Docker Desktop is running
- Check Docker daemon is accessible

**"Database connection timeout"**

- Wait for TestContainers to fully initialize
- Check system resources (Docker memory limits)

**"Tests pass individually but fail in batch"**

- Check for test interdependencies
- Ensure proper cleanup in test fixtures
- Verify PostgresTestFixture.ResetDatabaseAsync() is called

### Performance Issues

**"Benchmarks show >200ms"**

1. Verify running in Release mode
2. Close background applications
3. Check for database query optimization
4. Review caching configuration
5. Monitor memory allocations

**"Inconsistent benchmark results"**

- Increase warmup iterations
- Run on dedicated benchmark server
- Check for thermal throttling

## Related Documentation

- [Story 3.4 - Weather-Enhanced Calculations](./STORY-3.4.md)
- [Story 3.6 - Test Completion](./3.6.test-completion-enhanced-apis.md)
- [Performance Benchmarks README](../../tests/SunnySeat.Performance.Benchmarks/README.md)
- [Developer Guide](../DEV_ENVIRONMENT.md)

## Test Maintenance

### Adding New Tests

1. **Controller Tests**: Add to appropriate controller test class
2. **Integration Tests**: Add to WeatherEnhancedTimelineIntegrationTests
3. **Benchmarks**: Add to SunExposurePerformanceBenchmarks with `[Benchmark]` attribute

### Updating Test Data

When entities change:

1. Update helper methods in test classes
2. Review entity property usage in assertions
3. Update test documentation

### Best Practices

- ✅ Use AAA pattern (Arrange, Act, Assert)
- ✅ Test one thing per test method
- ✅ Use descriptive test names (MethodName_Scenario_ExpectedResult)
- ✅ Mock external dependencies
- ✅ Use FluentAssertions for readable assertions
- ✅ Ensure tests are deterministic
- ✅ Clean up resources in test fixtures
- ❌ Don't use Thread.Sleep for timing
- ❌ Don't depend on test execution order
- ❌ Don't share mutable state between tests

## Contact

For questions or issues with tests, contact the development team or create an issue in the project repository.
