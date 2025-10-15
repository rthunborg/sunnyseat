namespace SunnySeat.Core.Models;

/// <summary>
/// Result of building data import operation
/// </summary>
public record ImportResult
{
    public bool Success { get; init; }
    public int BuildingsImported { get; init; }
    public int BuildingsSkipped { get; init; }
    public int BuildingsWithErrors { get; init; }
    public List<string> Errors { get; init; } = new();
    public List<string> Warnings { get; init; } = new();
    public TimeSpan Duration { get; init; }
    public string? SourceFile { get; init; }
}

/// <summary>
/// Result of file validation operation
/// </summary>
public record ValidationResult
{
    public bool IsValid { get; init; }
    public List<string> Errors { get; init; } = new();
    public List<string> Warnings { get; init; } = new();
    public int? EstimatedBuildingCount { get; init; }
    public string? CoordinateSystem { get; init; }
    public List<string> AvailableLayers { get; init; } = new();
}

/// <summary>
/// GDAL availability and version information
/// </summary>
public record GdalStatus
{
    public bool IsAvailable { get; init; }
    public string? Version { get; init; }
    public string? ErrorMessage { get; init; }
    public bool HasPostGISSupport { get; init; }
    public List<string> AvailableDrivers { get; init; } = new();
}