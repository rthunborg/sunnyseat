namespace SunnySeat.Shared;

/// <summary>
/// Shared constants and utilities across SunnySeat projects
/// </summary>
public static class GlobalConstants
{
    /// <summary>
    /// Default SRID for spatial data (WGS84)
    /// </summary>
    public const int DefaultSrid = 4326;
    
    /// <summary>
    /// Maximum search radius in meters for location-based queries
    /// </summary>
    public const double MaxSearchRadius = 10000.0;
    
    /// <summary>
    /// Minimum search radius in meters for location-based queries
    /// </summary>
    public const double MinSearchRadius = 10.0;
}