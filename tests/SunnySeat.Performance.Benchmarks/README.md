# SunnySeat Performance Benchmarks

This project contains performance benchmarks for the SunnySeat sun exposure calculation APIs using BenchmarkDotNet.

## Purpose

Validates Story 3.4 AC3: **95th percentile response time <200ms** for weather-enhanced sun exposure calculations.

## Benchmarks Included

1. **GetSunExposure_WithWeatherData** - Sun exposure calculation with specified timestamp and weather data
2. **GetSunExposure_CurrentTime** - Sun exposure calculation for current time
3. **GetSunTimeline_Today** - Full day timeline calculation (24 hours)
4. **GetSunTimeline_Next12Hours** - 12-hour timeline calculation
5. **GetReliabilityInfo** - Weather confidence/reliability calculation

## Running the Benchmarks

### Prerequisites

- .NET 8.0 SDK
- Release build configuration (required for accurate measurements)

### Command

```bash
cd tests/SunnySeat.Performance.Benchmarks
dotnet run -c Release
```

### Expected Output

BenchmarkDotNet will display:

- **Mean** - Average execution time
- **StdDev** - Standard deviation
- **Median** - Median execution time
- **Gen0/Gen1/Gen2** - Garbage collection statistics
- **Allocated** - Memory allocation per operation

### Performance Targets

| Benchmark                      | Target (95th percentile) | Notes               |
| ------------------------------ | ------------------------ | ------------------- |
| GetSunExposure_WithWeatherData | <200ms                   | Story 3.4 AC3       |
| GetSunExposure_CurrentTime     | <200ms                   | Story 3.4 AC3       |
| GetSunTimeline_Today           | <200ms                   | Story 3.4 AC3       |
| GetSunTimeline_Next12Hours     | <200ms                   | Story 3.4 AC3       |
| GetReliabilityInfo             | <10ms                    | Should be very fast |

## Interpreting Results

### Response Time Analysis

Look for the **P95** (95th percentile) or **P99** (99th percentile) values in the results. If BenchmarkDotNet doesn't show percentiles by default, calculate from the distribution:

- P95 should be <200ms for all main operations
- Mean should typically be <150ms
- Any operation >200ms in P95 requires optimization

### Memory Allocation

Monitor the **Allocated** column:

- Lower is better
- Watch for excessive Gen2 collections (indicates large object allocations)
- Aim for minimal allocations per operation

## Customization

### Adjusting Iterations

Modify attributes in `SunExposurePerformanceBenchmarks.cs`:

```csharp
[SimpleJob(warmupCount: 3, iterationCount: 100)]
```

- `warmupCount`: Number of warmup iterations (default: 3)
- `iterationCount`: Number of measurement iterations (default: 100)

### Adding New Benchmarks

Add methods with `[Benchmark]` attribute:

```csharp
[Benchmark]
public async Task<MyResult> MyNewBenchmark()
{
    return await _service.MyMethodAsync();
}
```

## Continuous Integration

### CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: Run Performance Benchmarks
  run: dotnet run -c Release --project tests/SunnySeat.Performance.Benchmarks
```

### Performance Regression Detection

Monitor benchmark results over time:

1. Store results in artifact storage
2. Compare against baseline measurements
3. Fail build if performance degrades >10%

## Troubleshooting

### "Debug configuration detected"

**Solution**: Always run with `-c Release` flag. Debug builds have optimizations disabled.

### Inconsistent Results

**Causes**:

- Background processes consuming CPU
- Thermal throttling
- Power management settings

**Solutions**:

- Close unnecessary applications
- Run on dedicated benchmark server
- Use `[SimpleJob]` with more iterations for stability

### Out of Memory

**Cause**: Too many iterations or large test data

**Solutions**:

- Reduce `iterationCount`
- Optimize test data size
- Increase available memory

## Baseline Measurements

Document your baseline measurements here after first run:

```
// Example baseline (replace with actual results):
// Hardware: [Your specs]
// Date: [Date of measurement]
//
// GetSunExposure_WithWeatherData:
//   Mean: XXms, P95: XXms, Allocated: XXX KB
//
// GetSunTimeline_Today:
//   Mean: XXms, P95: XXms, Allocated: XXX KB
```

## Related Documentation

- [Story 3.4](../../SunnySeat.Docs/docs/stories/STORY-3.4.md) - Weather-enhanced sun exposure calculations
- [Story 3.6](../../SunnySeat.Docs/docs/stories/3.6.test-completion-enhanced-apis.md) - Test completion story
- [BenchmarkDotNet Documentation](https://benchmarkdotnet.org/)

## License

Same as parent project.
