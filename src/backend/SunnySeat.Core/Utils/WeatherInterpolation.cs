using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Utils;

/// <summary>
/// Utility class for spatial and temporal interpolation of weather data
/// Implements bilinear interpolation for patio-specific weather estimation
/// </summary>
public static class WeatherInterpolation
{
    /// <summary>
    /// Interpolates weather data for a specific patio location from grid data
    /// Uses bilinear interpolation for spatial estimation
    /// </summary>
    /// <param name="patioLocation">Patio location point (EPSG:4326)</param>
    /// <param name="gridWeatherData">Weather data from grid points</param>
    /// <param name="gridResolutionKm">Grid resolution in kilometers (default 1km for Met.no)</param>
    /// <returns>Interpolated weather data for the patio location</returns>
    public static ProcessedWeather InterpolateForLocation(
        Point patioLocation,
        IReadOnlyList<(Point GridPoint, ProcessedWeather Weather)> gridWeatherData,
        double gridResolutionKm = 1.0)
    {
        if (patioLocation == null)
            throw new ArgumentNullException(nameof(patioLocation));

        if (gridWeatherData == null || gridWeatherData.Count == 0)
            throw new ArgumentException("Grid weather data cannot be null or empty", nameof(gridWeatherData));

        // For single grid point, return it directly (no interpolation needed)
        if (gridWeatherData.Count == 1)
        {
            var weather = gridWeatherData[0].Weather;
            weather.Location = patioLocation;
            return weather;
        }

        // Find the 4 nearest grid points for bilinear interpolation
        var nearestPoints = FindNearestGridPoints(patioLocation, gridWeatherData, 4);

        // If we have fewer than 4 points, use nearest neighbor
        if (nearestPoints.Count < 4)
        {
            var nearest = nearestPoints[0];
            var weather = nearest.Weather;
            weather.Location = patioLocation;
            return weather;
        }

        // Perform bilinear interpolation
        return PerformBilinearInterpolation(patioLocation, nearestPoints);
    }

    /// <summary>
    /// Interpolates weather data temporally between two time points
    /// </summary>
    /// <param name="targetTime">Target timestamp for interpolation</param>
    /// <param name="weather1">Earlier weather data</param>
    /// <param name="weather2">Later weather data</param>
    /// <returns>Temporally interpolated weather data</returns>
    public static ProcessedWeather InterpolateTemporally(
        DateTime targetTime,
        ProcessedWeather weather1,
        ProcessedWeather weather2)
    {
        if (weather1 == null || weather2 == null)
            throw new ArgumentNullException("Weather data cannot be null");

        if (weather1.Timestamp > weather2.Timestamp)
            throw new ArgumentException("weather1 must be earlier than weather2");

        if (targetTime <= weather1.Timestamp)
            return weather1;

        if (targetTime >= weather2.Timestamp)
            return weather2;

        // Calculate interpolation factor (0.0 to 1.0)
        var totalSpan = (weather2.Timestamp - weather1.Timestamp).TotalSeconds;
        var targetSpan = (targetTime - weather1.Timestamp).TotalSeconds;
        var factor = targetSpan / totalSpan;

        // Interpolate numerical values
        var interpolatedCloudCover = Lerp(weather1.NormalizedCloudCover, weather2.NormalizedCloudCover, factor);
        var interpolatedPrecipitation = Lerp(weather1.PrecipitationIntensity, weather2.PrecipitationIntensity, factor);
        var interpolatedConfidence = Lerp(weather1.ConfidenceLevel, weather2.ConfidenceLevel, factor);

        // Determine condition based on interpolated values
        var condition = DetermineWeatherCondition(interpolatedCloudCover, interpolatedPrecipitation);
        var isSunBlocking = IsSunBlockingCondition(interpolatedCloudCover, interpolatedPrecipitation);

        return new ProcessedWeather
        {
            Timestamp = targetTime,
            NormalizedCloudCover = interpolatedCloudCover,
            PrecipitationIntensity = interpolatedPrecipitation,
            Condition = condition,
            IsSunBlocking = isSunBlocking,
            ConfidenceLevel = interpolatedConfidence,
            Location = weather1.Location,
            ProcessedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Finds the nearest grid points to a patio location
    /// </summary>
    private static List<(Point GridPoint, ProcessedWeather Weather)> FindNearestGridPoints(
        Point patioLocation,
        IReadOnlyList<(Point GridPoint, ProcessedWeather Weather)> gridData,
        int count)
    {
        return gridData
            .OrderBy(gd => CalculateDistance(patioLocation, gd.GridPoint))
            .Take(count)
            .ToList();
    }

    /// <summary>
    /// Performs bilinear interpolation using the 4 nearest grid points
    /// </summary>
    private static ProcessedWeather PerformBilinearInterpolation(
        Point targetLocation,
        List<(Point GridPoint, ProcessedWeather Weather)> nearestPoints)
    {
        // Simple weighted average based on inverse distance
        // For a more sophisticated implementation, we could use actual bilinear interpolation
        // with grid cell boundaries, but for weather data this weighted approach is sufficient

        var totalWeight = 0.0;
        var weightedCloudCover = 0.0;
        var weightedPrecipitation = 0.0;
        var weightedConfidence = 0.0;
        var timestamp = nearestPoints[0].Weather.Timestamp;

        foreach (var point in nearestPoints)
        {
            var distance = CalculateDistance(targetLocation, point.GridPoint);
            // Use inverse distance weighting; avoid division by zero
            var weight = distance < 0.0001 ? 1000.0 : 1.0 / distance;

            totalWeight += weight;
            weightedCloudCover += point.Weather.NormalizedCloudCover * weight;
            weightedPrecipitation += point.Weather.PrecipitationIntensity * weight;
            weightedConfidence += point.Weather.ConfidenceLevel * weight;
        }

        // Normalize by total weight
        var interpolatedCloudCover = weightedCloudCover / totalWeight;
        var interpolatedPrecipitation = weightedPrecipitation / totalWeight;
        var interpolatedConfidence = weightedConfidence / totalWeight;

        // Determine condition based on interpolated values
        var condition = DetermineWeatherCondition(interpolatedCloudCover, interpolatedPrecipitation);
        var isSunBlocking = IsSunBlockingCondition(interpolatedCloudCover, interpolatedPrecipitation);

        return new ProcessedWeather
        {
            Timestamp = timestamp,
            NormalizedCloudCover = interpolatedCloudCover,
            PrecipitationIntensity = interpolatedPrecipitation,
            Condition = condition,
            IsSunBlocking = isSunBlocking,
            ConfidenceLevel = interpolatedConfidence,
            Location = targetLocation,
            ProcessedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Calculates distance between two points in degrees (simple Euclidean for small distances)
    /// </summary>
    private static double CalculateDistance(Point p1, Point p2)
    {
        var dx = p1.X - p2.X;
        var dy = p1.Y - p2.Y;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    /// <summary>
    /// Linear interpolation between two values
    /// </summary>
    private static double Lerp(double a, double b, double t)
    {
        return a + (b - a) * t;
    }

    /// <summary>
    /// Determines weather condition from cloud cover and precipitation
    /// </summary>
    private static WeatherCondition DetermineWeatherCondition(double cloudCover, double precipitation)
    {
        const double ClearSkyThreshold = 20.0;
        const double CloudyThreshold = 70.0;
        const double OvercastThreshold = 80.0;
        const double PrecipitationIntensityThreshold = 0.1;

        if (precipitation > PrecipitationIntensityThreshold)
            return WeatherCondition.Precipitation;

        if (cloudCover >= OvercastThreshold)
            return WeatherCondition.Overcast;

        if (cloudCover >= CloudyThreshold)
            return WeatherCondition.Cloudy;

        if (cloudCover >= ClearSkyThreshold)
            return WeatherCondition.PartlyCloudy;

        return WeatherCondition.Clear;
    }

    /// <summary>
    /// Determines if weather conditions block sun
    /// </summary>
    private static bool IsSunBlockingCondition(double cloudCover, double precipitation)
    {
        const double SunBlockingCloudThreshold = 80.0;
        const double PrecipitationIntensityThreshold = 0.1;

        return precipitation > PrecipitationIntensityThreshold || cloudCover > SunBlockingCloudThreshold;
    }
}
