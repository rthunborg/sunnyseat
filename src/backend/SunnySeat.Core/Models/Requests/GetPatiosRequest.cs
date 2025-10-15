using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Models.Requests;

/// <summary>
/// Request model for searching patios by location and radius
/// </summary>
public class GetPatiosRequest
{
    /// <summary>
    /// Latitude of the search center point (WGS84)
    /// </summary>
    public double Latitude { get; set; }

    /// <summary>
    /// Longitude of the search center point (WGS84)
    /// </summary>
    public double Longitude { get; set; }

    /// <summary>
    /// Search radius in kilometers (max 3.0 km, defaults to 1.5 km if not specified)
    /// </summary>
    public double? RadiusKm { get; set; }

    /// <summary>
    /// Timestamp for sun exposure calculation (optional, defaults to current time)
    /// </summary>
    public DateTime? Timestamp { get; set; }
}
