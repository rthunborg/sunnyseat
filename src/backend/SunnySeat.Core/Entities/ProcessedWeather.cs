using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents processed weather data with sun-relevant conditions and patio-level estimates
/// </summary>
public class ProcessedWeather
{
    public int Id { get; set; }

    /// <summary>
    /// Reference to the source WeatherSlice
    /// </summary>
    public int WeatherSliceId { get; set; }

    /// <summary>
    /// Navigation property to source weather data
    /// </summary>
    public WeatherSlice? WeatherSlice { get; set; }

    /// <summary>
    /// Timestamp for this processed weather data
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Normalized cloud cover percentage (0-100)
    /// </summary>
    public double NormalizedCloudCover { get; set; }

    /// <summary>
    /// Precipitation intensity in mm/hour
    /// </summary>
    public double PrecipitationIntensity { get; set; }

    /// <summary>
    /// Weather condition category for sun prediction
    /// </summary>
    public WeatherCondition Condition { get; set; }

    /// <summary>
    /// Whether current conditions are sun-blocking
    /// </summary>
    public bool IsSunBlocking { get; set; }

    /// <summary>
    /// Confidence level in this processed data (0.0-1.0)
    /// </summary>
    public double ConfidenceLevel { get; set; }

    /// <summary>
    /// Optional: Spatial location for patio-specific weather (EPSG:4326)
    /// </summary>
    public Point? Location { get; set; }

    /// <summary>
    /// Timestamp when this data was processed
    /// </summary>
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Weather condition categories for sun prediction
/// </summary>
public enum WeatherCondition
{
    /// <summary>
    /// Clear skies, cloud cover less than 20%
    /// </summary>
    Clear = 0,

    /// <summary>
    /// Partly cloudy, cloud cover between 20-70%
    /// </summary>
    PartlyCloudy = 1,

    /// <summary>
    /// Cloudy, cloud cover greater than 70%
    /// </summary>
    Cloudy = 2,

    /// <summary>
    /// Overcast with heavy clouds, cloud cover greater than 80%
    /// </summary>
    Overcast = 3,

    /// <summary>
    /// Precipitation occurring
    /// </summary>
    Precipitation = 4,

    /// <summary>
    /// Low visibility conditions
    /// </summary>
    LowVisibility = 5
}
