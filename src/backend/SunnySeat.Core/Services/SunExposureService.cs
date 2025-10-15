using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Utils;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for calculating patio sun exposure by combining solar position and shadow data
/// </summary>
public class SunExposureService : ISunExposureService
{
    private readonly ISolarCalculationService _solarService;
    private readonly IShadowCalculationService _shadowService;
    private readonly IPatioRepository _patioRepository;
    private readonly ConfidenceCalculator _confidenceCalculator;
    private readonly IWeatherRepository? _weatherRepository;
    private readonly ILogger<SunExposureService> _logger;

    // Gothenburg timezone for local time conversion
    private readonly TimeZoneInfo _gothenburgTimeZone;

    public SunExposureService(
        ISolarCalculationService solarService,
        IShadowCalculationService shadowService,
        IPatioRepository patioRepository,
        ConfidenceCalculator confidenceCalculator,
        ILogger<SunExposureService> logger,
        IWeatherRepository? weatherRepository = null)
    {
        _solarService = solarService;
        _shadowService = shadowService;
        _patioRepository = patioRepository;
        _confidenceCalculator = confidenceCalculator;
        _weatherRepository = weatherRepository;
        _logger = logger;

        // Initialize Gothenburg timezone
        try
        {
            _gothenburgTimeZone = TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time");
        }
        catch
        {
            // Fallback for non-Windows systems
            _gothenburgTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm");
        }
    }

    /// <summary>
    /// Calculate sun exposure for a specific patio at given timestamp
    /// </summary>
    public async Task<PatioSunExposure> CalculatePatioSunExposureAsync(int patioId,
        DateTime timestamp, CancellationToken cancellationToken = default)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            _logger.LogDebug("Calculating sun exposure for patio {PatioId} at {Timestamp}", patioId, timestamp);

            // Get patio data with venue for location
            var patio = await _patioRepository.GetByIdAsync(patioId, cancellationToken);
            if (patio == null)
                throw new ArgumentException($"Patio {patioId} not found");

            // Calculate solar position for patio location
            var solarPosition = await _solarService.CalculateSolarPositionAsync(timestamp);

            // Handle no sun scenario
            if (!_solarService.IsSunVisible(solarPosition))
            {
                return CreateNoSunExposure(patio, solarPosition, timestamp, startTime);
            }

            // Calculate shadows affecting this patio
            var shadowInfo = await _shadowService.CalculatePatioShadowAsync(
                patioId, timestamp, cancellationToken);

            // Calculate sun exposure from shadow data
            var sunExposure = CalculateSunExposureFromShadows(patio, shadowInfo, solarPosition, timestamp);

            // Get weather data for confidence calculation (optional, improves confidence accuracy)
            WeatherSlice? weatherData = null;
            if (_weatherRepository != null)
            {
                try
                {
                    weatherData = await _weatherRepository.GetLatestWeatherAsync(timestamp, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to retrieve weather data for confidence calculation, proceeding without weather data");
                }
            }

            // Add confidence scoring with weather intelligence
            sunExposure.ConfidenceBreakdown = _confidenceCalculator.CalculateConfidenceFactors(
                patio, shadowInfo, solarPosition, weatherData);
            sunExposure.Confidence = _confidenceCalculator.CalculateDisplayConfidence(
                sunExposure.ConfidenceBreakdown);

            // Store weather data reference for API responses
            sunExposure.WeatherData = weatherData;

            // Add timing metadata
            sunExposure.CalculationDuration = DateTime.UtcNow - startTime;
            sunExposure.CalculationSource = "realtime";

            _logger.LogDebug("Sun exposure calculated for patio {PatioId}: {SunExposure}% exposure, {State} state, {Confidence}% confidence",
                patioId, sunExposure.SunExposurePercent, sunExposure.State, sunExposure.Confidence);

            return sunExposure;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating sun exposure for patio {PatioId} at {Timestamp}",
                patioId, timestamp);
            throw;
        }
    }

    /// <summary>
    /// Get current sun exposure for a patio (uses current UTC time)
    /// </summary>
    public async Task<PatioSunExposure> GetCurrentSunExposureAsync(int patioId,
        CancellationToken cancellationToken = default)
    {
        return await CalculatePatioSunExposureAsync(patioId, DateTime.UtcNow, cancellationToken);
    }

    /// <summary>
    /// Calculate sun exposure for multiple patios at given timestamp (optimized batch operation)
    /// </summary>
    public async Task<Dictionary<int, PatioSunExposure>> CalculateBatchSunExposureAsync(
        IEnumerable<int> patioIds, DateTime timestamp,
        CancellationToken cancellationToken = default)
    {
        var patioIdsList = patioIds.ToList();
        _logger.LogDebug("Calculating batch sun exposure for {PatioCount} patios at {Timestamp}",
            patioIdsList.Count, timestamp);

        if (!patioIdsList.Any())
            return new Dictionary<int, PatioSunExposure>();

        try
        {
            // Calculate solar position once for the batch (all patios in Gothenburg area)
            var solarPosition = await _solarService.CalculateSolarPositionAsync(timestamp);

            // Get batch shadow information
            var batchShadowResults = await _shadowService.CalculatePatioBatchShadowAsync(
                patioIdsList, timestamp, cancellationToken);

            // Get weather data once for the batch (optional, improves confidence accuracy)
            WeatherSlice? weatherData = null;
            if (_weatherRepository != null)
            {
                try
                {
                    weatherData = await _weatherRepository.GetLatestWeatherAsync(timestamp, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to retrieve weather data for batch confidence calculation");
                }
            }

            // Process each patio's sun exposure
            var results = new Dictionary<int, PatioSunExposure>();

            foreach (var kvp in batchShadowResults)
            {
                var patioId = kvp.Key;
                var shadowInfo = kvp.Value;

                try
                {
                    var patio = shadowInfo.Patio ?? await _patioRepository.GetByIdAsync(patioId, cancellationToken);
                    if (patio == null)
                    {
                        _logger.LogWarning("Patio {PatioId} not found during batch processing", patioId);
                        continue;
                    }

                    PatioSunExposure sunExposure;

                    if (!_solarService.IsSunVisible(solarPosition))
                    {
                        sunExposure = CreateNoSunExposure(patio, solarPosition, timestamp, DateTime.UtcNow);
                    }
                    else
                    {
                        sunExposure = CalculateSunExposureFromShadows(patio, shadowInfo, solarPosition, timestamp);
                        sunExposure.ConfidenceBreakdown = _confidenceCalculator.CalculateConfidenceFactors(
                            patio, shadowInfo, solarPosition, weatherData);
                        sunExposure.Confidence = _confidenceCalculator.CalculateDisplayConfidence(
                            sunExposure.ConfidenceBreakdown);
                    }

                    sunExposure.CalculationSource = "realtime_batch";
                    results[patioId] = sunExposure;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing patio {PatioId} in batch calculation", patioId);
                }
            }

            _logger.LogDebug("Completed batch sun exposure calculation for {ProcessedCount}/{RequestedCount} patios",
                results.Count, patioIdsList.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in batch sun exposure calculation for {PatioCount} patios", patioIdsList.Count);
            throw;
        }
    }

    /// <summary>
    /// Calculate sun exposure timeline for a patio over a time period
    /// </summary>
    public async Task<SunExposureTimeline> CalculateSunExposureTimelineAsync(int patioId,
        DateTime startTime, DateTime endTime, TimeSpan interval,
        CancellationToken cancellationToken = default)
    {
        if (startTime >= endTime)
            throw new ArgumentException("Start time must be before end time");

        if (interval <= TimeSpan.Zero)
            throw new ArgumentException("Interval must be positive");

        if (endTime - startTime > TimeSpan.FromDays(7))
            throw new ArgumentException("Timeline duration cannot exceed 7 days");

        _logger.LogDebug("Calculating sun exposure timeline for patio {PatioId} from {StartTime} to {EndTime} with {Interval} interval",
            patioId, startTime, endTime, interval);

        try
        {
            var timePoints = new List<DateTime>();
            for (var time = startTime; time <= endTime; time = time.Add(interval))
            {
                timePoints.Add(time);
            }

            var timelinePoints = new List<SunExposureTimelinePoint>();
            var confidenceScores = new List<double>();

            // Calculate sun exposure for each time point
            foreach (var timePoint in timePoints)
            {
                try
                {
                    var sunExposure = await CalculatePatioSunExposureAsync(patioId, timePoint, cancellationToken);

                    var timelinePoint = new SunExposureTimelinePoint
                    {
                        Timestamp = timePoint,
                        LocalTime = TimeZoneInfo.ConvertTimeFromUtc(timePoint, _gothenburgTimeZone),
                        SunExposurePercent = sunExposure.SunExposurePercent,
                        State = sunExposure.State,
                        Confidence = sunExposure.Confidence,
                        IsSunVisible = sunExposure.State != SunExposureState.NoSun,
                        SolarElevation = sunExposure.SolarPosition.Elevation,
                        SolarAzimuth = sunExposure.SolarPosition.Azimuth
                    };

                    timelinePoints.Add(timelinePoint);
                    confidenceScores.Add(sunExposure.Confidence);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to calculate sun exposure for timeline point {TimePoint}", timePoint);
                }
            }

            var timeline = new SunExposureTimeline
            {
                PatioId = patioId,
                StartTime = startTime,
                EndTime = endTime,
                Interval = interval,
                Points = timelinePoints,
                AverageConfidence = confidenceScores.Any() ? confidenceScores.Average() : 0.0
            };

            // Calculate overall quality from first successful calculation
            if (timelinePoints.Any())
            {
                var firstExposure = await CalculatePatioSunExposureAsync(patioId, timelinePoints.First().Timestamp, cancellationToken);
                timeline.OverallQuality = firstExposure.ConfidenceBreakdown;
            }

            _logger.LogDebug("Completed sun exposure timeline for patio {PatioId}: {PointCount} points, {AverageConfidence:F1}% average confidence",
                patioId, timeline.PointCount, timeline.AverageConfidence);

            return timeline;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating sun exposure timeline for patio {PatioId}", patioId);
            throw;
        }
    }

    /// <summary>
    /// Find sunny patios near a given location
    /// </summary>
    public async Task<IEnumerable<PatioSunExposure>> GetSunnyPatiosNearLocationAsync(
        Point location, double radiusKm, DateTime? timestamp = null,
        CancellationToken cancellationToken = default)
    {
        var calcTime = timestamp ?? DateTime.UtcNow;

        _logger.LogDebug("Finding sunny patios near {Location} within {Radius}km at {Timestamp}",
            location, radiusKm, calcTime);

        try
        {
            // Get patios within radius (this would need to be implemented in PatioRepository)
            // For now, we'll get all patios and filter - this should be optimized with spatial queries
            var allPatios = await _patioRepository.GetAllAsync(cancellationToken);
            var nearbyPatios = allPatios.Where(p =>
                CalculateDistance(location, new Point(p.Venue.Location.X, p.Venue.Location.Y)) <= radiusKm);

            var nearbyPatioIds = nearbyPatios.Select(p => p.Id);

            // Calculate sun exposure for all nearby patios
            var sunExposureResults = await CalculateBatchSunExposureAsync(nearbyPatioIds, calcTime, cancellationToken);

            // Filter for sunny patios (>70% sun exposure)
            var sunnyPatios = sunExposureResults.Values
                .Where(se => se.State == SunExposureState.Sunny)
                .OrderByDescending(se => se.SunExposurePercent)
                .ThenByDescending(se => se.Confidence);

            _logger.LogDebug("Found {SunnyPatioCount} sunny patios near location from {TotalPatioCount} nearby patios",
                sunnyPatios.Count(), nearbyPatioIds.Count());

            return sunnyPatios;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding sunny patios near location {Location}", location);
            throw;
        }
    }

    /// <summary>
    /// Determine if sun exposure calculation is reliable for given conditions
    /// </summary>
    public bool IsSunExposureCalculationReliable(SolarPosition solarPosition, ConfidenceFactors confidenceFactors)
    {
        // Require sun to be visible and confidence to be sufficient
        return _solarService.IsSunVisible(solarPosition) &&
               _confidenceCalculator.IsSufficientConfidence(confidenceFactors);
    }

    /// <summary>
    /// Create sun exposure result for scenarios with no sun
    /// </summary>
    private PatioSunExposure CreateNoSunExposure(Patio patio, SolarPosition solarPosition,
        DateTime timestamp, DateTime startTime)
    {
        return new PatioSunExposure
        {
            PatioId = patio.Id,
            Patio = patio,
            Timestamp = timestamp,
            LocalTime = TimeZoneInfo.ConvertTimeFromUtc(timestamp, _gothenburgTimeZone),
            SunExposurePercent = 0.0,
            State = SunExposureState.NoSun,
            Confidence = 95.0, // High confidence that there's no sun when sun is below horizon
            SunlitGeometry = null,
            ShadedGeometry = patio.Geometry,
            SunlitAreaSqM = 0.0,
            ShadedAreaSqM = CalculateAreaInSquareMeters(patio.Geometry),
            SolarPosition = solarPosition,
            Shadows = new List<ShadowProjection>(),
            ConfidenceBreakdown = new ConfidenceFactors
            {
                BuildingDataQuality = 1.0,
                GeometryPrecision = patio.PolygonQuality,
                SolarAccuracy = 0.98,
                ShadowAccuracy = 1.0,
                OverallConfidence = 0.95,
                ConfidenceCategory = "High",
                QualityIssues = new[] { "Sun below horizon - no direct sunlight available" },
                Improvements = new[] { "Wait for sunrise for sun exposure data" }
            },
            CalculationDuration = DateTime.UtcNow - startTime,
            CalculationSource = "realtime"
        };
    }

    /// <summary>
    /// Calculate sun exposure from shadow information
    /// </summary>
    private PatioSunExposure CalculateSunExposureFromShadows(Patio patio,
        PatioShadowInfo shadowInfo, SolarPosition solarPosition, DateTime timestamp)
    {
        var sunlitPercent = shadowInfo.SunlitAreaPercent;
        var sunExposureState = CalculateSunExposureState(sunlitPercent);

        return new PatioSunExposure
        {
            PatioId = patio.Id,
            Patio = patio,
            Timestamp = timestamp,
            LocalTime = TimeZoneInfo.ConvertTimeFromUtc(timestamp, _gothenburgTimeZone),
            SunExposurePercent = sunlitPercent,
            State = sunExposureState,
            SunlitGeometry = shadowInfo.SunlitGeometry,
            ShadedGeometry = shadowInfo.ShadowedGeometry,
            SunlitAreaSqM = CalculateAreaInSquareMeters(shadowInfo.SunlitGeometry),
            ShadedAreaSqM = CalculateAreaInSquareMeters(shadowInfo.ShadowedGeometry),
            SolarPosition = solarPosition,
            Shadows = shadowInfo.CastingShadows
        };
    }

    /// <summary>
    /// Determine sun exposure state from percentage
    /// </summary>
    private SunExposureState CalculateSunExposureState(double sunlitPercent)
    {
        return sunlitPercent switch
        {
            > 70.0 => SunExposureState.Sunny,
            >= 30.0 => SunExposureState.Partial,
            _ => SunExposureState.Shaded
        };
    }

    /// <summary>
    /// Calculate area in square meters from geometry (rough approximation)
    /// </summary>
    private double CalculateAreaInSquareMeters(Polygon? geometry)
    {
        if (geometry == null) return 0.0;

        // Convert from degrees� to m� (rough approximation for Gothenburg latitude ~58�)
        // At this latitude: 1� latitude ? 111.3 km, 1� longitude ? 55.8 km
        var areaInDegrees = geometry.Area;
        return areaInDegrees * 111300.0 * 55800.0;
    }

    /// <summary>
    /// Calculate distance between two points in kilometers (Haversine formula)
    /// </summary>
    private double CalculateDistance(Point point1, Point point2)
    {
        const double EarthRadiusKm = 6371.0;

        var lat1Rad = point1.Y * Math.PI / 180.0;
        var lat2Rad = point2.Y * Math.PI / 180.0;
        var deltaLatRad = (point2.Y - point1.Y) * Math.PI / 180.0;
        var deltaLonRad = (point2.X - point1.X) * Math.PI / 180.0;

        var a = Math.Sin(deltaLatRad / 2) * Math.Sin(deltaLatRad / 2) +
                Math.Cos(lat1Rad) * Math.Cos(lat2Rad) *
                Math.Sin(deltaLonRad / 2) * Math.Sin(deltaLonRad / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusKm * c;
    }
}