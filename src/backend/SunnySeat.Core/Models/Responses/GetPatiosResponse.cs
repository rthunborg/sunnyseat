using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Models.Responses;

/// <summary>
/// Response model for patio search with sun exposure data
/// </summary>
public class GetPatiosResponse
{
    /// <summary>
    /// Collection of patios with current sun exposure data
    /// </summary>
    public IEnumerable<PatioDataDto> Patios { get; set; } = new List<PatioDataDto>();

    /// <summary>
    /// Timestamp when the sun exposure was calculated (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Total number of patios found in the search area
    /// </summary>
    public int TotalCount { get; set; }
}

/// <summary>
/// Data transfer object for individual patio with sun exposure information
/// </summary>
public class PatioDataDto
{
    /// <summary>
    /// Unique patio identifier (combination of venueId and patioId)
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Venue identifier
    /// </summary>
    public string VenueId { get; set; } = string.Empty;

    /// <summary>
    /// Venue name
    /// </summary>
    public string VenueName { get; set; } = string.Empty;

    /// <summary>
    /// Patio location (centroid of patio geometry)
    /// </summary>
    public CoordinatesDto Location { get; set; } = new CoordinatesDto();

    /// <summary>
    /// Current sun exposure state
    /// </summary>
    public string CurrentSunStatus { get; set; } = "Shaded";

    /// <summary>
    /// Confidence percentage (0-100)
    /// </summary>
    public int Confidence { get; set; }

    /// <summary>
    /// Distance from search point in meters
    /// </summary>
    public double DistanceMeters { get; set; }

    /// <summary>
    /// Sun exposure percentage (0-100)
    /// </summary>
    public double SunExposurePercent { get; set; }
}

/// <summary>
/// Geographic coordinates DTO
/// </summary>
public class CoordinatesDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
