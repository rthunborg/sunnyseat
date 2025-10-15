using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SunnySeat.Core.Constants;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Utils;

namespace SunnySeat.Core.Services
{
    /// <summary>
    /// High-performance solar position calculation service implementing NREL Solar Position Algorithm (SPA)
    /// Optimized for Gothenburg coordinates with sub-millisecond calculation performance
    /// </summary>
    public class SolarCalculationService : ISolarCalculationService
    {
        private readonly ILogger<SolarCalculationService> _logger;
        private readonly IVenueService? _venueService;
        private readonly IPatioRepository? _patioRepository;

        // Gothenburg-specific optimizations (pre-calculated values)
        private static readonly double GothenburgLatRad = GothenburgCoordinates.Latitude * SolarConstants.DegreesToRadians;
        private static readonly double GothenburgSinLat = Math.Sin(GothenburgLatRad);
        private static readonly double GothenburgCosLat = Math.Cos(GothenburgLatRad);

        public SolarCalculationService(
            ILogger<SolarCalculationService> logger,
            IVenueService? venueService = null,
            IPatioRepository? patioRepository = null)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _venueService = venueService;
            _patioRepository = patioRepository;
        }

        /// <inheritdoc />
        public async Task<SolarPosition> CalculateSolarPositionAsync(DateTime utcTimestamp, 
            double latitude = GothenburgCoordinates.Latitude, 
            double longitude = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            try
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Validate inputs
                ValidateCoordinates(latitude, longitude);
                ValidateTimestamp(utcTimestamp);

                // Start calculation with high precision
                var startTime = DateTime.UtcNow;

                // Calculate Julian Day and Julian Centuries
                double julianDay = SolarMath.CalculateJulianDay(utcTimestamp);
                double julianCenturies = SolarMath.CalculateJulianCenturies(julianDay);

                // Calculate solar longitude and anomaly
                double geometricMeanLongitude = SolarMath.CalculateGeometricalMeanLongitudeSun(julianCenturies);
                double meanAnomaly = SolarMath.CalculateGeometricalMeanAnomalySun(julianCenturies);
                double eccentricity = SolarMath.CalculateEccentricityEarthOrbit(julianCenturies);

                // Calculate equation of center and true longitude
                double equationOfCenter = SolarMath.CalculateSunEquationOfCenter(meanAnomaly, julianCenturies);
                double trueLongitude = SolarMath.CalculateSunTrueLongitude(geometricMeanLongitude, equationOfCenter);
                double apparentLongitude = SolarMath.CalculateSunApparentLongitude(trueLongitude, julianCenturies);

                // Calculate obliquity of ecliptic
                double meanObliquity = SolarMath.CalculateMeanObliquityOfEcliptic(julianCenturies);
                double correctedObliquity = SolarMath.CalculateCorrectedObliquity(meanObliquity, julianCenturies);

                // Calculate solar declination
                double declination = SolarMath.CalculateSolarDeclination(apparentLongitude, correctedObliquity);

                // Calculate equation of time
                double equationOfTime = SolarMath.CalculateEquationOfTime(julianCenturies, correctedObliquity, 
                    geometricMeanLongitude, eccentricity, meanAnomaly);

                // Calculate hour angle
                double hourAngle = SolarMath.CalculateHourAngle(longitude, utcTimestamp, equationOfTime);

                // Calculate solar elevation and azimuth
                double elevation = SolarMath.CalculateSolarElevation(latitude, declination, hourAngle);
                double azimuth = SolarMath.CalculateSolarAzimuth(latitude, declination, hourAngle, elevation);

                // Apply atmospheric refraction correction
                double correctedElevation = SolarMath.ApplyAtmosphericRefraction(elevation);

                // Calculate Earth-Sun distance
                double trueAnomaly = SolarMath.NormalizeDegrees(meanAnomaly + equationOfCenter);
                double earthDistance = SolarMath.CalculateEarthSunDistance(trueAnomaly, eccentricity);

                // Convert timestamp to local time
                DateTime localTime = TimezoneUtils.ConvertUtcToStockholm(utcTimestamp);

                // Create result object
                var result = new SolarPosition
                {
                    Azimuth = azimuth,
                    Elevation = correctedElevation,
                    Declination = declination,
                    HourAngle = hourAngle,
                    EarthDistance = earthDistance,
                    Timestamp = utcTimestamp,
                    LocalTime = localTime,
                    Latitude = latitude,
                    Longitude = longitude
                };

                // Log performance metrics
                var calculationTime = DateTime.UtcNow - startTime;
                if (calculationTime.TotalMilliseconds > SolarConstants.MaxCalculationTimeMs)
                {
                    _logger.LogWarning("Solar calculation took {Duration}ms, exceeding target of {Target}ms",
                        calculationTime.TotalMilliseconds, SolarConstants.MaxCalculationTimeMs);
                }

                _logger.LogDebug("Solar position calculated: Azimuth={Azimuth:F3}°, Elevation={Elevation:F3}°, " +
                               "Declination={Declination:F3}°, Duration={Duration}ms",
                    result.Azimuth, result.Elevation, result.Declination, calculationTime.TotalMilliseconds);

                return await Task.FromResult(result);
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Failed to calculate solar position for coordinates ({Latitude}, {Longitude}) at {Timestamp}",
                    latitude, longitude, utcTimestamp);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<IEnumerable<SolarPosition>> CalculateSolarTimelineAsync(DateTime startUtc, 
            DateTime endUtc, TimeSpan interval,
            double latitude = GothenburgCoordinates.Latitude, 
            double longitude = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            ValidateTimelineInputs(startUtc, endUtc, interval);
            ValidateCoordinates(latitude, longitude);

            var positions = new List<SolarPosition>();
            var currentTime = startUtc;

            try
            {
                while (currentTime <= endUtc)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var position = await CalculateSolarPositionAsync(currentTime, latitude, longitude, cancellationToken);
                    positions.Add(position);

                    currentTime = currentTime.Add(interval);
                }

                _logger.LogInformation("Calculated solar timeline: {Count} positions from {Start} to {End} with {Interval} interval",
                    positions.Count, startUtc, endUtc, interval);

                return positions;
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Failed to calculate solar timeline from {Start} to {End}",
                    startUtc, endUtc);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<SolarPosition> GetCurrentSolarPositionAsync(
            double latitude = GothenburgCoordinates.Latitude,
            double longitude = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            var currentUtc = DateTime.UtcNow;
            return await CalculateSolarPositionAsync(currentUtc, latitude, longitude, cancellationToken);
        }

        /// <inheritdoc />
        public async Task<SunTimes> GetSunTimesAsync(DateOnly date,
            double latitude = GothenburgCoordinates.Latitude,
            double longitude = GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default)
        {
            try
            {
                ValidateCoordinates(latitude, longitude);
                cancellationToken.ThrowIfCancellationRequested();

                var dateStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                
                // Calculate approximate sunrise and sunset times using iterative method
                var (sunriseUtc, sunsetUtc, solarNoonUtc, maxElevation) = await CalculateSunTimesIterative(
                    dateStart, latitude, longitude, cancellationToken);

                // Convert to local times
                var sunriseLocal = TimezoneUtils.ConvertUtcToStockholm(sunriseUtc);
                var sunsetLocal = TimezoneUtils.ConvertUtcToStockholm(sunsetUtc);

                return new SunTimes
                {
                    SunriseUtc = sunriseUtc,
                    SunsetUtc = sunsetUtc,
                    SunriseLocal = sunriseLocal,
                    SunsetLocal = sunsetLocal,
                    SolarNoon = solarNoonUtc,
                    MaxElevation = maxElevation,
                    Date = date,
                    Latitude = latitude,
                    Longitude = longitude
                };
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Failed to calculate sun times for {Date} at coordinates ({Latitude}, {Longitude})",
                    date, latitude, longitude);
                throw;
            }
        }

        /// <inheritdoc />
        public bool IsSunVisible(SolarPosition position)
        {
            if (position == null)
                throw new ArgumentNullException(nameof(position));

            return position.Elevation > 0;
        }

        /// <inheritdoc />
        public async Task<SolarPosition> CalculateForVenueAsync(int venueId, DateTime timestamp,
            CancellationToken cancellationToken = default)
        {
            if (_venueService == null)
                throw new InvalidOperationException("Venue service not available for venue-based calculations");

            try
            {
                var venue = await _venueService.GetVenueByIdAsync(venueId, cancellationToken);
                if (venue?.Location == null)
                    throw new ArgumentException($"Venue {venueId} has no location data", nameof(venueId));

                return await CalculateSolarPositionAsync(timestamp, venue.Location.Y, venue.Location.X, cancellationToken);
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Failed to calculate solar position for venue {VenueId} at {Timestamp}",
                    venueId, timestamp);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<SolarPosition> CalculateForPatioAsync(int patioId, DateTime timestamp,
            CancellationToken cancellationToken = default)
        {
            if (_patioRepository == null)
                throw new InvalidOperationException("Patio repository not available for patio-based calculations");

            try
            {
                var patio = await _patioRepository.GetByIdAsync(patioId, cancellationToken);
                if (patio?.Geometry == null)
                    throw new ArgumentException($"Patio {patioId} has no geometry data", nameof(patioId));

                var centroid = patio.Geometry.Centroid;
                return await CalculateSolarPositionAsync(timestamp, centroid.Y, centroid.X, cancellationToken);
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Failed to calculate solar position for patio {PatioId} at {Timestamp}",
                    patioId, timestamp);
                throw;
            }
        }

        #region Private Helper Methods

        /// <summary>
        /// Calculate sun times using iterative method for high accuracy
        /// </summary>
        private async Task<(DateTime Sunrise, DateTime Sunset, DateTime SolarNoon, double MaxElevation)> 
            CalculateSunTimesIterative(DateTime date, double latitude, double longitude, CancellationToken cancellationToken)
        {
            // Start with rough estimates
            var noon = date.AddHours(12 - longitude / 15.0); // Rough solar noon estimate
            
            // Find solar noon (maximum elevation)
            var solarNoon = await FindSolarNoon(date, latitude, longitude, cancellationToken);
            var noonPosition = await CalculateSolarPositionAsync(solarNoon, latitude, longitude, cancellationToken);
            
            // Find sunrise (iterative method to find when elevation = -0.833°, accounting for refraction and solar disk)
            var sunrise = await FindSunEvent(date, latitude, longitude, -0.833, true, cancellationToken);
            
            // Find sunset
            var sunset = await FindSunEvent(date, latitude, longitude, -0.833, false, cancellationToken);

            return (sunrise, sunset, solarNoon, noonPosition.Elevation);
        }

        /// <summary>
        /// Find solar noon (time of maximum elevation) using iterative search
        /// </summary>
        private async Task<DateTime> FindSolarNoon(DateTime date, double latitude, double longitude, CancellationToken cancellationToken)
        {
            var startTime = date.AddHours(10); // Start search at 10 AM UTC
            var endTime = date.AddHours(16);   // End search at 4 PM UTC
            var tolerance = TimeSpan.FromSeconds(1);

            while (endTime - startTime > tolerance)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var midTime = startTime.AddTicks((endTime - startTime).Ticks / 2);
                
                var pos1 = await CalculateSolarPositionAsync(midTime.AddMinutes(-5), latitude, longitude, cancellationToken);
                var pos2 = await CalculateSolarPositionAsync(midTime.AddMinutes(5), latitude, longitude, cancellationToken);

                if (pos1.Elevation > pos2.Elevation)
                {
                    // Maximum is before midTime
                    endTime = midTime;
                }
                else
                {
                    // Maximum is after midTime
                    startTime = midTime;
                }
            }

            return startTime.AddTicks((endTime - startTime).Ticks / 2);
        }

        /// <summary>
        /// Find sunrise or sunset using iterative method
        /// </summary>
        private async Task<DateTime> FindSunEvent(DateTime date, double latitude, double longitude, 
            double targetElevation, bool isSunrise, CancellationToken cancellationToken)
        {
            DateTime startTime, endTime;
            
            if (isSunrise)
            {
                startTime = date.AddHours(2);  // 2 AM UTC
                endTime = date.AddHours(10);   // 10 AM UTC
            }
            else
            {
                startTime = date.AddHours(16); // 4 PM UTC
                endTime = date.AddHours(22);   // 10 PM UTC
            }

            var tolerance = TimeSpan.FromSeconds(10); // 10-second accuracy

            while (endTime - startTime > tolerance)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var midTime = startTime.AddTicks((endTime - startTime).Ticks / 2);
                var position = await CalculateSolarPositionAsync(midTime, latitude, longitude, cancellationToken);

                if ((isSunrise && position.Elevation < targetElevation) || 
                    (!isSunrise && position.Elevation > targetElevation))
                {
                    startTime = midTime;
                }
                else
                {
                    endTime = midTime;
                }
            }

            return startTime.AddTicks((endTime - startTime).Ticks / 2);
        }

        /// <summary>
        /// Validate coordinate inputs
        /// </summary>
        private static void ValidateCoordinates(double latitude, double longitude)
        {
            if (latitude < -90 || latitude > 90)
                throw new ArgumentOutOfRangeException(nameof(latitude), latitude, "Latitude must be between -90 and 90 degrees");

            if (longitude < -180 || longitude > 180)
                throw new ArgumentOutOfRangeException(nameof(longitude), longitude, "Longitude must be between -180 and 180 degrees");
        }

        /// <summary>
        /// Validate timestamp input
        /// </summary>
        private static void ValidateTimestamp(DateTime timestamp)
        {
            if (timestamp.Kind != DateTimeKind.Utc)
                throw new ArgumentException("Timestamp must be in UTC", nameof(timestamp));

            // Reasonable bounds for solar calculations (algorithms valid from year 1000 to 3000)
            if (timestamp.Year < 1000 || timestamp.Year > 3000)
                throw new ArgumentOutOfRangeException(nameof(timestamp), timestamp, "Timestamp year must be between 1000 and 3000");
        }

        /// <summary>
        /// Validate timeline calculation inputs
        /// </summary>
        private static void ValidateTimelineInputs(DateTime startUtc, DateTime endUtc, TimeSpan interval)
        {
            ValidateTimestamp(startUtc);
            ValidateTimestamp(endUtc);

            if (endUtc <= startUtc)
                throw new ArgumentException("End time must be after start time");

            if (interval <= TimeSpan.Zero)
                throw new ArgumentOutOfRangeException(nameof(interval), interval, "Interval must be positive");

            if (interval > TimeSpan.FromDays(1))
                throw new ArgumentOutOfRangeException(nameof(interval), interval, "Interval cannot exceed 1 day");

            var totalDuration = endUtc - startUtc;
            var estimatedPoints = (int)(totalDuration.Ticks / interval.Ticks);
            
            if (estimatedPoints > 10000)
                throw new ArgumentException($"Timeline would generate {estimatedPoints} points, maximum is 10000. Increase interval or reduce time range.");
        }

        #endregion
    }
}