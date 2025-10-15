using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Core.Models.Requests;

/// <summary>
/// Request for batch sun exposure calculation
/// </summary>
public class BatchSunExposureRequest
{
    /// <summary>
    /// List of patio IDs to calculate sun exposure for
    /// </summary>
    [Required]
    public IEnumerable<int> PatioIds { get; set; } = new List<int>();

    /// <summary>
    /// Timestamp for sun exposure calculation (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Optional filter for minimum confidence level (0-100)
    /// </summary>
    [Range(0, 100)]
    public double? MinimumConfidence { get; set; }
}

/// <summary>
/// Request for sun exposure timeline calculation
/// </summary>
public class SunExposureTimelineRequest
{
    /// <summary>
    /// Patio ID for timeline calculation
    /// </summary>
    [Required]
    public int PatioId { get; set; }

    /// <summary>
    /// Start time for timeline (UTC)
    /// </summary>
    [Required]
    public DateTime StartTime { get; set; }

    /// <summary>
    /// End time for timeline (UTC)
    /// </summary>
    [Required]
    public DateTime EndTime { get; set; }

    /// <summary>
    /// Interval between calculations in minutes (default: 10 minutes)
    /// </summary>
    [Range(1, 1440)] // 1 minute to 24 hours
    public int IntervalMinutes { get; set; } = 10;
}

/// <summary>
/// Request for finding sunny patios near a location
/// </summary>
public class SunnyPatiosNearRequest
{
    /// <summary>
    /// Latitude of search center
    /// </summary>
    [Required]
    [Range(-90, 90)]
    public double Latitude { get; set; }

    /// <summary>
    /// Longitude of search center
    /// </summary>
    [Required]
    [Range(-180, 180)]
    public double Longitude { get; set; }

    /// <summary>
    /// Search radius in kilometers (default: 1.5km)
    /// </summary>
    [Range(0.1, 50)]
    public double RadiusKm { get; set; } = 1.5;

    /// <summary>
    /// Timestamp for sun exposure calculation (optional, defaults to current time)
    /// </summary>
    public DateTime? Timestamp { get; set; }

    /// <summary>
    /// Minimum sun exposure percentage to consider "sunny" (default: 70%)
    /// </summary>
    [Range(0, 100)]
    public double MinimumSunExposure { get; set; } = 70.0;

    /// <summary>
    /// Maximum number of results to return (default: 20)
    /// </summary>
    [Range(1, 100)]
    public int MaxResults { get; set; } = 20;
}