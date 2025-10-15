using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Services;

/// <summary>
/// Calculates confidence scores for sun exposure calculations based on multiple factors
/// </summary>
public class ConfidenceCalculator
{
    /// <summary>
    /// Calculate comprehensive confidence factors for sun exposure calculation
    /// </summary>
    /// <param name="patio">Patio being analyzed</param>
    /// <param name="shadowInfo">Shadow information for the patio</param>
    /// <param name="solarPosition">Solar position used in calculation</param>
    /// <returns>Detailed confidence factors</returns>
    public ConfidenceFactors CalculateConfidenceFactors(Patio patio,
        PatioShadowInfo shadowInfo, SolarPosition solarPosition)
    {
        var factors = new ConfidenceFactors();

        // Building data quality (40% weight)
        factors.BuildingDataQuality = CalculateBuildingDataQuality(shadowInfo.CastingShadows);

        // Geometry precision (25% weight) 
        factors.GeometryPrecision = CalculateGeometryPrecision(patio);

        // Solar position accuracy (20% weight)
        factors.SolarAccuracy = CalculateSolarAccuracy(solarPosition);

        // Shadow calculation accuracy (15% weight)
        factors.ShadowAccuracy = CalculateShadowAccuracy(shadowInfo, solarPosition);

        // Calculate weighted overall confidence
        factors.OverallConfidence =
            (factors.BuildingDataQuality * 0.40) +
            (factors.GeometryPrecision * 0.25) +
            (factors.SolarAccuracy * 0.20) +
            (factors.ShadowAccuracy * 0.15);

        // Determine confidence category
        factors.ConfidenceCategory = factors.OverallConfidence switch
        {
            >= 0.70 => "High",
            >= 0.40 => "Medium",
            _ => "Low"
        };

        // Identify quality issues and improvement suggestions
        factors.QualityIssues = IdentifyQualityIssues(factors, patio, shadowInfo, solarPosition);
        factors.Improvements = SuggestImprovements(factors, patio, shadowInfo);

        return factors;
    }

    /// <summary>
    /// Calculate comprehensive confidence factors with weather intelligence
    /// </summary>
    /// <param name="patio">Patio being analyzed</param>
    /// <param name="shadowInfo">Shadow information for the patio</param>
    /// <param name="solarPosition">Solar position used in calculation</param>
    /// <param name="weatherData">Weather data for confidence calculation (optional)</param>
    /// <returns>Detailed confidence factors</returns>
    public ConfidenceFactors CalculateConfidenceFactors(Patio patio,
        PatioShadowInfo shadowInfo, SolarPosition solarPosition, WeatherSlice? weatherData)
    {
        var factors = new ConfidenceFactors();

        // Calculate GeometryQuality (60% weight in new formula)
        var geometryQuality = CalculateGeometryQuality(patio, shadowInfo);

        // Calculate CloudCertainty (40% weight in new formula)
        var cloudCertainty = CalculateCloudCertainty(weatherData);

        // New confidence formula: Confidence = (GeometryQuality × 0.6) + (CloudCertainty × 0.4)
        factors.OverallConfidence = (geometryQuality * 0.6) + (cloudCertainty * 0.4);

        // Store component scores for analysis
        factors.GeometryQuality = geometryQuality;
        factors.CloudCertainty = cloudCertainty;

        // Legacy individual factors for backward compatibility
        factors.BuildingDataQuality = CalculateBuildingDataQuality(shadowInfo.CastingShadows);
        factors.GeometryPrecision = CalculateGeometryPrecision(patio);
        factors.SolarAccuracy = CalculateSolarAccuracy(solarPosition);
        factors.ShadowAccuracy = CalculateShadowAccuracy(shadowInfo, solarPosition);

        // Apply confidence caps based on data source and quality
        factors.OverallConfidence = ApplyConfidenceCaps(factors.OverallConfidence, weatherData, patio, shadowInfo);

        // Normalize to percentage (0-1 scale)
        factors.OverallConfidence = Math.Clamp(factors.OverallConfidence, 0.0, 1.0);

        // Determine confidence category
        factors.ConfidenceCategory = factors.OverallConfidence switch
        {
            >= 0.70 => "High",
            >= 0.40 => "Medium",
            _ => "Low"
        };

        // Identify quality issues and improvement suggestions
        factors.QualityIssues = IdentifyQualityIssues(factors, patio, shadowInfo, solarPosition, weatherData);
        factors.Improvements = SuggestImprovements(factors, patio, shadowInfo, weatherData);

        return factors;
    }

    /// <summary>
    /// Calculate GeometryQuality based on building data accuracy (0-1 scale)
    /// </summary>
    private double CalculateGeometryQuality(Patio patio, PatioShadowInfo shadowInfo)
    {
        // Building data completeness
        var buildingDataQuality = CalculateBuildingDataQuality(shadowInfo.CastingShadows);

        // Patio polygon precision
        var polygonPrecision = CalculateGeometryPrecision(patio);

        // Shadow calculation accuracy
        var shadowAccuracy = shadowInfo.Confidence;

        // Weighted average: building 50%, polygon 30%, shadow 20%
        var geometryQuality =
            (buildingDataQuality * 0.5) +
            (polygonPrecision * 0.3) +
            (shadowAccuracy * 0.2);

        return Math.Clamp(geometryQuality, 0.0, 1.0);
    }

    /// <summary>
    /// Calculate CloudCertainty from weather data quality and freshness (0-1 scale)
    /// </summary>
    private double CalculateCloudCertainty(WeatherSlice? weatherData)
    {
        // Missing weather data returns fallback confidence
        if (weatherData == null)
        {
            return 0.5; // 50% base certainty when no weather data
        }

        // Weather data freshness impact
        var dataAge = DateTime.UtcNow - weatherData.CreatedAt;
        var freshnessFactor = CalculateWeatherFreshnessFactor(dataAge);

        // Forecast vs nowcast differentiation
        var forecastFactor = weatherData.IsForecast ? 0.9 : 0.95; // Nowcast gets higher base confidence

        // Source reliability weighting
        var sourceReliability = GetWeatherSourceReliability(weatherData.Source);

        // Combined cloud certainty calculation
        var cloudCertainty = forecastFactor * freshnessFactor * sourceReliability;

        return Math.Clamp(cloudCertainty, 0.0, 1.0);
    }

    /// <summary>
    /// Calculate weather data freshness factor based on age
    /// </summary>
    private double CalculateWeatherFreshnessFactor(TimeSpan dataAge)
    {
        // Fresh data (< 5 min): 100%
        if (dataAge.TotalMinutes < 5)
            return 1.0;

        // Recent data (5-15 min): 95%
        if (dataAge.TotalMinutes < 15)
            return 0.95;

        // Acceptable data (15-30 min): 90%
        if (dataAge.TotalMinutes < 30)
            return 0.90;

        // Aging data (30-60 min): 85%
        if (dataAge.TotalMinutes < 60)
            return 0.85;

        // Old data (1-2 hours): 75%
        if (dataAge.TotalHours < 2)
            return 0.75;

        // Very old data (2-6 hours): 60%
        if (dataAge.TotalHours < 6)
            return 0.60;

        // Stale data (> 6 hours): 40%
        return 0.40;
    }

    /// <summary>
    /// Get weather source reliability weighting
    /// </summary>
    private double GetWeatherSourceReliability(string source)
    {
        return source?.ToLowerInvariant() switch
        {
            "yr.no" => 0.95,           // High reliability - Norwegian Meteorological Institute
            "metno" => 0.95,           // Same as yr.no
            "openweathermap" => 0.85,  // Good reliability
            "openweather" => 0.85,     // Same as openweathermap
            _ => 0.80                  // Default/unknown source
        };
    }

    /// <summary>
    /// Apply confidence caps based on data source and quality
    /// </summary>
    private double ApplyConfidenceCaps(double confidence, WeatherSlice? weatherData,
        Patio patio, PatioShadowInfo shadowInfo)
    {
        var cappedConfidence = confidence;

        // Forecast data: Maximum 90% confidence
        if (weatherData?.IsForecast == true)
        {
            cappedConfidence = Math.Min(cappedConfidence, 0.90);
        }

        // Nowcast data: Maximum 95% confidence
        if (weatherData?.IsForecast == false)
        {
            cappedConfidence = Math.Min(cappedConfidence, 0.95);
        }

        // Missing weather: Maximum 60% confidence
        if (weatherData == null)
        {
            cappedConfidence = Math.Min(cappedConfidence, 0.60);
        }

        // Poor building data: Maximum 70% confidence
        var buildingQuality = CalculateBuildingDataQuality(shadowInfo.CastingShadows);
        if (buildingQuality < 0.6)
        {
            cappedConfidence = Math.Min(cappedConfidence, 0.70);
        }

        return cappedConfidence;
    }

    /// <summary>
    /// Calculate building data quality based on shadow projections
    /// </summary>
    private double CalculateBuildingDataQuality(IEnumerable<ShadowProjection> shadows)
    {
        if (!shadows.Any())
            return 1.0; // No shadows affecting = high confidence

        var qualityScores = shadows.Select(s => s.Confidence);
        return qualityScores.Average();
    }

    /// <summary>
    /// Calculate geometry precision based on patio quality metrics
    /// </summary>
    private double CalculateGeometryPrecision(Patio patio)
    {
        // Use patio quality score from Epic 1
        return patio.PolygonQuality;
    }

    /// <summary>
    /// Calculate solar position accuracy based on sun elevation
    /// </summary>
    private double CalculateSolarAccuracy(SolarPosition solarPosition)
    {
        // Solar position calculations are highly accurate
        // Reduce confidence slightly for very low sun angles
        return solarPosition.Elevation switch
        {
            > 30.0 => 0.98,  // High sun - maximum accuracy
            > 15.0 => 0.95,  // Medium sun - very good accuracy  
            > 5.0 => 0.85,   // Low sun - good accuracy
            > 0.0 => 0.70,   // Very low sun - acceptable accuracy
            _ => 0.50        // Below horizon - limited accuracy
        };
    }

    /// <summary>
    /// Calculate shadow calculation accuracy
    /// </summary>
    private double CalculateShadowAccuracy(PatioShadowInfo shadowInfo, SolarPosition solarPosition)
    {
        // Shadow accuracy depends on sun angle and number of shadow sources
        var baseAccuracy = shadowInfo.Confidence;

        // Reduce confidence for complex shadow scenarios
        var shadowComplexity = shadowInfo.CastingShadows.Count();
        var complexityPenalty = Math.Min(shadowComplexity * 0.03, 0.15); // Max 15% penalty

        // Reduce confidence for very low sun angles (longer, less reliable shadows)
        var elevationPenalty = solarPosition.Elevation < 10.0 ? 0.10 : 0.0;

        return Math.Max(baseAccuracy - complexityPenalty - elevationPenalty, 0.30);
    }

    /// <summary>
    /// Identify quality issues that affect confidence
    /// </summary>
    private List<string> IdentifyQualityIssues(ConfidenceFactors factors, Patio patio,
        PatioShadowInfo shadowInfo, SolarPosition solarPosition, WeatherSlice? weatherData = null)
    {
        var issues = new List<string>();

        if (factors.BuildingDataQuality < 0.7)
            issues.Add("Building height data has low reliability");

        if (factors.GeometryPrecision < 0.7)
            issues.Add("Patio polygon has low quality score");

        if (solarPosition.Elevation < 10.0 && solarPosition.Elevation > 0)
            issues.Add("Sun at low angle - shadow calculations less reliable");

        if (solarPosition.Elevation <= 0)
            issues.Add("Sun below horizon - no direct sunlight");

        if (shadowInfo.CastingShadows.Count() > 5)
            issues.Add("Complex shadow environment with many buildings");

        if (CalculateAreaInSquareMeters(patio.Geometry) < 10.0)
            issues.Add("Very small patio - geometric precision more critical");

        if (factors.OverallConfidence < 0.40)
            issues.Add("Multiple data quality factors reduce overall confidence");

        // Weather-related quality issues
        if (weatherData == null)
        {
            issues.Add("No weather data available - confidence capped at 60%");
        }
        else
        {
            var dataAge = DateTime.UtcNow - weatherData.CreatedAt;
            if (dataAge.TotalHours > 2)
                issues.Add($"Weather data is {dataAge.TotalHours:F1} hours old - reduced confidence");

            if (weatherData.IsForecast)
                issues.Add("Using forecast data - confidence capped at 90%");
        }

        return issues;
    }

    /// <summary>
    /// Suggest improvements to increase confidence
    /// </summary>
    private List<string> SuggestImprovements(ConfidenceFactors factors, Patio patio,
        PatioShadowInfo shadowInfo, WeatherSlice? weatherData = null)
    {
        var improvements = new List<string>();

        if (factors.BuildingDataQuality < 0.7)
        {
            improvements.Add("Survey building heights for more accurate shadow calculations");
            improvements.Add("Verify building data with local planning authorities");
        }

        if (factors.GeometryPrecision < 0.7)
        {
            improvements.Add("Refine patio boundary with higher precision GPS data");
            improvements.Add("Use satellite imagery to improve patio polygon accuracy");
        }

        if (shadowInfo.CastingShadows.Any(s => s.Confidence < 0.7))
        {
            improvements.Add("Update building height data for nearby structures");
        }

        if (factors.OverallConfidence < 0.70)
        {
            improvements.Add("Consider multiple data sources for validation");
            improvements.Add("Use time-averaged calculations to improve reliability");
        }

        // Weather-related improvements
        if (weatherData == null)
        {
            improvements.Add("Integrate weather data for higher confidence scores");
        }
        else
        {
            var dataAge = DateTime.UtcNow - weatherData.CreatedAt;
            if (dataAge.TotalHours > 1)
                improvements.Add("Refresh weather data for improved confidence");
        }

        if (!improvements.Any())
        {
            improvements.Add("Data quality is good - confidence level is appropriate");
        }

        return improvements;
    }

    /// <summary>
    /// Calculate simplified confidence score (0-100) for display purposes
    /// </summary>
    /// <param name="factors">Detailed confidence factors</param>
    /// <returns>Confidence percentage (0-100)</returns>
    public double CalculateDisplayConfidence(ConfidenceFactors factors)
    {
        return Math.Round(factors.OverallConfidence * 100.0, 1);
    }

    /// <summary>
    /// Determine if confidence is sufficient for reliable sun exposure decisions
    /// </summary>
    /// <param name="factors">Confidence factors to evaluate</param>
    /// <returns>True if confidence is sufficient for decision making</returns>
    public bool IsSufficientConfidence(ConfidenceFactors factors)
    {
        return factors.OverallConfidence >= 0.60; // 60% minimum for reliable decisions
    }

    /// <summary>
    /// Calculate area in square meters from geometry (rough approximation)
    /// </summary>
    private double CalculateAreaInSquareMeters(Polygon geometry)
    {
        // Convert from degrees² to m² (rough approximation for Gothenburg latitude ~58°)
        // At this latitude: 1° latitude ≈ 111.3 km, 1° longitude ≈ 55.8 km
        var areaInDegrees = geometry.Area;
        return areaInDegrees * 111300.0 * 55800.0;
    }
}