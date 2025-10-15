using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents sun exposure state for a patio at a specific timestamp
/// </summary>
public class PatioSunExposure
{
    public int PatioId { get; set; }
    public Patio Patio { get; set; } = null!;
    public DateTime Timestamp { get; set; }
    public DateTime LocalTime { get; set; }

    // Core sun exposure metrics
    public double SunExposurePercent { get; set; }    // 0-100% of patio in direct sun
    public SunExposureState State { get; set; }       // Sunny, Partial, Shaded
    public double Confidence { get; set; }            // 0-100% calculation confidence

    // Detailed exposure information
    public Polygon? SunlitGeometry { get; set; }       // Sunlit area within patio
    public Polygon? ShadedGeometry { get; set; }       // Shaded area within patio
    public double SunlitAreaSqM { get; set; }         // Sunlit area in square meters
    public double ShadedAreaSqM { get; set; }         // Shaded area in square meters

    // Contributing factors
    public SolarPosition SolarPosition { get; set; } = null!;  // Sun position used
    public IEnumerable<ShadowProjection> Shadows { get; set; } = new List<ShadowProjection>(); // Affecting shadows
    public ConfidenceFactors ConfidenceBreakdown { get; set; } = new ConfidenceFactors(); // Confidence details
    public WeatherSlice? WeatherData { get; set; } // Weather data used in calculation (optional)

    // Metadata
    public TimeSpan CalculationDuration { get; set; }
    public string CalculationSource { get; set; } = "realtime";     // "realtime" or "precomputed"
}

/// <summary>
/// Enumeration of sun exposure states
/// </summary>
public enum SunExposureState
{
    Sunny,      // > 70% in direct sun
    Partial,    // 30-70% in direct sun  
    Shaded,     // < 30% in direct sun
    NoSun       // Sun below horizon
}

/// <summary>
/// Detailed confidence scoring breakdown
/// </summary>
public class ConfidenceFactors
{
    // Legacy individual confidence components
    public double BuildingDataQuality { get; set; }   // 0-1: Building height data quality
    public double GeometryPrecision { get; set; }     // 0-1: Patio polygon precision
    public double SolarAccuracy { get; set; }         // 0-1: Solar position accuracy
    public double ShadowAccuracy { get; set; }        // 0-1: Shadow calculation accuracy

    // New weather-aware confidence components
    public double GeometryQuality { get; set; }       // 0-1: Combined geometry quality (building + patio + shadow)
    public double CloudCertainty { get; set; }        // 0-1: Weather prediction confidence

    public double OverallConfidence { get; set; }     // 0-1: Weighted overall score
    public string ConfidenceCategory { get; set; } = "Medium";    // "High", "Medium", "Low"
    public IEnumerable<string> QualityIssues { get; set; } = new List<string>(); // Identified quality concerns
    public IEnumerable<string> Improvements { get; set; } = new List<string>();  // Suggested improvements
}