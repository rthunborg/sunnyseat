# P1 Outcome — Weather Provider Decision + Adapter SPEC

## Decision
Use **MET Norway (Yr/api.met.no)** as primary; fallback to locationforecast when nowcast out‑of‑horizon. Confidence caps per PRD.

## Adapter Interface (C#)
```csharp
public interface IWeatherProvider
{
  Task<CloudSlice> GetCloudSliceAsync(double lat, double lng, DateTimeOffset when, CancellationToken ct);
  IAsyncEnumerable<CloudSlice> StreamCloudWindowAsync(double lat, double lng, DateTimeOffset from, DateTimeOffset to, TimeSpan step, CancellationToken ct);
}
public record CloudSlice(DateTimeOffset Ts, double CloudCoverFrac, double Certainty, string Source, string? Notes=null);
```

## Mock Provider (CI)
Deterministic fixtures for clear/cloudy/changing/provider‑down cases; selectable by config.
