using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Precomputed sun exposure data for optimized serving
/// </summary>
public class PrecomputedSunExposure
{
    public int Id { get; set; }
    
    /// <summary>
    /// Patio this precomputed data applies to
    /// </summary>
    public int PatioId { get; set; }
    public Patio? Patio { get; set; }
    
    /// <summary>
    /// UTC timestamp for this sun exposure calculation
    /// </summary>
    public DateTime Timestamp { get; set; }
    
    /// <summary>
    /// Local time (Stockholm timezone) for this calculation
    /// </summary>
    public DateTime LocalTime { get; set; }
    
    /// <summary>
    /// Date partition key for efficient querying
    /// </summary>
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Time partition key for efficient querying
    /// </summary>
    public TimeOnly Time { get; set; }
    
    // Sun exposure data
    /// <summary>
    /// Percentage of patio area in direct sunlight (0-100)
    /// </summary>
    public double SunExposurePercent { get; set; }
    
    /// <summary>
    /// Sun exposure state classification
    /// </summary>
    public SunExposureState State { get; set; }
    
    /// <summary>
    /// Calculation confidence score (0-100)
    /// </summary>
    public double Confidence { get; set; }
    
    // Compressed geometric data for space efficiency
    /// <summary>
    /// GZip compressed WKB of sunlit geometry (nullable for space optimization)
    /// </summary>
    public byte[]? CompressedSunlitGeometry { get; set; }
    
    /// <summary>
    /// Sunlit area in square meters
    /// </summary>
    public double SunlitAreaSqM { get; set; }
    
    /// <summary>
    /// Shaded area in square meters
    /// </summary>
    public double ShadedAreaSqM { get; set; }
    
    // Solar position summary
    /// <summary>
    /// Solar elevation angle at calculation time
    /// </summary>
    public double SolarElevation { get; set; }
    
    /// <summary>
    /// Solar azimuth angle at calculation time
    /// </summary>
    public double SolarAzimuth { get; set; }
    
    /// <summary>
    /// Number of buildings affecting this patio's shadows
    /// </summary>
    public int AffectingBuildingsCount { get; set; }
    
    /// <summary>
    /// Time taken to compute this data point
    /// </summary>
    public TimeSpan CalculationDuration { get; set; }
    
    // Data lifecycle management
    /// <summary>
    /// When this data was computed
    /// </summary>
    public DateTime ComputedAt { get; set; }
    
    /// <summary>
    /// When this data expires and should be recomputed
    /// </summary>
    public DateTime ExpiresAt { get; set; }
    
    /// <summary>
    /// Algorithm version used for computation (for invalidation on updates)
    /// </summary>
    public string ComputationVersion { get; set; } = "1.0";
    
    /// <summary>
    /// Flag indicating data is stale and should be invalidated
    /// </summary>
    public bool IsStale { get; set; }
    
    /// <summary>
    /// Total patio area in square meters (cached for efficiency)
    /// </summary>
    public double TotalAreaSqM => SunlitAreaSqM + ShadedAreaSqM;
    
    /// <summary>
    /// Whether sun is visible above horizon
    /// </summary>
    public bool IsSunVisible => SolarElevation > 0;
}