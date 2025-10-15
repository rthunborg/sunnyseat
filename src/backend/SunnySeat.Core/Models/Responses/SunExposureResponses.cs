using System.Text.Json.Serialization;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Models.Responses;

/// <summary>
/// API response for patio sun exposure data
/// </summary>
public class PatioSunExposureResponse
{
    /// <summary>
    /// Patio identifier
    /// </summary>
    public int PatioId { get; set; }

    /// <summary>
    /// Patio name
    /// </summary>
    public string PatioName { get; set; } = "";

    /// <summary>
    /// Venue information
    /// </summary>
    public VenueInfo Venue { get; set; } = new VenueInfo();

    /// <summary>
    /// Calculation timestamp (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Local time for the calculation
    /// </summary>
    public DateTime LocalTime { get; set; }

    /// <summary>
    /// Percentage of patio area in direct sunlight (0-100)
    /// </summary>
    public double SunExposurePercent { get; set; }

    /// <summary>
    /// Sun exposure state classification
    /// </summary>
    public SunExposureState State { get; set; }

    /// <summary>
    /// Overall calculation confidence (0-100)
    /// </summary>
    public double Confidence { get; set; }

    /// <summary>
    /// Detailed area information
    /// </summary>
    public SunExposureAreaInfo AreaInfo { get; set; } = new SunExposureAreaInfo();

    /// <summary>
    /// Solar position information
    /// </summary>
    public SolarPositionInfo SolarInfo { get; set; } = new SolarPositionInfo();

    /// <summary>
    /// Detailed confidence breakdown
    /// </summary>
    public ConfidenceBreakdownInfo ConfidenceBreakdown { get; set; } = new ConfidenceBreakdownInfo();

    /// <summary>
    /// Weather context information
    /// </summary>
    public WeatherContextInfo? WeatherContext { get; set; }

    /// <summary>
    /// Calculation metadata
    /// </summary>
    public CalculationMetadata Metadata { get; set; } = new CalculationMetadata();

    /// <summary>
    /// Convert from PatioSunExposure entity
    /// </summary>
    public static PatioSunExposureResponse FromPatioSunExposure(PatioSunExposure sunExposure, WeatherSlice? weatherData = null)
    {
        return new PatioSunExposureResponse
        {
            PatioId = sunExposure.PatioId,
            PatioName = sunExposure.Patio.Name,
            Venue = VenueInfo.FromVenue(sunExposure.Patio.Venue),
            Timestamp = sunExposure.Timestamp,
            LocalTime = sunExposure.LocalTime,
            SunExposurePercent = Math.Round(sunExposure.SunExposurePercent, 1),
            State = sunExposure.State,
            Confidence = Math.Round(sunExposure.Confidence, 1),
            AreaInfo = SunExposureAreaInfo.FromSunExposure(sunExposure),
            SolarInfo = SolarPositionInfo.FromSolarPosition(sunExposure.SolarPosition),
            ConfidenceBreakdown = ConfidenceBreakdownInfo.FromConfidenceFactors(sunExposure.ConfidenceBreakdown),
            WeatherContext = WeatherContextInfo.FromWeatherSlice(weatherData),
            Metadata = CalculationMetadata.FromSunExposure(sunExposure)
        };
    }
}

/// <summary>
/// Venue information for sun exposure response
/// </summary>
public class VenueInfo
{
    public int VenueId { get; set; }
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public static VenueInfo FromVenue(Venue venue)
    {
        return new VenueInfo
        {
            VenueId = venue.Id,
            Name = venue.Name,
            Address = venue.Address,
            Latitude = venue.Location.Y,
            Longitude = venue.Location.X
        };
    }
}

/// <summary>
/// Detailed area information for sun exposure
/// </summary>
public class SunExposureAreaInfo
{
    /// <summary>
    /// Total patio area in square meters
    /// </summary>
    public double TotalAreaSqM { get; set; }

    /// <summary>
    /// Sunlit area in square meters
    /// </summary>
    public double SunlitAreaSqM { get; set; }

    /// <summary>
    /// Shaded area in square meters
    /// </summary>
    public double ShadedAreaSqM { get; set; }

    /// <summary>
    /// Number of buildings casting shadows
    /// </summary>
    public int ShadowingBuildings { get; set; }

    public static SunExposureAreaInfo FromSunExposure(PatioSunExposure sunExposure)
    {
        return new SunExposureAreaInfo
        {
            TotalAreaSqM = Math.Round(sunExposure.SunlitAreaSqM + sunExposure.ShadedAreaSqM, 1),
            SunlitAreaSqM = Math.Round(sunExposure.SunlitAreaSqM, 1),
            ShadedAreaSqM = Math.Round(sunExposure.ShadedAreaSqM, 1),
            ShadowingBuildings = sunExposure.Shadows.Count()
        };
    }
}

/// <summary>
/// Solar position information
/// </summary>
public class SolarPositionInfo
{
    public double Elevation { get; set; }
    public double Azimuth { get; set; }
    public bool IsSunVisible { get; set; }
    public string SunDescription { get; set; } = "";

    public static SolarPositionInfo FromSolarPosition(SolarPosition solarPosition)
    {
        var isVisible = solarPosition.Elevation > 0;
        var description = isVisible
            ? $"Sun at {solarPosition.Elevation:F1}� elevation, {GetCompassDirection(solarPosition.Azimuth)} ({solarPosition.Azimuth:F1}�)"
            : "Sun below horizon";

        return new SolarPositionInfo
        {
            Elevation = Math.Round(solarPosition.Elevation, 1),
            Azimuth = Math.Round(solarPosition.Azimuth, 1),
            IsSunVisible = isVisible,
            SunDescription = description
        };
    }

    private static string GetCompassDirection(double azimuth)
    {
        var directions = new[] { "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW" };
        var index = (int)Math.Round(azimuth / 22.5) % 16;
        return directions[index];
    }
}

/// <summary>
/// Weather context information for sun exposure
/// </summary>
public class WeatherContextInfo
{
    /// <summary>
    /// Cloud cover percentage (0-100)
    /// </summary>
    public double CloudCover { get; set; }

    /// <summary>
    /// Weather condition description
    /// </summary>
    public string Conditions { get; set; } = "";

    /// <summary>
    /// Weather data source
    /// </summary>
    public string Source { get; set; } = "";

    /// <summary>
    /// Age of weather data
    /// </summary>
    public string DataAge { get; set; } = "";

    /// <summary>
    /// Whether weather is currently sun-blocking
    /// </summary>
    public bool IsSunBlocking { get; set; }

    /// <summary>
    /// Precipitation probability (0.0-1.0)
    /// </summary>
    public double? PrecipitationProbability { get; set; }

    public static WeatherContextInfo? FromWeatherSlice(WeatherSlice? weatherSlice)
    {
        if (weatherSlice == null)
            return null;

        var dataAge = DateTime.UtcNow - weatherSlice.CreatedAt;
        var dataAgeStr = dataAge.TotalMinutes < 60
            ? $"{(int)dataAge.TotalMinutes} minutes"
            : $"{(int)dataAge.TotalHours} hours";

        return new WeatherContextInfo
        {
            CloudCover = Math.Round(weatherSlice.CloudCover, 1),
            Conditions = GetWeatherConditionDescription(weatherSlice.CloudCover, weatherSlice.PrecipitationProbability),
            Source = weatherSlice.Source,
            DataAge = dataAgeStr,
            IsSunBlocking = weatherSlice.CloudCover >= 80 || weatherSlice.PrecipitationProbability >= 0.20,
            PrecipitationProbability = weatherSlice.PrecipitationProbability > 0
                ? Math.Round(weatherSlice.PrecipitationProbability, 2)
                : null
        };
    }

    private static string GetWeatherConditionDescription(double cloudCover, double precipProb)
    {
        if (precipProb >= 0.20)
            return precipProb >= 0.50 ? "Rain Expected" : "Possible Rain";

        if (cloudCover < 20)
            return "Clear";
        if (cloudCover < 70)
            return "Partly Cloudy";
        if (cloudCover < 80)
            return "Cloudy";

        return "Overcast";
    }
}

/// <summary>
/// Confidence breakdown information
/// </summary>
public class ConfidenceBreakdownInfo
{
    public double BuildingDataQuality { get; set; }
    public double GeometryPrecision { get; set; }
    public double SolarAccuracy { get; set; }
    public double ShadowAccuracy { get; set; }
    public double OverallConfidence { get; set; }
    public string ConfidenceCategory { get; set; } = "";
    public string Explanation { get; set; } = "";
    public IEnumerable<string> QualityIssues { get; set; } = new List<string>();
    public IEnumerable<string> ImprovementSuggestions { get; set; } = new List<string>();

    public static ConfidenceBreakdownInfo FromConfidenceFactors(ConfidenceFactors factors)
    {
        var explanation = GenerateConfidenceExplanation(factors);

        return new ConfidenceBreakdownInfo
        {
            BuildingDataQuality = Math.Round(factors.BuildingDataQuality * 100, 1),
            GeometryPrecision = Math.Round(factors.GeometryPrecision * 100, 1),
            SolarAccuracy = Math.Round(factors.SolarAccuracy * 100, 1),
            ShadowAccuracy = Math.Round(factors.ShadowAccuracy * 100, 1),
            OverallConfidence = Math.Round(factors.OverallConfidence * 100, 1),
            ConfidenceCategory = factors.ConfidenceCategory,
            Explanation = explanation,
            QualityIssues = factors.QualityIssues,
            ImprovementSuggestions = factors.Improvements
        };
    }

    private static string GenerateConfidenceExplanation(ConfidenceFactors factors)
    {
        var category = factors.ConfidenceCategory.ToLower();
        var overallPct = (int)(factors.OverallConfidence * 100);
        var geometryPct = (int)(factors.GeometryQuality * 100);

        // Determine primary confidence driver
        var hasWeatherData = factors.CloudCertainty > 0;
        var weatherPct = hasWeatherData ? (int)(factors.CloudCertainty * 100) : 0;

        if (!hasWeatherData)
        {
            return $"{overallPct}% confidence based on geometric calculations alone (no weather data available)";
        }

        if (factors.ConfidenceCategory == "High")
        {
            return $"{overallPct}% confidence - high geometric accuracy ({geometryPct}%) with current weather data ({weatherPct}%)";
        }

        if (factors.ConfidenceCategory == "Medium")
        {
            var limitingFactor = geometryPct < weatherPct ? "building geometry" : "weather forecast";
            return $"{overallPct}% confidence - good prediction quality, limited by {limitingFactor} uncertainty";
        }

        // Low confidence
        return $"{overallPct}% confidence - lower certainty due to data quality limitations";
    }
}

/// <summary>
/// Calculation metadata
/// </summary>
public class CalculationMetadata
{
    public TimeSpan CalculationDuration { get; set; }
    public string CalculationSource { get; set; } = "";
    public DateTime CalculatedAt { get; set; }

    public static CalculationMetadata FromSunExposure(PatioSunExposure sunExposure)
    {
        return new CalculationMetadata
        {
            CalculationDuration = sunExposure.CalculationDuration,
            CalculationSource = sunExposure.CalculationSource,
            CalculatedAt = DateTime.UtcNow
        };
    }
}

/// <summary>
/// Sun exposure timeline response
/// </summary>
public class SunExposureTimelineResponse
{
    /// <summary>
    /// Patio identifier
    /// </summary>
    public int PatioId { get; set; }

    /// <summary>
    /// Timeline start time (UTC)
    /// </summary>
    public DateTime StartTime { get; set; }

    /// <summary>
    /// Timeline end time (UTC)
    /// </summary>
    public DateTime EndTime { get; set; }

    /// <summary>
    /// Interval between data points
    /// </summary>
    public TimeSpan Interval { get; set; }

    /// <summary>
    /// Number of timeline points
    /// </summary>
    public int PointCount { get; set; }

    /// <summary>
    /// Average confidence across timeline
    /// </summary>
    public double AverageConfidence { get; set; }

    /// <summary>
    /// Timeline data points
    /// </summary>
    public IEnumerable<SunExposureTimelinePointResponse> Points { get; set; } = new List<SunExposureTimelinePointResponse>();

    /// <summary>
    /// Summary statistics for the timeline
    /// </summary>
    public TimelineSummaryInfo Summary { get; set; } = new TimelineSummaryInfo();

    /// <summary>
    /// Overall data quality assessment
    /// </summary>
    public ConfidenceBreakdownInfo OverallQuality { get; set; } = new ConfidenceBreakdownInfo();

    /// <summary>
    /// Convert from SunExposureTimeline entity
    /// </summary>
    public static SunExposureTimelineResponse FromSunExposureTimeline(SunExposureTimeline timeline)
    {
        var points = timeline.Points.Select(SunExposureTimelinePointResponse.FromTimelinePoint);
        var summary = TimelineSummaryInfo.FromTimelinePoints(timeline.Points);

        return new SunExposureTimelineResponse
        {
            PatioId = timeline.PatioId,
            StartTime = timeline.StartTime,
            EndTime = timeline.EndTime,
            Interval = timeline.Interval,
            PointCount = timeline.PointCount,
            AverageConfidence = Math.Round(timeline.AverageConfidence, 1),
            Points = points,
            Summary = summary,
            OverallQuality = ConfidenceBreakdownInfo.FromConfidenceFactors(timeline.OverallQuality)
        };
    }
}

/// <summary>
/// Individual timeline point response
/// </summary>
public class SunExposureTimelinePointResponse
{
    public DateTime Timestamp { get; set; }
    public DateTime LocalTime { get; set; }
    public double SunExposurePercent { get; set; }
    public SunExposureState State { get; set; }
    public double Confidence { get; set; }
    public bool IsSunVisible { get; set; }
    public double SolarElevation { get; set; }
    public double SolarAzimuth { get; set; }

    public static SunExposureTimelinePointResponse FromTimelinePoint(SunExposureTimelinePoint point)
    {
        return new SunExposureTimelinePointResponse
        {
            Timestamp = point.Timestamp,
            LocalTime = point.LocalTime,
            SunExposurePercent = Math.Round(point.SunExposurePercent, 1),
            State = point.State,
            Confidence = Math.Round(point.Confidence, 1),
            IsSunVisible = point.IsSunVisible,
            SolarElevation = Math.Round(point.SolarElevation, 1),
            SolarAzimuth = Math.Round(point.SolarAzimuth, 1)
        };
    }
}

/// <summary>
/// Timeline summary information
/// </summary>
public class TimelineSummaryInfo
{
    public double AverageSunExposure { get; set; }
    public double MaxSunExposure { get; set; }
    public double MinSunExposure { get; set; }
    public int SunnyPeriods { get; set; }
    public int PartialPeriods { get; set; }
    public int ShadedPeriods { get; set; }
    public int NoSunPeriods { get; set; }
    public string BestSunPeriod { get; set; } = "";

    public static TimelineSummaryInfo FromTimelinePoints(IEnumerable<SunExposureTimelinePoint> points)
    {
        var pointsList = points.ToList();
        if (!pointsList.Any())
        {
            return new TimelineSummaryInfo();
        }

        var sunExposureValues = pointsList.Select(p => p.SunExposurePercent).ToList();
        var maxExposurePoint = pointsList.OrderByDescending(p => p.SunExposurePercent).First();

        return new TimelineSummaryInfo
        {
            AverageSunExposure = Math.Round(sunExposureValues.Average(), 1),
            MaxSunExposure = Math.Round(sunExposureValues.Max(), 1),
            MinSunExposure = Math.Round(sunExposureValues.Min(), 1),
            SunnyPeriods = pointsList.Count(p => p.State == SunExposureState.Sunny),
            PartialPeriods = pointsList.Count(p => p.State == SunExposureState.Partial),
            ShadedPeriods = pointsList.Count(p => p.State == SunExposureState.Shaded),
            NoSunPeriods = pointsList.Count(p => p.State == SunExposureState.NoSun),
            BestSunPeriod = $"Peak sun exposure at {maxExposurePoint.LocalTime:HH:mm} with {maxExposurePoint.SunExposurePercent:F1}% sunlight"
        };
    }
}