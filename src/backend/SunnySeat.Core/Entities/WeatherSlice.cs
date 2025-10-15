namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents weather data for confidence calculations
/// </summary>
public class WeatherSlice
{
    public int Id { get; set; }
    
    /// <summary>
    /// Timestamp for this weather observation/forecast
    /// </summary>
    public DateTime Timestamp { get; set; }
    
    /// <summary>
    /// Cloud cover percentage (0 to 100)
    /// </summary>
    public double CloudCover { get; set; }
    
    /// <summary>
    /// Precipitation probability (0.0 to 1.0)
    /// </summary>
    public double PrecipitationProbability { get; set; }
    
    /// <summary>
    /// Temperature in Celsius
    /// </summary>
    public double Temperature { get; set; }
    
    /// <summary>
    /// Visibility in kilometers
    /// </summary>
    public double? Visibility { get; set; }
    
    /// <summary>
    /// Whether this is forecast data (true) or nowcast/observation (false)
    /// </summary>
    public bool IsForecast { get; set; }
    
    /// <summary>
    /// Source of weather data (e.g., "yr.no", "openweathermap")
    /// </summary>
    public string Source { get; set; } = string.Empty;
    
    /// <summary>
    /// Timestamp when this weather data was ingested
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}